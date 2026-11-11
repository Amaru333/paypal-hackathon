import type { Snapshot } from '@/features/dashboard/types';
import { categories } from './wallet';
import type { AnalysisCard } from './assistant';

export function analysisCard(
  data: Pick<
    Snapshot,
    | 'childId'
    | 'childName'
    | 'privacy'
    | 'spent'
    | 'reserved'
    | 'policy'
    | 'renewsAt'
    | 'purchases'
    | 'period'
    | 'used'
    | 'forecast'
  >,
): AnalysisCard {
  const result: AnalysisCard = {
    type: 'analysis',
    childId: data.childId!,
    childName: data.childName,
    private: !!data.privacy?.enabled,
    spent: data.spent,
    reserved: data.reserved,
    remaining: Math.max(
      0,
      data.policy.allowance + (data.policy.walletBonus || 0) - data.spent - data.reserved,
    ),
    allowance: data.policy.allowance + (data.policy.walletBonus || 0),
    renewsAt: data.renewsAt,
  };
  // A second explicit privacy gate also protects callers that accidentally supply a full snapshot.
  if (result.private) return result;
  result.categories = categories.map((name) => ({ name, cents: data.used?.[name] || 0 }));
  const daily = new Map<string, number>();
  const purchases = new Map<string, { cents: number; count: number }>();
  for (const p of data.purchases.filter((p) => p.status === 'paid' && p.period === data.period)) {
    const date = (p.attemptedAt || p.createdAt).slice(0, 10);
    daily.set(date, (daily.get(date) || 0) + p.cents);
    const group = purchases.get(p.name) || { cents: 0, count: 0 };
    purchases.set(p.name, { cents: group.cents + p.cents, count: group.count + 1 });
  }
  result.daily = Array.from(daily, ([date, cents]) => ({ date, cents })).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  result.purchases = Array.from(purchases, ([name, value]) => ({ name, ...value }))
    .sort((a, b) => b.cents - a.cents)
    .slice(0, 6);
  if (data.forecast) {
    const { status, dailyRateCents, projectedEndCents, runsOutAt } = data.forecast;
    result.forecast = { status, dailyRateCents, projectedEndCents, runsOutAt };
  }
  return result;
}
