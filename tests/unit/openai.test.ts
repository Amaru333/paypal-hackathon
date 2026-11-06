import test from 'node:test';
import assert from 'node:assert/strict';
import { draftPolicy } from '../../src/server/integrations/openai';
import { defaultPolicy } from '../../src/domain/wallet';
import { HttpError } from '../../src/server/http/errors';

test('budget drafts expose safe, actionable provider errors', async (t) => {
  const key = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'test-key';
  t.after(() => {
    if (key === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = key;
  });
  for (const [status, error, message] of [
    [
      429,
      { code: 'credit_balance_exhausted', type: 'insufficient_quota' },
      /credits are exhausted/,
    ],
    [429, { code: 'insufficient_quota' }, /credits are exhausted/],
    [429, { code: 'rate_limit_exceeded' }, /Wait a moment/],
    [401, { message: 'secret-provider-details' }, /rejected the API key/],
    [404, { code: 'model_not_found' }, /model access/],
    [500, { message: 'secret-provider-details' }, /try again shortly/],
  ] as const) {
    await t.test(`${status}: ${JSON.stringify(error)}`, async (t) => {
      t.mock.method(globalThis, 'fetch', async () => Response.json({ error }, { status }));
      await assert.rejects(draftPolicy('Keep my current budget', defaultPolicy), (error) => {
        assert.ok(error instanceof HttpError);
        assert.equal(error.status, status === 500 ? 502 : 503);
        assert.match(error.message, message);
        assert.doesNotMatch(error.message, /secret-provider-details|test-key/);
        return true;
      });
    });
  }
  await t.test('successful response remains a validated draft', async (t) => {
    t.mock.method(globalThis, 'fetch', async () =>
      Response.json({
        status: 'completed',
        output: [{ content: [{ type: 'output_text', text: JSON.stringify(defaultPolicy) }] }],
      }),
    );
    assert.deepEqual(await draftPolicy('Keep my current budget', defaultPolicy), defaultPolicy);
  });
});
