import type { Identity } from '@/server/auth/session';
import { familyTransaction } from '@/server/db/transactions';
import { HttpError } from '@/server/http/errors';
import { ownedChild } from './children';
import { currentBudget } from './budgets';

export function changeVault(
  identity: Identity,
  childId: string,
  input: { enabled: boolean } | { cents: number },
) {
  if (identity.role !== 'parent') throw new HttpError('Only parents can manage the vault.', 403);
  return familyTransaction(identity.parentId, async (tx) => {
    const child = await ownedChild(identity, childId, tx);
    if (!child.joinedAt) throw new HttpError('Your child needs to join before using the vault.');
    const budget = await currentBudget(tx, child.budget);
    if ('enabled' in input) {
      await tx.budget.update({ where: { childId }, data: { vaultEnabled: input.enabled } });
    } else {
      if (
        !Number.isSafeInteger(input.cents) ||
        input.cents <= 0 ||
        input.cents > budget.vaultBalance
      )
        throw new HttpError('Enter an amount within the vault balance.');
      if (budget.walletBonus + input.cents > 2147483647)
        throw new HttpError('This release exceeds the wallet limit.');
      await tx.budget.update({
        where: { childId },
        data: { vaultBalance: { decrement: input.cents }, walletBonus: { increment: input.cents } },
      });
    }
    return { ok: true };
  });
}
