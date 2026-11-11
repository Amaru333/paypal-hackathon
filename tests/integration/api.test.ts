import 'dotenv/config';
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { NextRequest } from 'next/server';

const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl || !new URL(testUrl).pathname.endsWith('_test'))
  throw new Error('TEST_DATABASE_URL must point to a dedicated database ending in _test.');
process.env.DATABASE_URL = testUrl;
process.env.OPENAI_API_KEY = '';
process.env.RESEND_API_KEY = '';
delete process.env.APP_URL;
const { database } = await import('../../src/server/db/client');
const db = database();
const origin = 'http://localhost:3001';
const suffix = randomUUID().slice(0, 8);
const email = `test-${suffix}@example.test`;
const otherEmail = `other-${suffix}@example.test`;
const password = 'integration-only-password';
const routeFiles: Record<string, string> = {
  signup: 'auth/signup',
  login: 'auth/login',
  logout: 'auth/logout',
  dashboard: 'dashboard',
  add: 'children',
  inspect: 'invitations/inspect',
  accept: 'invitations/accept',
  invite: 'children/[childId]/invitation',
  budget: 'children/[childId]/budget',
  vault: 'children/[childId]/vault',
  freeze: 'children/[childId]/freeze',
  birthDate: 'children/[childId]/birth-date',
  privacy: 'children/[childId]/privacy',
  connect: 'payments/paypal/connect',
  purchase: 'purchases',
  action: 'purchases/[purchaseId]/actions',
};
async function call(
  action: string,
  input?: unknown,
  cookie?: string,
  expected = 200,
  params: Record<string, string> = {},
  method = input === undefined ? 'GET' : 'POST',
  requestOrigin = origin,
) {
  const [name, query = ''] = action.split('?');
  const routeModule = await import(`../../src/app/api/${routeFiles[name]}/route.ts`);
  const req = new NextRequest(`${origin}/api/${routeFiles[name]}${query ? '?' + query : ''}`, {
    method,
    headers: {
      host: 'localhost:3001',
      origin: requestOrigin,
      'content-type': 'application/json',
      ...(cookie ? { cookie } : {}),
    },
    ...(input === undefined ? {} : { body: JSON.stringify(input) }),
  });
  const response: Response = await routeModule[method](req, { params: Promise.resolve(params) });
  const data = await response.json();
  assert.equal(response.status, expected, `${name}: ${data.error || 'unexpected status'}`);
  return { data, cookie: response.headers.get('set-cookie')?.split(';')[0] };
}
const tokenOf = (url: string) => new URLSearchParams(new URL(url).hash.slice(1)).get('invite')!;
before(() => {
  const migration = spawnSync(
    process.execPath,
    ['node_modules/prisma/build/index.js', 'migrate', 'deploy'],
    { env: process.env, windowsHide: true, encoding: 'utf8' },
  );
  assert.equal(migration.status, 0, migration.stderr);
});
after(async () => {
  const parents = await db.parent.findMany({ where: { email: { in: [email, otherEmail] } } });
  const ids = parents.map((parent) => parent.id);
  await db.purchase.deleteMany({ where: { child: { parentId: { in: ids } } } });
  await db.parent.deleteMany({ where: { id: { in: ids } } });
  await db.$disconnect();
});

test('PostgreSQL API: accounts, invitation lifecycle, authorization, and concurrent payments', async (t) => {
  const parent = (await call('signup', { name: 'Alex', email, password })).cookie!;
  const other = (await call('signup', { name: 'Other family', email: otherEmail, password }))
    .cookie!;
  let snapshot = (await call('dashboard', undefined, parent)).data;
  assert.equal(snapshot.children.length, 0);
  assert.equal(snapshot.childId, null);
  await call('login', { role: 'parent', email, password: 'wrong' }, undefined, 401);
  const invitation = (await call('add', { name: 'Maya', email: 'maya@example.invalid' }, parent))
    .data;
  const childId = invitation.childId;
  const token = tokenOf(invitation.url);
  assert.ok(invitation.expiresAt - Date.now() > 23 * 3600000);
  assert.notEqual((await db.invitation.findUniqueOrThrow({ where: { childId } })).tokenHash, token);
  await call('accept', { token, username: `maya_${suffix}`, password }, parent, 400);
  const child = (await call('accept', { token, username: `maya_${suffix}`, password })).cookie!;
  await call('accept', { token, username: `replay_${suffix}`, password }, undefined, 410);
  assert.ok((await call('login', { role: 'child', username: `maya_${suffix}`, password })).cookie);
  const second = (await call('add', { name: 'Leo', email: 'leo@example.invalid' }, parent)).data;
  const family = (await call('dashboard', undefined, parent)).data;
  assert.equal(family.childId, null);
  assert.equal(family.children.length, 2);
  assert.ok(
    family.children.every(
      (c: { remaining: number; allowance: number }) => c.remaining === c.allowance,
    ),
  );
  const individual = (await call(`dashboard?childId=${childId}`, undefined, parent)).data;
  assert.equal(individual.childId, childId);
  const sibling = (
    await call('accept', { token: tokenOf(second.url), username: `leo_${suffix}`, password })
  ).cookie!;

  await t.test(
    'vault renewals, privacy, partial releases, and concurrent withdrawals',
    async () => {
      await call('vault', { enabled: true }, child, 403, { childId });
      await call('vault', { enabled: true }, other, 404, { childId });
      await call('vault', { enabled: true }, parent, 200, { childId });
      const previous = new Date(Date.now() - 8 * 86400000);
      await db.budget.update({ where: { childId }, data: { periodStart: previous } });
      const renewed = (await call(`dashboard?childId=${childId}`, undefined, parent)).data;
      assert.equal(renewed.vault.balance, renewed.policy.allowance);
      const again = (await call(`dashboard?childId=${childId}`, undefined, parent)).data;
      assert.equal(again.vault.balance, renewed.vault.balance);
      const privateView = (await call('dashboard', undefined, child)).data;
      assert.equal('vault' in privateView, false);
      assert.equal('vault' in privateView.children[0], false);
      await call('vault', { cents: 1000 }, parent, 200, { childId });
      const released = (await call(`dashboard?childId=${childId}`, undefined, parent)).data;
      assert.equal(released.policy.walletBonus, 1000);
      assert.equal(released.vault.balance, renewed.vault.balance - 1000);
      await call('vault', { cents: -1 }, parent, 400, { childId });
      const attempts = await Promise.allSettled([
        call('vault', { cents: renewed.vault.balance - 1000 }, parent, 200, { childId }),
        call('vault', { cents: renewed.vault.balance - 1000 }, parent, 200, { childId }),
      ]);
      assert.equal(attempts.filter((a) => a.status === 'fulfilled').length, 1);
      assert.equal((await db.budget.findUniqueOrThrow({ where: { childId } })).vaultBalance, 0);
      await db.budget.update({ where: { childId }, data: { vaultEnabled: false, walletBonus: 0 } });
    },
  );
  await t.test('child and cross-family boundaries are enforced by the API', async () => {
    await call(`dashboard?childId=${childId}`, undefined, sibling, 403);
    await call(`dashboard?childId=${childId}`, undefined, other, 404);
    await call('add', { name: 'Nope' }, child, 403);
    await call('connect', {}, child, 403);
    await call('invite', {}, other, 404, { childId });
    await call('purchase', { childId, key: randomUUID(), productId: 'test' }, sibling, 403);
    await call('freeze', { frozen: true }, child, 403, { childId }, 'PATCH');
    await call('freeze', { frozen: true }, other, 404, { childId }, 'PATCH');
  });
  await t.test('approval ownership and duplicate request keys', async () => {
    const game = (await call('purchase', { key: randomUUID(), productId: 'game' }, child)).data
      .purchase;
    assert.equal(game.status, 'approval');
    await call('action', { action: 'approve' }, child, 403, { purchaseId: game.id });
    await call('action', { action: 'approve' }, other, 404, { purchaseId: game.id });
    await call('action', { action: 'retry' }, sibling, 403, { purchaseId: game.id });
    await call('action', { action: 'decline' }, parent, 200, { purchaseId: game.id });
    const key = randomUUID();
    const results = await Promise.all([
      call('purchase', { key, productId: 'lunch', cents: 1 }, child),
      call('purchase', { key, productId: 'lunch' }, child),
    ]);
    assert.equal(results[0].data.purchase.id, results[1].data.purchase.id);
    assert.equal(results[0].data.purchase.cents, 1200);
    assert.equal(await db.purchase.count({ where: { childId, key } }), 1);
  });
  await t.test('expired, revoked, replaced, and raced invitations', async () => {
    const pending = (
      await call('add', { name: 'Pending', email: 'pending@example.invalid' }, parent)
    ).data;
    await db.invitation.update({
      where: { childId: pending.childId },
      data: { expiresAt: new Date(0) },
    });
    await call(
      'accept',
      { token: tokenOf(pending.url), username: `expired_${suffix}`, password },
      undefined,
      410,
    );
    const renewed = (await call('invite', {}, parent, 200, { childId: pending.childId })).data;
    await call('inspect', { token: tokenOf(pending.url) }, undefined, 410);
    await call('invite', {}, parent, 200, { childId: pending.childId }, 'DELETE');
    await call('inspect', { token: tokenOf(renewed.url) }, undefined, 410);
    const race = (await call('invite', {}, parent, 200, { childId: pending.childId })).data;
    // One request may win; the other must get a consumed invitation error.
    const attempt = async (name: string) => {
      const { POST } = await import('../../src/app/api/invitations/accept/route');
      return POST(
        new NextRequest(`${origin}/api/invitations/accept`, {
          method: 'POST',
          headers: { host: 'localhost:3001', origin, 'content-type': 'application/json' },
          body: JSON.stringify({ token: tokenOf(race.url), username: name, password }),
        }),
        { params: Promise.resolve({}) },
      );
    };
    const results = await Promise.all([attempt(`race1_${suffix}`), attempt(`race2_${suffix}`)]);
    assert.deepEqual(results.map((r) => r.status).sort(), [200, 410]);
  });
  await t.test('freeze, validation, CSRF, and sibling budgets', async () => {
    await call('freeze', { frozen: true }, parent, 200, { childId }, 'PATCH');
    assert.equal(
      (await call('purchase', { key: randomUUID(), productId: 'test' }, child)).data.purchase
        .status,
      'blocked',
    );
    assert.equal((await call('dashboard', undefined, sibling)).data.policy.frozen, false);
    await call('budget', { policy: { allowance: 1.5 } }, parent, 400, { childId }, 'PUT');
    await call('add', { name: 'Nope' }, parent, 403, {}, 'POST', 'https://outside.example');
    await call('freeze', { frozen: false }, parent, 200, { childId }, 'PATCH');
  });
  await t.test(
    'database reservations prevent concurrent overspending; retries keep one payment',
    async () => {
      const parentRow = await db.parent.findUniqueOrThrow({ where: { email } });
      await db.payPalConnection.create({
        data: { parentId: parentRow.id, token: 'fake-test-token' },
      });
      await call(
        'budget',
        {
          policy: {
            allowance: 100,
            threshold: 100,
            frozen: false,
            periodDays: 7,
            limits: { Food: 0, Groceries: 0, Transport: 0, 'Everything else': 100 },
          },
        },
        parent,
        200,
        { childId },
        'PUT',
      );
      const originalFetch = globalThis.fetch;
      const orderIds = new Set<string>();
      globalThis.fetch = async (url, options) => {
        const endpoint = String(url);
        assert.ok(
          endpoint.startsWith('https://api-m.sandbox.paypal.com/'),
          'Tests cannot call external services',
        );
        if (endpoint.endsWith('/token')) return Response.json({ access_token: 'fake-access' });
        if (endpoint.endsWith('/v2/checkout/orders') && options?.method === 'POST')
          orderIds.add(new Headers(options.headers).get('PayPal-Request-Id')!);
        return Response.json({
          id: `ORDER-${suffix}`,
          status: 'COMPLETED',
          purchase_units: [
            {
              payments: {
                captures: [
                  {
                    id: `CAPTURE-${suffix}`,
                    status: 'COMPLETED',
                    amount: { currency_code: 'USD', value: '1.00' },
                  },
                ],
              },
            },
          ],
        });
      };
      try {
        const results = await Promise.all([
          call('purchase', { key: randomUUID(), productId: 'test' }, child),
          call('purchase', { key: randomUUID(), productId: 'test' }, child),
        ]);
        assert.deepEqual(results.map((r) => r.data.purchase.status).sort(), ['blocked', 'paid']);
        assert.equal(orderIds.size, 1);
        snapshot = (await call('dashboard', undefined, child)).data;
        assert.equal(snapshot.spent, 100);
        assert.equal(snapshot.reserved, 0);
      } finally {
        globalThis.fetch = originalFetch;
      }
    },
  );
  await t.test(
    'unknown payment outcomes reserve funds and retry with the same PayPal key',
    async () => {
      const originalFetch = globalThis.fetch;
      const keys: string[] = [];
      globalThis.fetch = async (url, options) => {
        const endpoint = String(url);
        assert.ok(endpoint.startsWith('https://api-m.sandbox.paypal.com/'));
        if (endpoint.endsWith('/token')) return Response.json({ access_token: 'fake-access' });
        if (endpoint.endsWith('/v2/checkout/orders') && options?.method === 'POST') {
          keys.push(new Headers(options.headers).get('PayPal-Request-Id')!);
          if (keys.length === 1) throw new TypeError('Simulated lost response');
        }
        return Response.json({
          id: `RETRY-ORDER-${suffix}`,
          status: 'COMPLETED',
          purchase_units: [
            {
              payments: {
                captures: [
                  {
                    id: `RETRY-CAPTURE-${suffix}`,
                    status: 'COMPLETED',
                    amount: { currency_code: 'USD', value: '1.00' },
                  },
                ],
              },
            },
          ],
        });
      };
      try {
        const result = await call('purchase', { key: randomUUID(), productId: 'test' }, sibling);
        assert.equal(result.data.purchase.status, 'processing');
        assert.equal((await call('dashboard', undefined, sibling)).data.reserved, 100);
        await call('action', { action: 'retry' }, sibling, 403, {
          purchaseId: result.data.purchase.id,
        });
        const reconciled = await call('action', { action: 'retry' }, parent, 200, {
          purchaseId: result.data.purchase.id,
        });
        assert.equal(reconciled.data.purchase.status, 'paid');
        assert.equal(keys.length, 2);
        assert.equal(keys[0], keys[1]);
        const after = (await call('dashboard', undefined, sibling)).data;
        assert.equal(after.reserved, 0);
        assert.equal(after.spent, 100);
      } finally {
        globalThis.fetch = originalFetch;
      }
    },
  );
  await t.test(
    'Soft Decline reserves donor budgets, survives uncertain payments, and does not double borrow on retry',
    async () => {
      // A separate period isolates this scenario from earlier paid demo purchases.
      await db.budget.update({
        where: { childId: second.childId },
        data: { periodStart: new Date(Date.now() + 1000) },
      });
      await call(
        'budget',
        {
          policy: {
            allowance: 200,
            threshold: 100,
            softLimit: 100,
            frozen: false,
            periodDays: 7,
            limits: { Food: 150, Groceries: 0, Transport: 0, 'Everything else': 50 },
          },
        },
        parent,
        200,
        { childId: second.childId },
        'PUT',
      );
      const originalFetch = globalThis.fetch;
      const orderKeys: string[] = [];
      const captures = new Map<string, string>();
      let loseResponse = true;
      globalThis.fetch = async (url, options) => {
        const endpoint = String(url);
        assert.ok(endpoint.startsWith('https://api-m.sandbox.paypal.com/'));
        if (endpoint.endsWith('/token')) return Response.json({ access_token: 'fake-access' });
        let id = endpoint.split('/').at(-1)!;
        if (endpoint.endsWith('/v2/checkout/orders') && options?.method === 'POST') {
          const key = new Headers(options.headers).get('PayPal-Request-Id')!;
          orderKeys.push(key);
          id = `SOFT-${key}`;
          captures.set(id, `CAP-${key}`);
          if (loseResponse) {
            loseResponse = false;
            throw new TypeError('Simulated lost response');
          }
        }
        return Response.json({
          id,
          status: 'COMPLETED',
          purchase_units: [
            {
              payments: {
                captures: [
                  {
                    id: captures.get(id),
                    status: 'COMPLETED',
                    amount: { currency_code: 'USD', value: '1.00' },
                  },
                ],
              },
            },
          ],
        });
      };
      try {
        const key = randomUUID();
        const first = (await call('purchase', { key, productId: 'test' }, sibling)).data.purchase;
        assert.equal(first.status, 'processing');
        assert.deepEqual(first.allocations, { 'Everything else': 50, Food: 50 });
        assert.match(first.warning, /Soft Decline/);
        const duplicate = (await call('purchase', { key, productId: 'test' }, sibling)).data
          .purchase;
        assert.equal(duplicate.id, first.id);
        assert.equal(orderKeys.length, 1);
        const next = (await call('purchase', { key: randomUUID(), productId: 'test' }, sibling))
          .data.purchase;
        assert.equal(next.status, 'paid');
        assert.deepEqual(next.allocations, { 'Everything else': 0, Food: 100 });
        const denied = (await call('purchase', { key: randomUUID(), productId: 'test' }, sibling))
          .data.purchase;
        assert.equal(denied.status, 'blocked');
        assert.equal(orderKeys.length, 2);
        const checked = (
          await call('action', { action: 'retry' }, parent, 200, { purchaseId: first.id })
        ).data.purchase;
        assert.equal(checked.status, 'paid');
        assert.deepEqual(checked.allocations, first.allocations);
        assert.equal(orderKeys[0], orderKeys[2]);
        const teen = (await call('dashboard', undefined, sibling)).data;
        const adult = (await call(`dashboard?childId=${second.childId}`, undefined, parent)).data;
        assert.equal(teen.spent, 200);
        assert.equal(teen.reserved, 0);
        assert.equal(teen.used.Food, 150);
        assert.equal(teen.used['Everything else'], 50);
        assert.equal(
          adult.purchases.find((p: { id: string }) => p.id === first.id).warning,
          first.warning,
        );
        // Released spending capacity permits both totals, but only one donor dollar exists.
        // Concurrent requests must not reserve the same donor dollar twice.
        await db.budget.update({
          where: { childId: second.childId },
          data: {
            periodStart: new Date(Date.now() + 5000),
            allowance: 100,
            walletBonus: 100,
            food: 100,
            groceries: 0,
            transport: 0,
            other: 0,
          },
        });
        const raced = await Promise.all([
          call('purchase', { key: randomUUID(), productId: 'test' }, sibling),
          call('purchase', { key: randomUUID(), productId: 'test' }, sibling),
        ]);
        assert.deepEqual(raced.map((r) => r.data.purchase.status).sort(), ['approval', 'paid']);
        const reservedOnce = (await call('dashboard', undefined, sibling)).data;
        assert.equal(reservedOnce.used.Food, 100);
        assert.equal(reservedOnce.spent, 100);
      } finally {
        globalThis.fetch = originalFetch;
      }
    },
  );
  await t.test(
    'two-step checkout shows a budget decision before any PayPal call and verifies capture receipts',
    async () => {
      const invite = (
        await call('add', { name: 'Checkout teen', email: 'checkout@example.invalid' }, parent)
      ).data;
      const shopper = (
        await call('accept', {
          token: tokenOf(invite.url),
          username: `checkout_${suffix}`,
          password,
        })
      ).cookie!;
      await call(
        'budget',
        {
          policy: {
            allowance: 10000,
            threshold: 2500,
            softLimit: 1000,
            periodDays: 7,
            frozen: false,
            limits: { Food: 1000, Groceries: 0, Transport: 0, 'Everything else': 9000 },
          },
        },
        parent,
        200,
        { childId: invite.childId },
        'PUT',
      );
      const originalFetch = globalThis.fetch;
      const requests: string[] = [];
      const orders = new Map<string, { captured: boolean; value: string }>();
      let mismatch = false;
      globalThis.fetch = async (url, options) => {
        const endpoint = String(url);
        assert.ok(endpoint.startsWith('https://api-m.sandbox.paypal.com/'));
        requests.push(`${options?.method || 'GET'} ${endpoint}`);
        if (endpoint.endsWith('/token')) return Response.json({ access_token: 'fake-access' });
        let id = endpoint.split('/').at(-1)!;
        if (endpoint.endsWith('/v2/checkout/orders') && options?.method === 'POST') {
          const input = JSON.parse(String(options.body));
          id = `CHECKOUT-${input.purchase_units[0].custom_id}`;
          orders.set(id, { captured: false, value: input.purchase_units[0].amount.value });
        } else if (endpoint.endsWith('/capture')) {
          id = endpoint.split('/').at(-2)!;
          orders.get(id)!.captured = true;
        }
        const order = orders.get(id)!;
        assert.ok(order, 'Only known test orders can be retrieved or captured');
        return Response.json({
          id,
          status: order.captured ? 'COMPLETED' : 'APPROVED',
          purchase_units: [
            {
              payments: {
                captures: order.captured
                  ? [
                      {
                        id: `CAP-${id}`,
                        status: 'COMPLETED',
                        amount: { currency_code: 'USD', value: mismatch ? '0.01' : order.value },
                      },
                    ]
                  : [],
              },
            },
          ],
        });
      };
      try {
        const key = randomUUID();
        const prepared = (
          await call('purchase', { key, productId: 'lunch', prepare: true }, shopper)
        ).data.purchase;
        assert.equal(prepared.status, 'ready');
        assert.deepEqual(prepared.allocations, { Food: 1000, 'Everything else': 200 });
        assert.equal(requests.length, 0);
        assert.equal((await call('dashboard', undefined, shopper)).data.reserved, 0);
        // Replaying a prepared purchase never silently changes it into a payment.
        assert.equal(
          (await call('purchase', { key, productId: 'lunch' }, shopper)).data.purchase.id,
          prepared.id,
        );
        assert.equal(requests.length, 0);
        const paid = (
          await call('action', { action: 'retry' }, shopper, 200, { purchaseId: prepared.id })
        ).data.purchase;
        assert.equal(paid.status, 'paid');
        assert.ok(paid.orderId);
        assert.ok(paid.captureId);
        assert.ok(requests.some((request) => request.includes('/capture')));
        assert.deepEqual(paid.allocations, prepared.allocations);
        assert.equal(paid.warning, prepared.warning);
        const saved = (await call('dashboard', undefined, shopper)).data.purchases.find(
          (p: { id: string }) => p.id === paid.id,
        );
        assert.equal(saved.captureId, paid.captureId);
        const callsAfterPayment = requests.length;
        const game = (
          await call('purchase', { key: randomUUID(), productId: 'game', prepare: true }, shopper)
        ).data.purchase;
        assert.equal(game.status, 'approval');
        assert.equal(requests.length, callsAfterPayment);
        await call('action', { action: 'retry' }, shopper, 400, { purchaseId: game.id });
        assert.equal(requests.length, callsAfterPayment);
        const stale = (
          await call('purchase', { key: randomUUID(), productId: 'test', prepare: true }, shopper)
        ).data.purchase;
        await call('freeze', { frozen: true }, parent, 200, { childId: invite.childId }, 'PATCH');
        const stopped = (
          await call('action', { action: 'retry' }, shopper, 200, { purchaseId: stale.id })
        ).data.purchase;
        assert.equal(stopped.status, 'blocked');
        const blocked = (
          await call('purchase', { key: randomUUID(), productId: 'test', prepare: true }, shopper)
        ).data.purchase;
        assert.equal(blocked.status, 'blocked');
        assert.equal(requests.length, callsAfterPayment);
        await call('freeze', { frozen: false }, parent, 200, { childId: invite.childId }, 'PATCH');
        mismatch = true;
        const uncertain = (
          await call('purchase', { key: randomUUID(), productId: 'test', prepare: true }, shopper)
        ).data.purchase;
        const notConfirmed = (
          await call('action', { action: 'retry' }, shopper, 200, { purchaseId: uncertain.id })
        ).data.purchase;
        assert.equal(notConfirmed.status, 'processing');
        assert.equal(notConfirmed.captureId, undefined);
        assert.ok(notConfirmed.orderId);
        assert.equal((await call('dashboard', undefined, shopper)).data.reserved, 100);
        mismatch = false;
        const reconciled = (
          await call('action', { action: 'retry' }, parent, 200, { purchaseId: uncertain.id })
        ).data.purchase;
        assert.equal(reconciled.status, 'paid');
        assert.equal(reconciled.orderId, notConfirmed.orderId);
        assert.ok(reconciled.captureId);
      } finally {
        globalThis.fetch = originalFetch;
      }
    },
  );
  await t.test(
    'receipt AI uses trusted item data, persists evidence, and gates uncertain results before PayPal',
    async () => {
      const invite = (
        await call('add', { name: 'Receipt teen', email: 'receipt@example.invalid' }, parent)
      ).data;
      const shopper = (
        await call('accept', {
          token: tokenOf(invite.url),
          username: `receipt_${suffix}`,
          password,
        })
      ).cookie!;
      await call(
        'budget',
        {
          policy: {
            allowance: 10000,
            threshold: 10000,
            softLimit: 1000,
            frozen: false,
            periodDays: 7,
            limits: { Food: 1000, Groceries: 3000, Transport: 0, 'Everything else': 6000 },
          },
        },
        parent,
        200,
        { childId: invite.childId },
        'PUT',
      );
      const originalFetch = globalThis.fetch;
      process.env.OPENAI_API_KEY = 'integration-only-key';
      let mode = 'normal';
      let aiCalls = 0;
      let paypalCalls = 0;
      const orders = new Map<string, string>();
      globalThis.fetch = async (url, options) => {
        const endpoint = String(url);
        if (endpoint === 'https://api.openai.com/v1/responses') {
          aiCalls++;
          const request = JSON.parse(String(options?.body));
          const receipt = JSON.parse(request.input);
          assert.equal(receipt.currency, 'USD');
          assert.doesNotMatch(
            request.input,
            /parentId|childId|integration-only-key|Forged merchant/,
          );
          if (mode === 'unavailable')
            return Response.json(
              { error: { message: 'private-provider-failure' } },
              { status: 503 },
            );
          const items = receipt.items.map((item: { id: string }, index: number) => ({
            id: mode === 'invalid' ? 'invented-id' : item.id,
            category:
              mode === 'override'
                ? 'Food'
                : mode === 'mixed' && index === 0
                  ? 'Everything else'
                  : ['apples', 'yogurt', 'granola'].includes(item.id)
                    ? 'Groceries'
                    : ['sandwich', 'fruit', 'water'].includes(item.id)
                      ? 'Food'
                      : 'Everything else',
            confidence: mode === 'low' ? 0.4 : 0.98,
            explanation: `Item ${item.id} evidence from the receipt.`,
          }));
          return Response.json({
            status: 'completed',
            output: [{ content: [{ type: 'output_text', text: JSON.stringify({ items }) }] }],
          });
        }
        assert.ok(endpoint.startsWith('https://api-m.sandbox.paypal.com/'));
        paypalCalls++;
        if (endpoint.endsWith('/token')) return Response.json({ access_token: 'fake-access' });
        let id = endpoint.split('/').at(-1)!;
        if (endpoint.endsWith('/v2/checkout/orders') && options?.method === 'POST') {
          const input = JSON.parse(String(options.body));
          id = `AI-ORDER-${input.purchase_units[0].custom_id}`;
          orders.set(id, input.purchase_units[0].amount.value);
        }
        return Response.json({
          id,
          status: 'COMPLETED',
          purchase_units: [
            {
              payments: {
                captures: [
                  {
                    id: `CAP-${id}`,
                    status: 'COMPLETED',
                    amount: { currency_code: 'USD', value: orders.get(id) },
                  },
                ],
              },
            },
          ],
        });
      };
      try {
        const prepare = async (productId: string) =>
          (
            await call(
              'purchase',
              {
                key: randomUUID(),
                productId,
                prepare: true,
                receipt: { merchant: 'Forged merchant', items: [{ cents: 0 }] },
                category: 'Groceries',
                confidence: 1,
                cents: 1,
              },
              shopper,
            )
          ).data.purchase;
        const groceries = await prepare('groceries');
        const game = await prepare('game');
        assert.equal(groceries.receipt.merchant.name, game.receipt.merchant.name);
        assert.equal(groceries.category, 'Groceries');
        assert.equal(game.category, 'Everything else');
        assert.equal(game.cents, 4500);
        assert.equal(game.receipt.items[0].unitCents, 4500);
        assert.equal(game.classification.confidence, 0.98);
        assert.equal(game.status, 'ready');
        const saved = (await call('dashboard', undefined, shopper)).data.purchases.find(
          (p: { id: string }) => p.id === groceries.id,
        );
        assert.deepEqual(saved.classification, groceries.classification);
        assert.deepEqual(saved.receipt, groceries.receipt);
        mode = 'override';
        const routedByAI = await prepare('game');
        assert.equal(routedByAI.category, 'Food');
        assert.equal(
          routedByAI.status,
          'approval',
          'The classified category must drive the budget decision',
        );
        mode = 'low';
        const low = await prepare('test');
        assert.equal(low.status, 'approval');
        assert.equal(low.classification.needsReview, true);
        await call('action', { action: 'retry' }, shopper, 400, { purchaseId: low.id });
        mode = 'mixed';
        const mixed = await prepare('lunch');
        assert.equal(mixed.status, 'approval');
        assert.equal(mixed.classification.needsReview, true);
        for (const failure of ['invalid', 'unavailable']) {
          mode = failure;
          const fallback = await prepare('test');
          assert.equal(fallback.status, 'approval');
          assert.equal(fallback.classification.confidence, null);
          assert.equal(fallback.source, 'Shop catalog (AI unavailable)');
          assert.doesNotMatch(JSON.stringify(fallback), /private-provider-failure/);
        }
        assert.equal(paypalCalls, 0);
        const callsBeforeApproval = aiCalls;
        const approved = (
          await call('action', { action: 'approve' }, parent, 200, { purchaseId: low.id })
        ).data.purchase;
        assert.equal(approved.status, 'paid');
        assert.equal(approved.parentApproved, true);
        assert.deepEqual(approved.classification, low.classification);
        assert.equal(aiCalls, callsBeforeApproval, 'Payment uses the persisted classification');
        const paidCalls = paypalCalls;
        mode = 'normal';
        await call('freeze', { frozen: true }, parent, 200, { childId: invite.childId }, 'PATCH');
        assert.equal((await prepare('test')).status, 'blocked');
        assert.equal(paypalCalls, paidCalls);
      } finally {
        process.env.OPENAI_API_KEY = '';
        globalThis.fetch = originalFetch;
      }
    },
  );
  await t.test(
    'dashboard forecasts use only the selected teen, respect reservations and pauses, and reset at renewal',
    async () => {
      const invite = (
        await call('add', { name: 'Forecast teen', email: 'forecast@example.invalid' }, parent)
      ).data;
      const shopper = (
        await call('accept', {
          token: tokenOf(invite.url),
          username: `forecast_${suffix}`,
          password,
        })
      ).cookie!;
      const day = 86400000;
      const periodStart = new Date(Date.now() - 2 * day);
      await db.budget.update({ where: { childId: invite.childId }, data: { periodStart } });
      await db.purchase.createMany({
        data: [0.5, 1.5].map((offset) => ({
          childId: invite.childId,
          key: randomUUID(),
          productId: 'lunch',
          name: 'Forecast test fixture',
          cents: 3000,
          category: 'Food',
          explanation: 'Synthetic test history',
          source: 'Test fixture',
          status: 'paid' as const,
          reason: 'Test fixture',
          period: periodStart,
          createdAt: new Date(periodStart.getTime() + offset * day),
          attemptedAt: new Date(periodStart.getTime() + offset * day),
        })),
      });
      const teen = (await call('dashboard', undefined, shopper)).data;
      assert.equal(teen.forecast.status, 'at-risk');
      assert.equal(teen.forecast.paidCount, 2);
      assert.equal(
        teen.forecast.availableCents,
        teen.policy.allowance - teen.spent - teen.reserved,
      );
      assert.equal(teen.forecast.dailyRateCents, 6000 / teen.forecast.elapsedDays);
      assert.equal(teen.forecast.projectedEndCents, 0);
      assert.ok(Date.parse(teen.forecast.runsOutAt) < Date.parse(teen.renewsAt));
      assert.equal('vault' in teen.forecast, false);
      const adult = (await call(`dashboard?childId=${invite.childId}`, undefined, parent)).data;
      assert.equal(adult.forecast.spentCents, 6000);
      await call(`dashboard?childId=${invite.childId}`, undefined, sibling, 403);
      await call(`dashboard?childId=${invite.childId}`, undefined, other, 404);
      await db.purchase.create({
        data: {
          childId: invite.childId,
          key: randomUUID(),
          productId: 'test',
          name: 'Pending test fixture',
          cents: 500,
          category: 'Everything else',
          explanation: '',
          source: 'Test fixture',
          status: 'processing',
          reason: '',
          period: new Date(periodStart.getTime() - 7 * day),
        },
      });
      const pending = (await call('dashboard', undefined, shopper)).data;
      assert.equal(pending.forecast.availableCents, 3500);
      assert.equal(pending.forecast.spentCents, 6000);
      assert.equal(pending.forecast.reservedCents, 500);
      assert.equal(pending.forecast.recorded.at(-1).cents, pending.forecast.availableCents);
      await call('freeze', { frozen: true }, parent, 200, { childId: invite.childId }, 'PATCH');
      const paused = (await call('dashboard', undefined, shopper)).data;
      assert.equal(paused.forecast.status, 'paused');
      assert.deepEqual(paused.forecast.projected, []);
      await db.budget.update({
        where: { childId: invite.childId },
        data: { frozen: false, periodStart: new Date(Date.now() - 8 * day) },
      });
      const renewed = (await call('dashboard', undefined, shopper)).data;
      assert.equal(renewed.forecast.status, 'no-spending');
      assert.equal(renewed.forecast.paidCount, 0);
      assert.equal(renewed.forecast.reservedCents, 500);
      assert.equal(renewed.forecast.availableCents, 9500);
      await db.budget.update({
        where: { childId: invite.childId },
        data: { vaultEnabled: true, periodStart: new Date(Date.now() - 8 * day) },
      });
      const delayed = (await call('dashboard', undefined, shopper)).data;
      assert.equal(delayed.forecast.status, 'renewal-pending');
      assert.deepEqual(delayed.forecast.projected, []);
    },
  );
  await t.test(
    'teen privacy: age, ownership, overall-only reads, redacted actions and retained controls',
    async () => {
      const patch = (name: string, input: unknown, cookie: string, status = 200, id = childId) =>
        call(name, input, cookie, status, { childId: id }, 'PATCH');
      await patch('privacy', { enabled: true }, child, 400);
      await patch('birthDate', { birthDate: '2008-01-01' }, child, 403);
      await patch('birthDate', { birthDate: '2008-01-01' }, other, 404);
      await patch('birthDate', { birthDate: '2099-01-01' }, parent, 400);
      await patch('birthDate', { birthDate: '2010-02-29' }, parent, 400);
      await patch('birthDate', { birthDate: '2008-01-01' }, parent);
      await patch('birthDate', { birthDate: '2015-01-01' }, parent, 409);
      await patch('birthDate', { birthDate: '2020-01-01' }, parent, 200, second.childId);
      await patch('privacy', { enabled: true }, sibling, 400, second.childId);
      await patch('privacy', { enabled: true }, sibling, 403);
      await patch('privacy', { enabled: true }, parent, 403);
      await patch('privacy', { enabled: true }, other, 403);
      await patch('privacy', { enabled: true, birthDate: '2000-01-01' }, child, 400);
      await patch('privacy', { enabled: true }, child);
      const period = (await db.budget.findUniqueOrThrow({ where: { childId } })).periodStart;
      const secrets = await Promise.all(
        (['paid', 'approval', 'processing', 'ready', 'declined'] as const).map((status) =>
          db.purchase.create({
            data: {
              childId,
              key: randomUUID(),
              productId: 'lunch',
              name: 'PRIVATE-MERCHANT-SECRET',
              cents: 100,
              category: 'Food',
              explanation: 'PRIVATE-AI-SECRET',
              source: 'PRIVATE-SOURCE-SECRET',
              status,
              reason: 'PRIVATE-REASON-SECRET',
              period,
              receipt: { merchant: 'PRIVATE-RECEIPT-SECRET' },
              classification: { items: [{ name: 'PRIVATE-ITEM-SECRET' }] },
              warning: 'PRIVATE-WARNING-SECRET',
              error: 'PRIVATE-ERROR-SECRET',
              orderId: `PRIVATE-ORDER-${randomUUID()}`,
              captureId: `PRIVATE-CAPTURE-${randomUUID()}`,
              leaseUntil: status === 'processing' ? new Date(Date.now() + 60000) : null,
            },
          }),
        ),
      );
      const adult = (await call(`dashboard?childId=${childId}`, undefined, parent)).data;
      const teen = (await call('dashboard', undefined, child)).data;
      assert.equal(adult.privacy.enabled, true);
      assert.equal(
        adult.children.find((c: { id: string }) => c.id === childId).privacy.enabled,
        true,
      );
      assert.equal(adult.spent, teen.spent);
      assert.equal(adult.reserved, teen.reserved);
      assert.deepEqual(adult.purchases, []);
      assert.equal('used' in adult, false);
      assert.equal('forecast' in adult, false);
      assert.doesNotMatch(JSON.stringify(adult), /PRIVATE-/);
      for (const item of adult.privateRequests)
        assert.deepEqual(Object.keys(item).sort(), ['cents', 'id', 'private', 'reason', 'status']);
      for (const status of ['approval', 'processing'])
        assert.ok(adult.privateRequests.some((p: { status: string }) => p.status === status));
      assert.ok(teen.purchases.some((p: { name: string }) => p.name === 'PRIVATE-MERCHANT-SECRET'));
      assert.ok(teen.used);
      assert.ok(teen.forecast);
      const approval = secrets.find((p) => p.status === 'approval')!;
      const declined = (
        await call('action', { action: 'decline' }, parent, 200, { purchaseId: approval.id })
      ).data.purchase;
      assert.deepEqual(Object.keys(declined).sort(), [
        'cents',
        'id',
        'private',
        'reason',
        'status',
      ]);
      assert.equal(declined.status, 'declined');
      const processing = secrets.find((p) => p.status === 'processing')!;
      const retry = (
        await call('action', { action: 'retry' }, parent, 200, { purchaseId: processing.id })
      ).data.purchase;
      assert.equal(retry.private, true);
      assert.doesNotMatch(JSON.stringify(retry), /PRIVATE-/);
      // The teen can enable privacy while an already-approved provider request is in flight.
      await db.budget.update({
        where: { childId },
        data: { allowance: 10000, food: 3000, groceries: 2000, transport: 2000, other: 3000 },
      });
      await db.purchase.update({
        where: { id: approval.id },
        data: { status: 'approval', orderId: null, captureId: null },
      });
      await patch('privacy', { enabled: false }, child);
      const originalFetch = globalThis.fetch;
      const orderId = `PRIVATE-FINAL-ORDER-${suffix}`;
      globalThis.fetch = async (url) => {
        const endpoint = String(url);
        assert.ok(endpoint.startsWith('https://api-m.sandbox.paypal.com/'));
        if (endpoint.endsWith('/token')) {
          await patch('privacy', { enabled: true }, child);
          return Response.json({ access_token: 'fake-access' });
        }
        return Response.json({
          id: orderId,
          status: 'COMPLETED',
          purchase_units: [
            {
              payments: {
                captures: [
                  {
                    id: `PRIVATE-FINAL-CAPTURE-${suffix}`,
                    status: 'COMPLETED',
                    amount: { currency_code: 'USD', value: '1.00' },
                  },
                ],
              },
            },
          ],
        });
      };
      try {
        const paid = (
          await call('action', { action: 'approve' }, parent, 200, { purchaseId: approval.id })
        ).data.purchase;
        assert.equal(paid.status, 'paid');
        assert.equal(paid.private, true);
        assert.deepEqual(Object.keys(paid).sort(), ['cents', 'id', 'private', 'reason', 'status']);
        assert.doesNotMatch(JSON.stringify(paid), /PRIVATE-/);
        const owned = (await call('dashboard', undefined, child)).data;
        assert.equal(
          owned.purchases.find((p: { id: string }) => p.id === approval.id).captureId,
          `PRIVATE-FINAL-CAPTURE-${suffix}`,
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
      await patch('freeze', { frozen: true }, parent);
      assert.equal(
        (await call('purchase', { productId: 'test', key: randomUUID() }, child)).data.purchase
          .status,
        'blocked',
      );
      await patch('freeze', { frozen: false }, parent);
      await patch('privacy', { enabled: false }, child);
      const shared = (await call(`dashboard?childId=${childId}`, undefined, parent)).data;
      assert.equal(shared.privacy.enabled, false);
      assert.ok(shared.used);
      assert.ok(
        shared.purchases.some((p: { name: string }) => p.name === 'PRIVATE-MERCHANT-SECRET'),
      );
    },
  );
  await call('logout', {}, child);
  await call('purchase', { key: randomUUID(), productId: 'test' }, child, 401);
});
