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
  freeze: 'children/[childId]/freeze',
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
  const invitation = (await call('add', { name: 'Maya' }, parent)).data;
  const childId = invitation.childId;
  const token = tokenOf(invitation.url);
  assert.ok(invitation.expiresAt - Date.now() > 23 * 3600000);
  assert.notEqual((await db.invitation.findUniqueOrThrow({ where: { childId } })).tokenHash, token);
  await call('accept', { token, username: `maya_${suffix}`, password }, parent, 400);
  const child = (await call('accept', { token, username: `maya_${suffix}`, password })).cookie!;
  await call('accept', { token, username: `replay_${suffix}`, password }, undefined, 410);
  assert.ok((await call('login', { role: 'child', username: `maya_${suffix}`, password })).cookie);
  const second = (await call('add', { name: 'Leo' }, parent)).data;
  const sibling = (
    await call('accept', { token: tokenOf(second.url), username: `leo_${suffix}`, password })
  ).cookie!;

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
    const pending = (await call('add', { name: 'Pending' }, parent)).data;
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
  await call('logout', {}, child);
  await call('purchase', { key: randomUUID(), productId: 'test' }, child, 401);
});
