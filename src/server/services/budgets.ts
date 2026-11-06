import { validatePolicy } from '@/domain/wallet';
import type { Identity } from '@/server/auth/session';
import { budgetFields, toPolicy } from '@/server/db/mappers';
import { familyTransaction, type Transaction } from '@/server/db/transactions';
import { ownedChild } from './children';
import { HttpError } from '@/server/http/errors';
import type { Budget } from '@/generated/prisma/client';

export async function currentBudget(tx: Transaction, budget: Budget) {
  const periodMs = budget.periodDays * 86400000;
  const elapsed = Date.now() - budget.periodStart.getTime();
  if (elapsed < periodMs) return budget;
  return tx.budget.update({
    where: { childId: budget.childId },
    data: {
      periodStart: new Date(
        budget.periodStart.getTime() + Math.floor(elapsed / periodMs) * periodMs,
      ),
    },
  });
}
export function updateBudget(identity: Identity, childId: string, input: unknown) {
  let policy;
  try {
    policy = validatePolicy(input);
  } catch (error) {
    throw new HttpError((error as Error).message);
  }
  return familyTransaction(identity.parentId, async (tx) => {
    await ownedChild(identity, childId, tx);
    await tx.budget.update({ where: { childId }, data: budgetFields(policy) });
    return { ok: true };
  });
}
export function freezeBudget(identity: Identity, childId: string, frozen: boolean) {
  return familyTransaction(identity.parentId, async (tx) => {
    await ownedChild(identity, childId, tx);
    await tx.budget.update({ where: { childId }, data: { frozen } });
    return { ok: true };
  });
}
export async function readPolicy(identity: Identity, childId: string) {
  return toPolicy((await ownedChild(identity, childId)).budget);
}
