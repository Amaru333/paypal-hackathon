export const categories = ['Food', 'Groceries', 'Transport', 'Everything else'] as const;
export type Category = (typeof categories)[number];
export type Role = 'parent' | 'child';
export type Policy = {
  allowance: number;
  walletBonus?: number;
  softLimit?: number;
  threshold: number;
  limits: Record<Category, number>;
  frozen: boolean;
  periodDays: number;
};
export type Purchase = {
  private?: false;
  id: string;
  childId: string;
  key: string;
  productId: string;
  name: string;
  cents: number;
  category: Category;
  explanation: string;
  source: string;
  createdAt: string;
  attemptedAt?: string;
  period: string;
  status: 'approval' | 'ready' | 'processing' | 'paid' | 'declined' | 'blocked';
  reason: string;
  orderId?: string;
  captureId?: string;
  error?: string;
  parentApproved?: boolean;
  allocations?: Partial<Record<Category, number>>;
  warning?: string;
  receipt?: MerchantReceipt;
  classification?: ReceiptClassification;
};
export const products: {
  id: string;
  name: string;
  description: string;
  cents: number;
  category: Category;
  icon: string;
  color: string;
}[] = [
  {
    id: 'lunch',
    name: 'Lunch break',
    description: 'A fresh sandwich, fruit, and a drink.',
    cents: 1200,
    category: 'Food',
    icon: '🥪',
    color: '#f9e9cd',
  },
  {
    id: 'bus',
    name: 'A ride across town',
    description: 'One local bus day pass.',
    cents: 500,
    category: 'Transport',
    icon: '🚌',
    color: '#dcebe6',
  },
  {
    id: 'groceries',
    name: 'The snack restock',
    description: 'Apples, yogurt, and granola for the week.',
    cents: 1800,
    category: 'Groceries',
    icon: '🍎',
    color: '#efe2e3',
  },
  {
    id: 'game',
    name: 'Next-level adventures',
    description: 'A new video game for the weekend.',
    cents: 4500,
    category: 'Everything else',
    icon: '🎮',
    color: '#e6e2f6',
  },
  {
    id: 'book',
    name: 'One more chapter',
    description: 'An illustrated adventure paperback.',
    cents: 1400,
    category: 'Everything else',
    icon: '📚',
    color: '#e0e8f4',
  },
  {
    id: 'test',
    name: 'The $1 test purchase',
    description: 'Try a real PayPal sandbox payment.',
    cents: 100,
    category: 'Everything else',
    icon: '✦',
    color: '#e8eeca',
  },
];
export const defaultPolicy: Policy = {
  allowance: 10000,
  softLimit: 1000,
  threshold: 2500,
  periodDays: 7,
  frozen: false,
  limits: { Food: 3000, Groceries: 2000, Transport: 2000, 'Everything else': 3000 },
};
export function usage(purchases: Purchase[], period: string) {
  const used = Object.fromEntries(categories.map((c) => [c, 0])) as Record<Category, number>;
  let spent = 0,
    reserved = 0;
  for (const p of purchases) {
    if (p.period !== period && p.status !== 'processing') continue;
    if (p.status === 'paid' || p.status === 'processing') {
      if (p.allocations && Object.keys(p.allocations).length) {
        for (const category of categories) used[category] += p.allocations[category] || 0;
      } else used[p.category] += p.cents;
      if (p.status === 'paid') spent += p.cents;
      else reserved += p.cents;
    }
  }
  return { used, spent, reserved };
}
export function evaluate(
  policy: Policy,
  purchases: Purchase[],
  period: string,
  cents: number,
  category: Category,
  approved = false,
) {
  const totals = usage(purchases, period);
  if (policy.frozen)
    return { status: 'blocked' as const, reason: 'Spending is paused by your parent.' };
  if (totals.spent + totals.reserved + cents > policy.allowance + (policy.walletBonus || 0))
    return {
      status: 'blocked' as const,
      reason: 'This would exceed the total allowance. Your parent can update the budget.',
    };
  if (!approved && cents > policy.threshold)
    return { status: 'approval' as const, reason: 'This purchase is above the approval limit.' };
  const available = Math.max(0, policy.limits[category] - totals.used[category]);
  const shortfall = Math.max(0, cents - available);
  const allocations: Partial<Record<Category, number>> = { [category]: cents };
  if (!approved && shortfall) {
    if (shortfall > (policy.softLimit ?? 1000))
      return {
        status: 'approval' as const,
        reason: `This needs an exception to the ${category.toLowerCase()} budget.`,
      };
    allocations[category] = cents - shortfall;
    let needed = shortfall;
    const donors: string[] = [];
    // Use discretionary money first. Vault savings are never available here.
    for (const donor of ['Everything else', 'Groceries', 'Transport', 'Food'] as Category[]) {
      if (donor === category) continue;
      const take = Math.min(needed, Math.max(0, policy.limits[donor] - totals.used[donor]));
      if (take) {
        allocations[donor] = take;
        donors.push(`$${(take / 100).toFixed(2)} from ${donor}`);
        needed -= take;
      }
    }
    if (needed)
      return {
        status: 'approval' as const,
        reason: 'Not enough unspent category budget to cover this shortfall. Ask your parent.',
      };
    const warning = `Soft Decline: ${category} was $${(shortfall / 100).toFixed(2)} short. Covered by ${donors.join(' and ')}. You have less to spend in those categories this period.`;
    return {
      status: 'ready' as const,
      reason: 'Category shortfall covered within your allowance.',
      allocations,
      warning,
    };
  }
  return {
    status: 'ready' as const,
    allocations,
    warning: '',
    reason: approved
      ? 'Your parent approved this purchase.'
      : 'Within your allowance and category budget.',
  };
}
export function validatePolicy(value: unknown): Policy {
  const v = value as Policy;
  const cents = (n: unknown) =>
    typeof n === 'number' && Number.isSafeInteger(n) && n >= 0 && n <= 100000;
  if (
    !v ||
    !cents(v.allowance) ||
    v.allowance < 100 ||
    !cents(v.threshold) ||
    (v.softLimit !== undefined && (!cents(v.softLimit) || v.softLimit > 1000)) ||
    typeof v.frozen !== 'boolean' ||
    ![1, 7, 30].includes(v.periodDays) ||
    !v.limits ||
    categories.some((c) => !cents(v.limits[c])) ||
    categories.reduce((s, c) => s + v.limits[c], 0) !== v.allowance
  ) {
    throw new Error(
      'Category budgets must add up to the allowance. Use whole cents, up to $1,000, and a daily, weekly, or 30-day period.',
    );
  }
  return {
    allowance: v.allowance,
    softLimit: v.softLimit ?? 1000,
    threshold: v.threshold,
    frozen: v.frozen,
    periodDays: v.periodDays,
    limits: Object.fromEntries(categories.map((c) => [c, v.limits[c]])) as Record<Category, number>,
  };
}
import type { MerchantReceipt, ReceiptClassification } from './receipt';
