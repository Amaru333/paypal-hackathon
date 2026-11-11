import test from 'node:test';
import assert from 'node:assert/strict';
import { ageOnDate, privacyState, privatePurchase, validBirthDate } from '../../src/domain/privacy';

test('privacy eligibility starts on the sixteenth UTC birthday', () => {
  assert.equal(ageOnDate('2010-11-10', Date.parse('2026-11-09T23:59:59Z')), 15);
  assert.equal(ageOnDate('2010-11-10', Date.parse('2026-11-10T00:00:00Z')), 16);
  assert.equal(ageOnDate('2012-02-29', Date.parse('2029-02-28T12:00:00Z')), 16);
  assert.equal(ageOnDate('2012-02-29', Date.parse('2029-03-01T00:00:00Z')), 17);
  assert.equal(ageOnDate(null), null);
  assert.equal(ageOnDate('invalid'), null);
  const now = Date.parse('2026-11-10T00:00:00Z');
  assert.equal(
    privacyState({ birthDate: new Date('2010-11-10'), privacyEnabled: true }, now).enabled,
    true,
  );
  assert.equal(
    privacyState({ birthDate: new Date('2010-11-11'), privacyEnabled: true }, now).enabled,
    false,
  );
  assert.equal(privacyState({ birthDate: null, privacyEnabled: true }, now).enabled, false);
  assert.equal(
    privacyState({ birthDate: new Date('2008-11-10'), privacyEnabled: false }, now).enabled,
    false,
  );
});

test('birth dates reject rollovers, future dates and ambiguous input', () => {
  const now = Date.parse('2026-11-10T12:00:00Z');
  for (const value of [
    '2026-11-11',
    '1899-12-31',
    '2010-02-29',
    '2010-13-01',
    ' 2010-01-01',
    '2010-1-1',
    '',
  ])
    assert.throws(() => validBirthDate(value, now));
  assert.equal(validBirthDate('2012-02-29', now).toISOString(), '2012-02-29T00:00:00.000Z');
});

test('private purchase DTO explicitly whitelists fields and replaces sensitive reasons', () => {
  for (const status of [
    'ready',
    'approval',
    'processing',
    'paid',
    'declined',
    'blocked',
  ] as const) {
    const result = privatePurchase({
      id: 'request',
      cents: 1500,
      status,
      reason: 'Food: secret merchant and receipt',
    });
    assert.deepEqual(Object.keys(result).sort(), ['cents', 'id', 'private', 'reason', 'status']);
    assert.doesNotMatch(result.reason, /Food|secret|merchant|receipt/);
    assert.equal(result.private, true);
  }
});
