import test from 'node:test';
import assert from 'node:assert/strict';
import { spendingForecast, forecastBalanceAt } from '../../src/domain/forecast';
import { defaultPolicy, type Purchase } from '../../src/domain/wallet';

const day = 86400000;
const period = '2026-11-09T00:00:00.000Z';
const start = Date.parse(period);
const iso = (days: number) => new Date(start + days * day).toISOString();
const purchase = (cents: number, days: number, overrides: Partial<Purchase> = {}): Purchase => ({
  id: `purchase-${days}`,
  childId: 'teen',
  key: `key-${days}`,
  productId: 'lunch',
  name: 'Lunch',
  cents,
  category: 'Food',
  explanation: '',
  source: 'Shop catalog',
  status: 'paid',
  reason: '',
  period,
  createdAt: iso(days),
  attemptedAt: iso(days),
  ...overrides,
});

test('burn rate predicts depletion before renewal from confirmed spending and elapsed time', () => {
  const result = spendingForecast(
    defaultPolicy,
    [purchase(3000, 0.5), purchase(3000, 1.5)],
    period,
    start + 2 * day,
  );
  assert.equal(result.status, 'at-risk');
  assert.equal(result.availableCents, 4000);
  assert.equal(result.dailyRateCents, 3000);
  assert.equal(result.dailyGuideCents, 800);
  assert.equal(result.runsOutAt, '2026-11-12T08:00:00.000Z');
  assert.equal(result.projectedEndCents, 0);
  assert.equal(result.projected.at(-1)?.at, iso(7));
  assert.ok(result.projected.every((point) => point.cents >= 0));
});

test('an affordable pace stops at renewal and never predicts beyond a renewed allowance', () => {
  const result = spendingForecast(
    defaultPolicy,
    [purchase(500, 0.5), purchase(500, 1.5)],
    period,
    start + 2 * day,
  );
  assert.equal(result.status, 'on-track');
  assert.equal(result.dailyRateCents, 500);
  assert.equal(result.projectedEndCents, 6500);
  assert.equal(result.runsOutAt, null);
  assert.equal(forecastBalanceAt(result, start + 8 * day), null);
});

test('pending reservations reduce availability but not the rate; old paid and unapproved purchases are excluded', () => {
  const paid = [purchase(500, 0.5), purchase(500, 1.5)];
  const other = ['approval', 'ready', 'blocked', 'declined'].map((status) =>
    purchase(9900, 1, { status: status as Purchase['status'] }),
  );
  const result = spendingForecast(
    defaultPolicy,
    [
      ...paid,
      ...other,
      purchase(4000, -1, { period: 'previous', status: 'processing' }),
      purchase(9000, -2, { period: 'previous' }),
    ],
    period,
    start + 2 * day,
  );
  assert.equal(result.availableCents, 5000);
  assert.equal(result.spentCents, 1000);
  assert.equal(result.reservedCents, 4000);
  assert.equal(result.dailyRateCents, 500);
  assert.equal(result.paidCount, 2);
  assert.equal(result.recorded.at(-1)?.cents, 5000);
  assert.equal(forecastBalanceAt(result, start), 6000);
});

test('new accounts and sparse history show recorded data without invented projections', () => {
  const fresh = spendingForecast(defaultPolicy, [], period, start + 0.5 * day);
  assert.equal(fresh.status, 'no-spending');
  const one = spendingForecast(defaultPolicy, [purchase(3000, 0.5)], period, start + 2 * day);
  assert.equal(one.status, 'building-history');
  assert.equal(one.dailyRateCents, null);
  assert.equal(one.projectedEndCents, null);
  assert.equal(one.projected.length, 0);
  assert.equal(forecastBalanceAt(one, start + 3 * day), null);
  const early = spendingForecast(
    defaultPolicy,
    [purchase(100, 0.1), purchase(100, 0.2)],
    period,
    start + 0.5 * day,
  );
  assert.equal(early.status, 'building-history');
  assert.equal(early.minimumHours, 24);
});

test('daily allowances use a six-hour minimum and monthly periods retain exact duration', () => {
  const paid = [purchase(100, 0.1), purchase(100, 0.2)];
  const daily = spendingForecast(
    { ...defaultPolicy, periodDays: 1 },
    paid,
    period,
    start + 0.25 * day,
  );
  assert.equal(daily.status, 'on-track');
  assert.equal(daily.minimumHours, 6);
  assert.equal(daily.dailyRateCents, 800);
  assert.equal(daily.renewsAt, iso(1));
  const tooEarly = spendingForecast(
    { ...defaultPolicy, periodDays: 1 },
    paid,
    period,
    start + 0.24 * day,
  );
  assert.equal(tooEarly.status, 'building-history');
  const monthly = spendingForecast(
    { ...defaultPolicy, periodDays: 30 },
    paid,
    period,
    start + 2 * day,
  );
  assert.equal(monthly.renewsAt, iso(30));
});

test('paused spending, exhausted budgets, reserved balances, and delayed renewals have distinct states', () => {
  assert.equal(
    spendingForecast({ ...defaultPolicy, frozen: true }, [], period, start + day).status,
    'paused',
  );
  assert.equal(
    spendingForecast(defaultPolicy, [purchase(10000, 0.5)], period, start + day).status,
    'exhausted',
  );
  const reserved = spendingForecast(
    defaultPolicy,
    [purchase(10000, 0.5, { status: 'processing' })],
    period,
    start + day,
  );
  assert.equal(reserved.status, 'reserved');
  assert.equal(reserved.dailyRateCents, null);
  const delayed = spendingForecast(
    defaultPolicy,
    [purchase(100, 1, { status: 'processing' })],
    period,
    start + 8 * day,
  );
  assert.equal(delayed.status, 'renewal-pending');
  assert.equal(delayed.projected.length, 0);
  assert.equal(delayed.recorded.at(-1)?.at, iso(8));
});

test('released budget increases capacity without increasing observed spending or double-counting Soft Decline', () => {
  const covered = purchase(1200, 0.5, {
    allocations: { Food: 1000, 'Everything else': 200 },
    warning: 'Covered',
  });
  const result = spendingForecast(
    { ...defaultPolicy, walletBonus: 2000 },
    [covered, purchase(800, 1.5)],
    period,
    start + 2 * day,
  );
  assert.equal(result.capacityCents, 12000);
  assert.equal(result.spentCents, 2000);
  assert.equal(result.availableCents, 10000);
  assert.equal(result.dailyRateCents, 1000);
});

test('the timeline inspector holds recorded balances between events and interpolates future estimates', () => {
  const result = spendingForecast(
    defaultPolicy,
    [purchase(3000, 0.5), purchase(3000, 1.5)],
    period,
    start + 2 * day,
  );
  assert.equal(forecastBalanceAt(result, start + 0.25 * day), 10000);
  assert.equal(forecastBalanceAt(result, start + day), 7000);
  assert.equal(forecastBalanceAt(result, start + 1.5 * day), 4000);
  assert.equal(forecastBalanceAt(result, start + 3 * day), 1000);
  assert.equal(forecastBalanceAt(result, start + 5 * day), 0);
  assert.equal(forecastBalanceAt(result, start - day), null);
});

test('exact renewal depletion is on track; invalid or future period starts do not produce projections', () => {
  const exact = spendingForecast(
    defaultPolicy,
    [purchase(1000, 0.25), purchase(1000, 0.75)],
    period,
    start + 1.4 * day,
  );
  assert.equal(exact.status, 'on-track');
  assert.equal(exact.projectedEndCents, 0);
  assert.equal(exact.runsOutAt, null);
  assert.equal(
    spendingForecast(defaultPolicy, [], 'not-a-date', start + day).status,
    'unavailable',
  );
  assert.equal(spendingForecast(defaultPolicy, [], iso(3), start + day).status, 'unavailable');
});
