import test from 'node:test';
import assert from 'node:assert/strict';
import { sendInvitationEmail } from '../../src/server/integrations/email';

test('invitation delivery handles missing settings, provider errors, and safe retries', async (t) => {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  t.after(() => {
    if (key === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = key;
    if (from === undefined) delete process.env.EMAIL_FROM;
    else process.env.EMAIL_FROM = from;
  });
  const input = {
    to: 'child@example.invalid',
    name: 'Maya',
    url: 'https://example.invalid/invite#invite=private-token',
  };
  delete process.env.RESEND_API_KEY;
  assert.equal(await sendInvitationEmail(input), 'not_configured');
  process.env.RESEND_API_KEY = 'test-key';
  process.env.EMAIL_FROM = 'Pocket <invites@example.invalid>';
  await t.test('sends a private, expiring link with an opaque idempotency key', async (t) => {
    t.mock.method(globalThis, 'fetch', async (_url: unknown, options: RequestInit) => {
      const payload = JSON.parse(options.body as string);
      assert.deepEqual(payload.to, [input.to]);
      assert.ok(payload.text.includes(input.url));
      assert.match(payload.text, /24 hours/);
      assert.match(
        (options.headers as Record<string, string>)['Idempotency-Key'],
        /^invitation-[a-f0-9]{64}$/,
      );
      return Response.json({ id: 'message-id' });
    });
    assert.equal(await sendInvitationEmail(input), 'sent');
  });
  await t.test('provider rejection is reported without exposing details', async (t) => {
    t.mock.method(globalThis, 'fetch', async () =>
      Response.json({ message: 'private-provider-error' }, { status: 403 }),
    );
    assert.equal(await sendInvitationEmail(input), 'failed');
  });
  await t.test('network failure preserves a recoverable status', async (t) => {
    t.mock.method(globalThis, 'fetch', async () => {
      throw new Error('network failure');
    });
    assert.equal(await sendInvitationEmail(input), 'failed');
  });
});
