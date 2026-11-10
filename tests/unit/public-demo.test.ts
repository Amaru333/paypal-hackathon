import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleCheckout, sampleDashboard } from '../../src/features/landing/demo-data';
import { checkoutOutcome } from '../../src/domain/checkout';

test('the public checkout demonstrates real budget rules without fabricating payment proof', () => {
  const plan = sampleCheckout();
  assert.equal(plan.cents, 1200);
  assert.equal(plan.status, 'ready');
  assert.deepEqual(plan.allocations, { Food: 1000, 'Everything else': 200 });
  assert.match(plan.warning!, /\$2.00 from Everything else/);
  const completed = sampleCheckout(true);
  assert.equal(completed.orderId, undefined);
  assert.equal(completed.captureId, undefined);
  assert.equal(checkoutOutcome(completed).confirmed, false);
  assert.match(completed.reason, /No payment was sent/);
});

test('public dashboard samples reconcile before and after the simulated purchase and preserve vault privacy', () => {
  const before = sampleDashboard('child');
  const after = sampleDashboard('child', true);
  assert.equal(before.spent, 2300);
  assert.equal(after.spent, 3500);
  assert.equal(after.used.Food, 1000);
  assert.equal(after.used['Everything else'], 200);
  assert.equal(after.children[0].remaining, 6500);
  assert.equal(after.forecast!.availableCents, 6500);
  assert.equal('vault' in before, false);
  assert.equal('vault' in after, false);
  assert.equal(sampleDashboard('parent', true).vault!.balance, 5000);
});

test('sample data stays isolated and is generated without network access', (t) => {
  t.mock.method(globalThis, 'fetch', () => {
    throw new Error('Public demo cannot use the network');
  });
  const modified = sampleDashboard('parent');
  modified.policy.limits.Food = 99999;
  modified.purchases[0].name = 'changed';
  assert.equal(sampleDashboard('child').policy.limits.Food, 1000);
  assert.notEqual(sampleDashboard('child').purchases[0].name, 'changed');
  assert.equal(sampleCheckout().allocations!.Food, 1000);
});
