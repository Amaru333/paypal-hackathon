import { randomUUID, randomBytes } from 'node:crypto';
import { database } from '@/server/db/client';
import { familyTransaction } from '@/server/db/transactions';
import type { Identity } from '@/server/auth/session';
import { digestToken } from '@/server/auth/password';
import { HttpError } from '@/server/http/errors';
import { paypal } from '@/server/integrations/paypal';

export async function connectPayPal(identity: Identity, origin: string) {
  const state = randomBytes(24).toString('hex');
  const setup = await paypal(
    '/v3/vault/setup-tokens',
    {
      payment_source: {
        paypal: {
          description: 'Pocket sandbox: parent-controlled demo purchases',
          usage_type: 'MERCHANT',
          usage_pattern: 'IMMEDIATE',
          customer_type: 'CONSUMER',
          permit_multiple_payment_tokens: false,
          experience_context: {
            brand_name: 'Pocket Sandbox',
            shipping_preference: 'NO_SHIPPING',
            return_url: `${origin}/api/payments/paypal/return?state=${state}`,
            cancel_url: `${origin}/parent/family?payment=cancelled`,
          },
        },
      },
    },
    randomUUID(),
  );
  const url = setup.links?.find((link: { rel: string }) => link.rel === 'approve')?.href;
  if (
    !url ||
    new URL(url).protocol !== 'https:' ||
    !['www.sandbox.paypal.com', 'sandbox.paypal.com'].includes(new URL(url).hostname)
  )
    throw new HttpError('PayPal did not return a sandbox approval link.', 502);
  await familyTransaction(identity.parentId, async (tx) => {
    if (
      await tx.purchase.count({
        where: { child: { parentId: identity.parentId }, status: 'processing' },
      })
    )
      throw new HttpError('Reconcile pending payments before reconnecting PayPal.');
    const data = {
      setupId: setup.id as string,
      stateHash: digestToken(state),
      requestId: randomUUID(),
      createdAt: new Date(),
    };
    await tx.payPalSetup.upsert({
      where: { parentId: identity.parentId },
      create: { parentId: identity.parentId, ...data },
      update: data,
    });
  });
  return { url: url as string };
}
export async function completePayPal(identity: Identity, state: string) {
  const setup = await database().payPalSetup.findUnique({ where: { parentId: identity.parentId } });
  if (
    !setup ||
    setup.stateHash !== digestToken(state) ||
    Date.now() - setup.createdAt.getTime() > 3600000
  )
    throw new HttpError('Consent session expired. Connect PayPal again.');
  const consent = await paypal(`/v3/vault/setup-tokens/${setup.setupId}`);
  if (consent.status !== 'APPROVED') throw new HttpError('PayPal consent is not approved yet.');
  const saved = await paypal(
    '/v3/vault/payment-tokens',
    { payment_source: { token: { id: setup.setupId, type: 'SETUP_TOKEN' } } },
    setup.requestId,
  );
  if (!saved.id) throw new HttpError('PayPal did not return a payment token.', 502);
  await familyTransaction(identity.parentId, async (tx) => {
    const current = await tx.payPalSetup.findUnique({ where: { parentId: identity.parentId } });
    if (current?.requestId !== setup.requestId)
      throw new HttpError('This connection has been replaced.');
    if (
      await tx.purchase.count({
        where: { child: { parentId: identity.parentId }, status: 'processing' },
      })
    )
      throw new HttpError('Reconcile pending payments before reconnecting.');
    await tx.payPalConnection.upsert({
      where: { parentId: identity.parentId },
      create: { parentId: identity.parentId, token: saved.id },
      update: { token: saved.id },
    });
    await tx.payPalSetup.delete({ where: { parentId: identity.parentId } });
  });
}

// The purchase reservation and lease are committed before any external side effect.
// Stable PayPal request IDs protect retries after a timeout or process restart.
export async function settlePurchase(purchaseId: string, leaseToken: string) {
  const db = database();
  const purchase = await db.purchase.findUniqueOrThrow({
    where: { id: purchaseId },
    include: { child: { include: { parent: { include: { connection: true } }, budget: true } } },
  });
  if (purchase.leaseToken !== leaseToken || purchase.status !== 'processing') return;
  try {
    const connection = purchase.child.parent.connection;
    if (!connection) throw new Error('Connect PayPal to reconcile this payment.');
    if (!purchase.orderId && purchase.child.budget?.frozen)
      throw new Error('Spending is paused. No new charge was sent.');
    if (
      !purchase.orderId &&
      Date.now() - (purchase.attemptedAt || purchase.createdAt).getTime() > 5 * 3600000
    )
      throw new Error('Payment needs manual reconciliation. No new charge was sent.');
    let order = purchase.orderId
      ? await paypal(`/v2/checkout/orders/${purchase.orderId}`)
      : await paypal(
          '/v2/checkout/orders',
          {
            intent: 'CAPTURE',
            purchase_units: [
              {
                custom_id: purchase.id,
                description: `Pocket sandbox: ${purchase.name}`,
                amount: { currency_code: 'USD', value: (purchase.cents / 100).toFixed(2) },
              },
            ],
            payment_source: {
              paypal: {
                vault_id: connection.token,
                stored_credential: { payment_initiator: 'MERCHANT', usage: 'SUBSEQUENT' },
              },
            },
          },
          purchase.id,
        );
    const orderId = order.id as string;
    const saved = await db.purchase.updateMany({
      where: { id: purchaseId, leaseToken },
      data: { orderId },
    });
    if (!saved.count) return;
    const budget = await db.budget.findUniqueOrThrow({ where: { childId: purchase.childId } });
    if (order.status === 'APPROVED' && !budget.frozen)
      order = await paypal(`/v2/checkout/orders/${orderId}/capture`, {}, `cap-${purchase.id}`);
    const verified = await paypal(`/v2/checkout/orders/${orderId}`);
    const capture = verified.purchase_units
      ?.flatMap(
        (unit: {
          payments?: {
            captures?: {
              id: string;
              status: string;
              amount: { value: string; currency_code: string };
            }[];
          };
        }) => unit.payments?.captures ?? [],
      )
      .find(
        (capture: { status: string; amount: { value: string; currency_code: string } }) =>
          capture.status === 'COMPLETED' &&
          capture.amount.currency_code === 'USD' &&
          Math.round(Number(capture.amount.value) * 100) === purchase.cents,
      );
    if (verified.status !== 'COMPLETED' || !capture)
      throw new Error(
        `PayPal payment is ${verified.status}. Your budget stays reserved until it is reconciled.`,
      );
    await db.purchase.updateMany({
      where: { id: purchaseId, leaseToken },
      data: {
        status: 'paid',
        captureId: capture.id,
        reason: 'Sandbox payment completed.',
        error: null,
        leaseToken: null,
        leaseUntil: null,
      },
    });
  } catch (error) {
    await db.purchase.updateMany({
      where: { id: purchaseId, leaseToken },
      data: {
        error: error instanceof Error ? error.message : 'Payment needs reconciliation.',
        leaseToken: null,
        leaseUntil: null,
      },
    });
  }
}
