import {
  defaultPolicy,
  evaluate,
  products,
  usage,
  type Purchase,
  type Role,
} from '@/domain/wallet';
import { spendingForecast } from '@/domain/forecast';
import type { Snapshot } from '@/features/dashboard/types';

const period = '2026-11-09T12:00:00.000Z';
const now = Date.parse(period) + 2 * 86400000;
const policy = {
  ...defaultPolicy,
  limits: { Food: 1000, Groceries: 2000, Transport: 2000, 'Everything else': 5000 },
};
function samplePurchase(productId: string, createdAt: string): Purchase {
  const product = products.find((p) => p.id === productId)!;
  return {
    id: `sample-${productId}`,
    childId: 'sample-teen',
    key: `sample-${productId}`,
    productId,
    name: product.name,
    cents: product.cents,
    category: product.category,
    explanation: 'Illustrative sample data, not a live transaction or AI result.',
    source: 'Illustrative sample',
    createdAt,
    attemptedAt: createdAt,
    period,
    status: 'paid',
    reason: 'Simulated sample purchase.',
  };
}
const history = [
  samplePurchase('groceries', '2026-11-10T00:00:00.000Z'),
  samplePurchase('bus', '2026-11-11T00:00:00.000Z'),
];

export function sampleCheckout(complete = false): Purchase {
  const lunch = samplePurchase('lunch', new Date(now).toISOString());
  const decision = evaluate(policy, history, period, lunch.cents, lunch.category);
  return {
    ...lunch,
    ...decision,
    status: complete ? 'paid' : decision.status,
    reason: complete ? 'Illustrative checkout complete. No payment was sent.' : decision.reason,
    receipt: {
      merchant: { name: 'Pocket Deli', type: 'Prepared meals' },
      currency: 'USD',
      items: [
        {
          id: 'sample-lunch',
          name: 'Lunch meal',
          description: 'Illustrative sandwich, fruit, and drink',
          quantity: 1,
          unitCents: lunch.cents,
        },
      ],
    },
  };
}

export function sampleDashboard(role: Role, complete = false): Snapshot {
  const request = {
    ...samplePurchase('game', '2026-11-11T11:00:00.000Z'),
    status: 'approval' as const,
    attemptedAt: undefined,
    reason: 'Above the parent approval threshold.',
  };
  const purchases = [...(complete ? [sampleCheckout(true)] : []), request, ...history];
  const totals = usage(purchases, period);
  const remaining = policy.allowance - totals.spent - totals.reserved;
  const renewsAt = '2026-11-16T12:00:00.000Z';
  return structuredClone({
    initialized: true,
    role,
    parentName: 'Alex',
    childId: 'sample-teen',
    childName: 'Maya',
    policy,
    ...(role === 'parent' ? { vault: { enabled: true, balance: 5000 } } : {}),
    period,
    renewsAt,
    children: [
      {
        id: 'sample-teen',
        name: 'Maya',
        username: 'maya_sample',
        joined: true,
        invitationStatus: 'joined',
        allowance: policy.allowance,
        frozen: false,
        requests: 1,
        spent: totals.spent,
        reserved: totals.reserved,
        remaining,
        renewsAt,
        periodDays: 7,
      },
    ],
    purchases,
    ...totals,
    connected: false,
    ai: false,
    forecast: spendingForecast(policy, purchases, period, now),
  });
}
