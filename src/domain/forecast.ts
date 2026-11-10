import { usage, type Policy, type Purchase } from './wallet';

const day = 86400000;
export type BalancePoint = { at: string; cents: number };
export type SpendingForecast = {
  status:
    | 'unavailable'
    | 'renewal-pending'
    | 'paused'
    | 'exhausted'
    | 'reserved'
    | 'no-spending'
    | 'building-history'
    | 'at-risk'
    | 'on-track';
  asOf: string;
  startsAt: string;
  renewsAt: string;
  capacityCents: number;
  availableCents: number;
  spentCents: number;
  reservedCents: number;
  paidCount: number;
  elapsedDays: number;
  minimumHours: number;
  dailyRateCents: number | null;
  dailyGuideCents: number | null;
  projectedEndCents: number | null;
  runsOutAt: string | null;
  recorded: BalancePoint[];
  projected: BalancePoint[];
};

export function spendingForecast(
  policy: Policy,
  purchases: Purchase[],
  period: string,
  now: number,
): SpendingForecast {
  const start = Date.parse(period);
  const end = start + policy.periodDays * day;
  const totals = usage(purchases, period);
  const capacity = policy.allowance + (policy.walletBonus || 0);
  const available = Math.max(0, capacity - totals.spent - totals.reserved);
  const paid = purchases.filter((p) => p.period === period && p.status === 'paid');
  const elapsedDays = Number.isFinite(start) ? Math.max(0, (now - start) / day) : 0;
  const minimumHours = policy.periodDays === 1 ? 6 : 24;
  const result: SpendingForecast = {
    status: 'unavailable',
    asOf: new Date(now).toISOString(),
    startsAt: period,
    renewsAt: Number.isFinite(end) ? new Date(end).toISOString() : period,
    capacityCents: capacity,
    availableCents: available,
    spentCents: totals.spent,
    reservedCents: totals.reserved,
    paidCount: paid.length,
    elapsedDays,
    minimumHours,
    dailyRateCents: null,
    dailyGuideCents: null,
    projectedEndCents: null,
    runsOutAt: null,
    recorded: [],
    projected: [],
  };
  if (!Number.isFinite(start) || !Number.isFinite(end) || now < start || end <= start)
    return result;

  // Reconstruct against today's capacity. Policy changes and releases have no timestamp ledger.
  const events = purchases
    .filter((p) => (p.period === period && p.status === 'paid') || p.status === 'processing')
    .map((p) => {
      const timestamp = Date.parse(p.attemptedAt || p.createdAt);
      return {
        at: Number.isFinite(timestamp) ? Math.max(start, Math.min(now, timestamp)) : now,
        cents: p.cents,
      };
    })
    .sort((a, b) => a.at - b.at);
  let balance = capacity;
  result.recorded.push({ at: new Date(start).toISOString(), cents: balance });
  for (const event of events) {
    result.recorded.push({ at: new Date(event.at).toISOString(), cents: Math.max(0, balance) });
    balance -= event.cents;
    result.recorded.push({ at: new Date(event.at).toISOString(), cents: Math.max(0, balance) });
  }
  result.recorded.push({ at: result.asOf, cents: available });
  if (now >= end) {
    result.status = 'renewal-pending';
    return result;
  }
  if (policy.frozen) {
    result.status = 'paused';
    return result;
  }
  if (available === 0) {
    result.status = totals.reserved > 0 && totals.spent < capacity ? 'reserved' : 'exhausted';
    return result;
  }
  const daysLeft = (end - now) / day;
  result.dailyGuideCents = Math.floor(Math.min(available, available / daysLeft));
  if (paid.length === 0) {
    result.status = 'no-spending';
    return result;
  }
  if (paid.length < 2 || elapsedDays * 24 < minimumHours) {
    result.status = 'building-history';
    return result;
  }

  const rate = totals.spent / elapsedDays;
  result.dailyRateCents = rate;
  result.projectedEndCents = Math.max(0, Math.round(available - rate * daysLeft));
  result.projected.push({ at: result.asOf, cents: available });
  const depletion = now + (available / rate) * day;
  if (depletion < end) {
    result.status = 'at-risk';
    result.runsOutAt = new Date(depletion).toISOString();
    result.projected.push({ at: result.runsOutAt, cents: 0 });
  } else result.status = 'on-track';
  result.projected.push({ at: result.renewsAt, cents: result.projectedEndCents });
  return result;
}

export function forecastBalanceAt(forecast: SpendingForecast, time: number): number | null {
  const now = Date.parse(forecast.asOf);
  if (time <= now) {
    let balance: number | null = null;
    for (const point of forecast.recorded) {
      if (Date.parse(point.at) <= time) balance = point.cents;
      else break;
    }
    return balance;
  }
  if (forecast.dailyRateCents === null || time > Date.parse(forecast.renewsAt)) return null;
  return Math.max(
    0,
    Math.round(forecast.availableCents - (forecast.dailyRateCents * (time - now)) / day),
  );
}
