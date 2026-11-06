import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluate,
  usage,
  validatePolicy,
  defaultPolicy,
  type Purchase,
} from '../../src/domain/wallet';
const period = '2026-10-23T00:00:00.000Z';
const purchase = (overrides: Partial<Purchase> = {}): Purchase => ({
  id: 'test',
  childId: 'child',
  key: 'key',
  productId: 'lunch',
  name: 'Lunch',
  explanation: '',
  source: 'test',
  createdAt: period,
  reason: '',
  cents: 1200,
  category: 'Food',
  period,
  status: 'paid',
  ...overrides,
});
test('a small purchase fits without parent approval', () =>
  assert.equal(evaluate(defaultPolicy, [], period, 1200, 'Food').status, 'ready'));
test('large and category-over-budget purchases require approval', () => {
  assert.equal(evaluate(defaultPolicy, [], period, 4500, 'Everything else').status, 'approval');
  assert.equal(
    evaluate(defaultPolicy, [purchase({ cents: 2800 })], period, 500, 'Food').status,
    'approval',
  );
});
test('a parent can grant a category exception, but cannot bypass the total or freeze', () => {
  assert.equal(evaluate(defaultPolicy, [], period, 4500, 'Everything else', true).status, 'ready');
  assert.equal(evaluate(defaultPolicy, [], period, 11000, 'Food', true).status, 'blocked');
  assert.equal(
    evaluate({ ...defaultPolicy, frozen: true }, [], period, 100, 'Food', true).status,
    'blocked',
  );
});
test('pending payment reservations prevent overspending, including across renewal', () => {
  const purchases = [purchase({ cents: 9800, status: 'processing', period: 'previous' })];
  assert.equal(usage(purchases, period).reserved, 9800);
  assert.equal(evaluate(defaultPolicy, purchases, period, 500, 'Transport').status, 'blocked');
});
test('only paid purchases and pending charges consume allowance', () => {
  assert.equal(
    usage(
      [
        purchase({ status: 'declined' }),
        purchase({ status: 'approval' }),
        purchase({ period: 'old' }),
        purchase(),
      ],
      period,
    ).spent,
    1200,
  );
});
test('reject negative, fractional, unbalanced, and excessive budget values', () => {
  for (const change of [
    { allowance: -1 },
    { threshold: 1.5 },
    { allowance: 9999 },
    { allowance: 100001 },
    { periodDays: 0 },
  ])
    assert.throws(() => validatePolicy({ ...defaultPolicy, ...change }));
  assert.deepEqual(validatePolicy(defaultPolicy), defaultPolicy);
});
