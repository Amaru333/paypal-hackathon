import 'dotenv/config';
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { NextRequest } from 'next/server';
import { visibilityKey } from '../../src/domain/assistant';
import { defaultPolicy } from '../../src/domain/wallet';

if (
  !process.env.TEST_DATABASE_URL ||
  !new URL(process.env.TEST_DATABASE_URL).pathname.endsWith('_test')
)
  throw new Error('Dedicated test database required');
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.OPENAI_API_KEY = '';
process.env.RESEND_API_KEY = '';
delete process.env.APP_URL;
const { database } = await import('../../src/server/db/client');
const db = database();
const suffix = randomUUID().slice(0, 8);
const emails = [`assistant-${suffix}@example.test`, `assistant-other-${suffix}@example.test`];
const password = 'assistant-integration-only';
const origin = 'http://localhost:3001';
const paths: Record<string, string> = {
  signup: 'auth/signup',
  add: 'children',
  accept: 'invitations/accept',
  dashboard: 'dashboard',
  propose: 'assistant/proposals',
  decide: 'assistant/actions',
  chat: 'assistant/chat',
  insights: 'assistant/insights',
  privacy: 'children/[childId]/privacy',
  budget: 'children/[childId]/budget',
};
async function call(
  name: string,
  input: unknown,
  cookie?: string,
  expected = 200,
  params: Record<string, string> = {},
  method = 'POST',
  requestOrigin = origin,
) {
  const route = await import(`../../src/app/api/${paths[name]}/route.ts`);
  const response: Response = await route[method](
    new NextRequest(`${origin}/api/${paths[name]}`, {
      method,
      headers: {
        host: 'localhost:3001',
        origin: requestOrigin,
        'Content-Type': 'application/json',
        ...(cookie ? { cookie } : {}),
      },
      ...(input === undefined ? {} : { body: JSON.stringify(input) }),
    }),
    { params: Promise.resolve(params) },
  );
  const data = await response.json();
  assert.equal(response.status, expected, `${name}: ${data.error || 'unexpected status'}`);
  return { data, cookie: response.headers.get('set-cookie')?.split(';')[0] };
}
before(() => {
  const result = spawnSync(
    process.execPath,
    ['node_modules/prisma/build/index.js', 'migrate', 'deploy'],
    { env: process.env, windowsHide: true, encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stderr);
});
after(async () => {
  const parents = await db.parent.findMany({ where: { email: { in: emails } } });
  await db.purchase.deleteMany({
    where: { child: { parentId: { in: parents.map((p) => p.id) } } },
  });
  await db.parent.deleteMany({ where: { id: { in: parents.map((p) => p.id) } } });
  await db.$disconnect();
});

test('parent assistant: tools, proposals, concurrency, authorization and privacy', async (t) => {
  const parent = (await call('signup', { name: 'Assistant parent', email: emails[0], password }))
    .cookie!;
  const other = (await call('signup', { name: 'Other parent', email: emails[1], password }))
    .cookie!;
  const invite = (
    await call(
      'add',
      { name: 'Maya', email: 'assistant-teen@example.invalid', birthDate: '2008-01-01' },
      parent,
    )
  ).data;
  const childId = invite.childId;
  const token = new URLSearchParams(new URL(invite.url).hash.slice(1)).get('invite');
  const teen = (await call('accept', { token, username: `assistant_${suffix}`, password })).cookie!;
  const family = async () => (await call('dashboard', undefined, parent, 200, {}, 'GET')).data;
  const command = { kind: 'top_up', childId, cents: 2000 };
  const propose = async (input: unknown = command) => (await call('propose', input, parent)).data;
  const decide = async (id: string, decision = 'confirm', expected = 200) =>
    (await call('decide', { id, decision }, parent, expected)).data;
  const chat = async (message = 'Analyze Maya', expected = 200) =>
    (
      await call(
        'chat',
        { message, previous: [], childId, visibilityKey: visibilityKey((await family()).children) },
        parent,
        expected,
      )
    ).data;
  await t.test('all tools and decisions enforce parent ownership and CSRF', async () => {
    await call('propose', command, undefined, 401);
    await call('propose', command, teen, 403);
    await call('propose', command, other, 404);
    await call('insights', { childId, kind: 'analysis' }, teen, 403);
    await call('insights', { childId, kind: 'analysis' }, other, 404);
    await call('propose', command, parent, 403, {}, 'POST', 'https://outside.invalid');
    await call('propose', { ...command, cents: -1 }, parent, 400);
    await call('propose', { ...command, parentId: 'forged' }, parent, 400);
  });
  await t.test(
    'top-ups require confirmation and concurrent retries apply exactly once',
    async () => {
      const before = await db.budget.findUniqueOrThrow({ where: { childId } });
      const proposal = await propose();
      assert.equal(
        (await db.budget.findUniqueOrThrow({ where: { childId } })).walletBonus,
        before.walletBonus,
      );
      await call('decide', { id: proposal.id, decision: 'confirm' }, other, 404);
      await call('decide', { id: proposal.id, decision: 'confirm' }, teen, 403);
      await call('decide', { id: proposal.id, decision: 'confirm', cents: 999999 }, parent, 400);
      const results = await Promise.all([decide(proposal.id), decide(proposal.id)]);
      assert.equal(results.filter((r) => !r.alreadyApplied).length, 1);
      assert.equal(
        (await db.budget.findUniqueOrThrow({ where: { childId } })).walletBonus,
        before.walletBonus + 2000,
      );
      const stored = await db.assistantAction.findUniqueOrThrow({ where: { id: proposal.id } });
      assert.equal(stored.status, 'applied');
      assert.ok(stored.appliedAt);
    },
  );
  await t.test(
    'cancelled, expired, stale and rollover proposals cannot change balances',
    async () => {
      const cancelled = await propose();
      await decide(cancelled.id, 'cancel');
      await decide(cancelled.id, 'confirm', 409);
      const expired = await propose();
      await db.assistantAction.update({
        where: { id: expired.id },
        data: { expiresAt: new Date(0) },
      });
      await decide(expired.id, 'confirm', 409);
      const stale = await propose();
      await db.budget.update({ where: { childId }, data: { threshold: { increment: 1 } } });
      await decide(stale.id, 'confirm', 409);
      const rollover = await propose();
      await db.budget.update({
        where: { childId },
        data: { periodStart: new Date(Date.now() - 8 * 86400000) },
      });
      await decide(rollover.id, 'confirm', 409);
      await family();
      assert.equal((await db.budget.findUniqueOrThrow({ where: { childId } })).walletBonus, 0);
    },
  );
  await t.test(
    'budget drafts validate allocations and preserve pauses; vault releases respect saved funds',
    async () => {
      const { walletBonus: ignored, ...policy } = defaultPolicy;
      void ignored;
      const { frozen: alsoIgnored, ...proposed } = policy;
      void alsoIgnored;
      await call(
        'propose',
        { kind: 'budget', childId, policy: { ...proposed, softLimit: 1000, allowance: 500 } },
        parent,
        400,
      );
      const pause = await propose({ kind: 'freeze', childId, frozen: true });
      await decide(pause.id);
      const budget = await propose({
        kind: 'budget',
        childId,
        policy: { ...proposed, softLimit: 500 },
      });
      await decide(budget.id);
      assert.equal((await db.budget.findUniqueOrThrow({ where: { childId } })).frozen, true);
      assert.equal((await db.budget.findUniqueOrThrow({ where: { childId } })).softLimit, 500);
      await call('propose', { kind: 'release_vault', childId, cents: 100 }, parent, 400);
      await db.budget.update({ where: { childId }, data: { vaultBalance: 5000 } });
      const release = await propose({ kind: 'release_vault', childId, cents: 3000 });
      await decide(release.id);
      const current = await db.budget.findUniqueOrThrow({ where: { childId } });
      assert.equal(current.vaultBalance, 2000);
      assert.equal(current.walletBonus, 3000);
      assert.equal(current.frozen, true);
    },
  );
  await t.test(
    'real Responses tool loop returns validated review cards without applying model requests',
    async () => {
      process.env.OPENAI_API_KEY = 'mock-key';
      const originalFetch = globalThis.fetch;
      let step = 0;
      globalThis.fetch = async (url, options) => {
        assert.equal(String(url), 'https://api.openai.com/v1/responses');
        const input = JSON.parse(String(options!.body));
        assert.equal(input.store, false);
        assert.equal(input.parallel_tool_calls, false);
        if (step === 0) {
          step++;
          return Response.json({
            status: 'completed',
            output: [
              {
                type: 'function_call',
                call_id: 'read',
                name: 'get_budget',
                arguments: JSON.stringify({ childId }),
              },
            ],
          });
        }
        if (step === 1) {
          step++;
          assert.ok(
            input.input.some(
              (i: { type: string; call_id: string }) =>
                i.type === 'function_call_output' && i.call_id === 'read',
            ),
          );
          return Response.json({
            status: 'completed',
            output: [
              {
                type: 'function_call',
                call_id: 'draft',
                name: 'propose_top_up',
                arguments: JSON.stringify({ childId, cents: 1700 }),
              },
            ],
          });
        }
        assert.match(JSON.stringify(input.input), /review_required/);
        return Response.json({
          status: 'completed',
          output: [
            {
              type: 'message',
              content: [{ type: 'output_text', text: 'Review the extra budget below.' }],
            },
          ],
        });
      };
      try {
        const before = (await db.budget.findUniqueOrThrow({ where: { childId } })).walletBonus;
        const reply = await chat('Add $17 to Maya’s budget');
        assert.equal(reply.cards.length, 2);
        assert.equal(reply.cards[1].command.cents, 1700);
        assert.equal(reply.tools.length, 2);
        assert.equal(
          (await db.budget.findUniqueOrThrow({ where: { childId } })).walletBonus,
          before,
        );
      } finally {
        globalThis.fetch = originalFetch;
        process.env.OPENAI_API_KEY = '';
      }
    },
  );
  await t.test(
    'private spending is absent from tool outputs and model inputs; mid-turn privacy changes discard results',
    async () => {
      const budget = await db.budget.findUniqueOrThrow({ where: { childId } });
      await db.purchase.create({
        data: {
          childId,
          key: randomUUID(),
          productId: 'test',
          name: 'PRIVATE-SECRET-PURCHASE',
          category: 'Food',
          cents: 100,
          explanation: 'PRIVATE-SECRET-AI',
          source: 'PRIVATE-SECRET-SOURCE',
          reason: 'PRIVATE-SECRET-REASON',
          status: 'paid',
          period: budget.periodStart,
          receipt: { item: 'PRIVATE-SECRET-ITEM' },
        },
      });
      const full = (await call('insights', { childId, kind: 'analysis' }, parent)).data;
      assert.ok(full.purchases.length);
      await call('privacy', { enabled: true }, teen, 200, { childId }, 'PATCH');
      const hidden = (await call('insights', { childId, kind: 'analysis' }, parent)).data;
      const familyCard = (await call('insights', { kind: 'family' }, parent)).data;
      assert.equal(familyCard.type, 'family');
      assert.equal(familyCard.children.length, 1);
      assert.equal(familyCard.children[0].private, true);
      assert.doesNotMatch(JSON.stringify(familyCard), /PRIVATE-SECRET/);
      assert.equal(hidden.private, true);
      assert.equal(hidden.spent, 100);
      assert.doesNotMatch(
        JSON.stringify(hidden),
        /PRIVATE-SECRET|categories|daily|purchases|forecast/,
      );
      process.env.OPENAI_API_KEY = 'mock-key';
      const originalFetch = globalThis.fetch;
      let step = 0;
      globalThis.fetch = async (_url, options) => {
        assert.doesNotMatch(String(options!.body), /PRIVATE-SECRET/);
        if (step++ === 0)
          return Response.json({
            status: 'completed',
            output: [
              {
                type: 'function_call',
                call_id: 'private',
                name: 'analyze_spending',
                arguments: JSON.stringify({ childId }),
              },
            ],
          });
        return Response.json({
          status: 'completed',
          output: [
            { type: 'message', content: [{ type: 'output_text', text: 'Overall totals only.' }] },
          ],
        });
      };
      try {
        const reply = await chat();
        assert.equal(reply.cards[0].private, true);
        assert.doesNotMatch(JSON.stringify(reply), /PRIVATE-SECRET/);
        globalThis.fetch = async () => {
          await call('privacy', { enabled: false }, teen, 200, { childId }, 'PATCH');
          return Response.json({
            status: 'completed',
            output: [
              {
                type: 'message',
                content: [{ type: 'output_text', text: 'Old visibility response' }],
              },
            ],
          });
        };
        await chat('Analyze Maya', 409);
      } finally {
        globalThis.fetch = originalFetch;
        process.env.OPENAI_API_KEY = '';
      }
    },
  );
  await t.test(
    'AI unavailable and provider errors do not apply actions or expose provider secrets',
    async () => {
      await chat('Hello', 503);
      process.env.OPENAI_API_KEY = 'mock-key';
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () =>
        Response.json({ error: { message: 'PRIVATE-PROVIDER-SECRET' } }, { status: 429 });
      try {
        assert.doesNotMatch(JSON.stringify(await chat('Hello', 503)), /PRIVATE-PROVIDER-SECRET/);
      } finally {
        globalThis.fetch = originalFetch;
        process.env.OPENAI_API_KEY = '';
      }
      await call('chat', { message: 'Hello', previous: [], visibilityKey: 'stale' }, parent, 409);
    },
  );
});
