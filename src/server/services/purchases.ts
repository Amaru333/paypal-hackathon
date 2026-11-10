import { randomUUID } from 'node:crypto';
import { evaluate, products } from '@/domain/wallet';
import { database } from '@/server/db/client';
import { familyTransaction, type Transaction } from '@/server/db/transactions';
import { toPolicy, toPurchase } from '@/server/db/mappers';
import type { Purchase } from '@/generated/prisma/client';
import type { Identity } from '@/server/auth/session';
import { HttpError } from '@/server/http/errors';
import { classify } from '@/server/integrations/openai';
import { ownedChild } from './children';
import { currentBudget } from './budgets';
import { settlePurchase } from './payments';
import { receiptFor } from '@/server/catalog';

async function reserve(tx: Transaction, identity: Identity, purchase: Purchase) {
  const child = await ownedChild(identity, purchase.childId, tx);
  if (purchase.status === 'processing') {
    if (purchase.leaseUntil && purchase.leaseUntil > new Date()) return purchase;
  } else {
    const budget = await currentBudget(tx, child.budget);
    const history = (await tx.purchase.findMany({ where: { childId: child.id } })).map(toPurchase);
    const decision = evaluate(
      toPolicy(budget),
      history,
      budget.periodStart.toISOString(),
      purchase.cents,
      toPurchase(purchase).category,
      purchase.parentApproved,
    );
    if (decision.status !== 'ready')
      return tx.purchase.update({ where: { id: purchase.id }, data: decision });
    const connection = await tx.payPalConnection.findUnique({
      where: { parentId: identity.parentId },
    });
    if (!connection)
      return tx.purchase.update({
        where: { id: purchase.id },
        data: {
          status: 'ready',
          reason: 'Ready when your parent connects PayPal sandbox.',
          allocations: decision.allocations,
          warning: decision.warning,
        },
      });
    purchase = await tx.purchase.update({
      where: { id: purchase.id },
      data: {
        status: 'processing',
        period: budget.periodStart,
        attemptedAt: new Date(),
        reason: 'Sandbox payment is being processed.',
        allocations: decision.allocations,
        warning: decision.warning,
      },
    });
  }
  return tx.purchase.update({
    where: { id: purchase.id },
    data: { leaseToken: randomUUID(), leaseUntil: new Date(Date.now() + 120000) },
  });
}
async function finish(purchase: Purchase, shouldSettle: boolean) {
  if (shouldSettle && purchase.status === 'processing' && purchase.leaseToken)
    await settlePurchase(purchase.id, purchase.leaseToken);
  return {
    purchase: toPurchase(
      await database().purchase.findUniqueOrThrow({ where: { id: purchase.id } }),
    ),
  };
}
export async function createPurchase(
  identity: Identity,
  input: { childId?: string; key: string; productId: string; prepare?: boolean },
) {
  const child = await ownedChild(identity, input.childId);
  const previous = await database().purchase.findUnique({
    where: { childId_key: { childId: child.id, key: input.key } },
  });
  if (previous) return { purchase: toPurchase(previous) };
  const product = products.find((p) => p.id === input.productId);
  if (!product) throw new HttpError('Unknown product.');
  const receipt = receiptFor(product);
  const classification = await classify(product, receipt);
  const result = await familyTransaction(identity.parentId, async (tx) => {
    const duplicate = await tx.purchase.findUnique({
      where: { childId_key: { childId: child.id, key: input.key } },
    });
    if (duplicate) return { purchase: duplicate, settle: false };
    const budget = await currentBudget(tx, (await ownedChild(identity, child.id, tx)).budget);
    const history = (await tx.purchase.findMany({ where: { childId: child.id } })).map(toPurchase);
    let decision = evaluate(
      toPolicy(budget),
      history,
      budget.periodStart.toISOString(),
      product.cents,
      classification.category,
    );
    if (decision.status === 'ready' && classification.needsReview)
      decision = {
        status: 'approval',
        reason: 'Receipt classification needs parent review. No payment has been sent.',
      };
    let purchase = await tx.purchase.create({
      data: {
        childId: child.id,
        key: input.key,
        productId: product.id,
        name: product.name,
        cents: product.cents,
        category: classification.category,
        explanation: classification.explanation,
        source: classification.source,
        receipt,
        classification: {
          confidence: classification.confidence,
          needsReview: classification.needsReview,
          items: classification.items,
        },
        period: budget.periodStart,
        ...decision,
      },
    });
    // A checkout plan is not a reservation. Payment rechecks under the family lock.
    if (purchase.status === 'ready' && !input.prepare)
      purchase = await reserve(tx, identity, purchase);
    return { purchase, settle: true };
  });
  return finish(result.purchase, result.settle);
}
export async function purchaseAction(
  identity: Identity,
  id: string,
  action: 'approve' | 'decline' | 'retry',
) {
  const result = await familyTransaction(identity.parentId, async (tx) => {
    let purchase = await tx.purchase.findFirst({
      where: { id, child: { parentId: identity.parentId } },
    });
    if (!purchase) throw new HttpError('Purchase not found.', 404);
    await ownedChild(identity, purchase.childId, tx);
    if (action !== 'retry' || purchase.status === 'processing') {
      if (identity.role !== 'parent') throw new HttpError('Only a parent can do that.', 403);
    }
    if (action === 'decline') {
      if (!['approval', 'ready'].includes(purchase.status))
        throw new HttpError('This purchase can no longer be declined.');
      return {
        purchase: await tx.purchase.update({
          where: { id },
          data: { status: 'declined', reason: 'Your parent declined this request.' },
        }),
        settle: false,
      };
    }
    if (action === 'approve') {
      if (purchase.status !== 'approval')
        throw new HttpError('This purchase does not need approval.');
      purchase = await tx.purchase.update({ where: { id }, data: { parentApproved: true } });
    } else if (!['ready', 'processing'].includes(purchase.status))
      throw new HttpError('This purchase cannot be retried.');
    if (purchase.status === 'processing' && purchase.leaseUntil && purchase.leaseUntil > new Date())
      return { purchase, settle: false };
    return { purchase: await reserve(tx, identity, purchase), settle: true };
  });
  return finish(result.purchase, result.settle);
}
