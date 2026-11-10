import { defaultPolicy, usage } from '@/domain/wallet';
import type { Identity } from '@/server/auth/session';
import { familyTransaction } from '@/server/db/transactions';
import { toPolicy, toPurchase } from '@/server/db/mappers';
import { currentBudget } from './budgets';
import { ownedChild } from './children';
import { spendingForecast } from '@/domain/forecast';

export function dashboard(identity: Identity, childId?: string) {
  return familyTransaction(identity.parentId, async (tx) => {
    const parent = await tx.parent.findUniqueOrThrow({ where: { id: identity.parentId } });
    const children = await tx.child.findMany({
      where: {
        parentId: parent.id,
        ...(identity.role === 'child' ? { id: identity.childId } : {}),
      },
      include: {
        budget: true,
        invitation: true,
        _count: { select: { purchases: { where: { status: 'approval' } } } },
      },
      orderBy: { createdAt: 'asc' },
    });
    const selectedId = childId || (identity.role === 'child' ? identity.childId : undefined);
    const summaries = await Promise.all(
      children.map(async (child) => {
        const current = await currentBudget(tx, child.budget!);
        const records = await tx.purchase.findMany({
          where: {
            childId: child.id,
            OR: [{ period: current.periodStart }, { status: 'processing' }],
          },
        });
        const totals = usage(records.map(toPurchase), current.periodStart.toISOString());
        return {
          ...(identity.role === 'parent'
            ? { vault: { enabled: current.vaultEnabled, balance: current.vaultBalance } }
            : {}),
          spent: totals.spent,
          reserved: totals.reserved,
          remaining: Math.max(
            0,
            current.allowance + current.walletBonus - totals.spent - totals.reserved,
          ),
          renewsAt: new Date(
            current.periodStart.getTime() + current.periodDays * 86400000,
          ).toISOString(),
          periodDays: current.periodDays,
        };
      }),
    );
    const selected = selectedId ? await ownedChild(identity, selectedId, tx) : null;
    const budget = selected ? await currentBudget(tx, selected.budget) : null;
    const purchases = selected
      ? (
          await tx.purchase.findMany({
            where: { childId: selected.id },
            orderBy: { createdAt: 'desc' },
          })
        ).map(toPurchase)
      : [];
    const period = budget?.periodStart.toISOString() || new Date().toISOString();
    return {
      initialized: true,
      role: identity.role,
      parentName: parent.name,
      childId: selected?.id || null,
      childName: selected?.name || '',
      policy: budget ? toPolicy(budget) : defaultPolicy,
      ...(identity.role === 'parent' && budget
        ? { vault: { enabled: budget.vaultEnabled, balance: budget.vaultBalance } }
        : {}),
      period,
      renewsAt: new Date(Date.parse(period) + (budget?.periodDays || 7) * 86400000).toISOString(),
      children: children.map((c, index) => ({
        ...summaries[index],
        id: c.id,
        name: c.name,
        username: c.username || undefined,
        joined: !!c.joinedAt,
        invitationStatus: c.joinedAt
          ? 'joined'
          : !c.invitation
            ? 'not-invited'
            : c.invitation.expiresAt > new Date()
              ? 'pending'
              : 'expired',
        expiresAt: c.invitation?.expiresAt.getTime(),
        allowance: c.budget!.allowance,
        frozen: c.budget!.frozen,
        requests: c._count.purchases,
      })),
      purchases,
      ...(budget
        ? { forecast: spendingForecast(toPolicy(budget), purchases, period, Date.now()) }
        : {}),
      ...usage(purchases, period),
      connected: !!(await tx.payPalConnection.findUnique({ where: { parentId: parent.id } })),
      ai: !!process.env.OPENAI_API_KEY,
    };
  });
}
