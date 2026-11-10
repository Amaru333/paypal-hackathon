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
test('large purchases require approval; small category shortfalls receive coverage', () => {
  assert.equal(evaluate(defaultPolicy, [], period, 4500, 'Everything else').status, 'approval');
  assert.equal(
    evaluate(defaultPolicy, [purchase({ cents: 2800 })], period, 500, 'Food').status,
    'ready',
  );
});

test('Soft Decline allocates only the shortfall and reserves donors for later purchases', () => {
  const history = [purchase({ cents: 2800 })];
  const result = evaluate(defaultPolicy, history, period, 500, 'Food');
  assert.equal(result.status, 'ready');
  assert.deepEqual(result.allocations, { Food: 200, 'Everything else': 300 });
  assert.match(result.warning || '', /\$3.00 from Everything else/);
  const reserved = purchase({ cents: 500, status: 'processing', allocations: result.allocations });
  const totals = usage([...history, reserved], period);
  assert.equal(totals.used.Food, 3000);
  assert.equal(totals.used['Everything else'], 300);
  assert.equal(totals.reserved, 500);
  assert.equal(totals.spent, 2800);
});

test('coverage can use multiple donors but never exceeds the cap or bypasses controls', () => {
  const policy = {
    ...defaultPolicy,
    threshold: 10000,
    limits: { Food: 1000, Groceries: 500, Transport: 8000, 'Everything else': 500 },
  };
  const result = evaluate(policy, [], period, 1800, 'Food');
  assert.deepEqual(result.allocations, { Food: 1000, 'Everything else': 500, Groceries: 300 });
  assert.equal(evaluate(policy, [], period, 2001, 'Food').status, 'approval');
  assert.equal(evaluate({ ...policy, softLimit: 0 }, [], period, 1001, 'Food').status, 'approval');
  assert.equal(evaluate({ ...policy, frozen: true }, [], period, 1800, 'Food').status, 'blocked');
  assert.equal(
    evaluate({ ...policy, threshold: 1500 }, [], period, 1800, 'Food').status,
    'approval',
  );
  assert.equal(evaluate(policy, [], period, 10001, 'Food').status, 'blocked');
  assert.throws(() => validatePolicy({ ...policy, softLimit: 1001 }));
});

test('insufficient donor categories need approval even when released vault money increases total capacity', () => {
  const policy = {
    ...defaultPolicy,
    allowance: 1000,
    walletBonus: 5000,
    limits: { Food: 1000, Groceries: 0, Transport: 0, 'Everything else': 0 },
  };
  assert.equal(evaluate(policy, [], period, 1500, 'Food').status, 'approval');
  const old = purchase({
    cents: 500,
    status: 'processing',
    period: 'old',
    allocations: { Food: 200, Transport: 300 },
  });
  assert.equal(usage([old], period).used.Transport, 300);
  assert.equal(usage([{ ...old, status: 'declined' }], period).reserved, 0);
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
