import type { Budget, Purchase as PurchaseRow } from '@/generated/prisma/client';
import type { Policy, Purchase, Category } from '@/domain/wallet';

export function toPolicy(budget: Budget): Policy {
  return {
    allowance: budget.allowance,
    threshold: budget.threshold,
    frozen: budget.frozen,
    periodDays: budget.periodDays,
    limits: {
      Food: budget.food,
      Groceries: budget.groceries,
      Transport: budget.transport,
      'Everything else': budget.other,
    },
  };
}
export function budgetFields(policy: Policy) {
  return {
    allowance: policy.allowance,
    threshold: policy.threshold,
    frozen: policy.frozen,
    periodDays: policy.periodDays,
    food: policy.limits.Food,
    groceries: policy.limits.Groceries,
    transport: policy.limits.Transport,
    other: policy.limits['Everything else'],
  };
}
export function toPurchase(row: PurchaseRow): Purchase {
  return {
    id: row.id,
    childId: row.childId,
    key: row.key,
    productId: row.productId,
    name: row.name,
    cents: row.cents,
    category: row.category as Category,
    explanation: row.explanation,
    source: row.source,
    status: row.status,
    reason: row.reason,
    createdAt: row.createdAt.toISOString(),
    period: row.period.toISOString(),
    attemptedAt: row.attemptedAt?.toISOString(),
    parentApproved: row.parentApproved,
    orderId: row.orderId ?? undefined,
    captureId: row.captureId ?? undefined,
    error: row.error ?? undefined,
  };
}
