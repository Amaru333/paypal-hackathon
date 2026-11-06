import { defaultPolicy, usage } from '@/domain/wallet';
import type { Identity } from '@/server/auth/session';
import { familyTransaction } from '@/server/db/transactions';
import { toPolicy, toPurchase } from '@/server/db/mappers';
import { currentBudget } from './budgets';
import { ownedChild } from './children';

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
    const selectedId = childId || children[0]?.id;
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
      period,
      renewsAt: new Date(Date.parse(period) + (budget?.periodDays || 7) * 86400000).toISOString(),
      children: children.map((c) => ({
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
      ...usage(purchases, period),
      connected: !!(await tx.payPalConnection.findUnique({ where: { parentId: parent.id } })),
      ai: !!process.env.OPENAI_API_KEY,
    };
  });
}
