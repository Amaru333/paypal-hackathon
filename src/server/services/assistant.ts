import { createHash } from 'node:crypto';
import type { Identity } from '@/server/auth/session';
import { HttpError } from '@/server/http/errors';
import { familyTransaction } from '@/server/db/transactions';
import { budgetFields, toPolicy } from '@/server/db/mappers';
import type { Budget, Prisma } from '@/generated/prisma/client';
import { ownedChild } from './children';
import { currentBudget } from './budgets';
import { dashboard } from './dashboard';
import {
  assistantCommand,
  visibilityKey,
  type ActionCard,
  type AssistantCommand,
  type AssistantCard,
} from '@/domain/assistant';
import { validatePolicy } from '@/domain/wallet';
import { analysisCard } from '@/domain/assistant-analysis';

function parentOnly(identity: Identity) {
  if (identity.role !== 'parent')
    throw new HttpError('The family assistant is only available to parents.', 403);
}
function baseline(budget: Budget) {
  return createHash('sha256')
    .update(
      JSON.stringify([
        budget.periodStart.toISOString(),
        toPolicy(budget),
        budget.vaultEnabled,
        budget.vaultBalance,
      ]),
    )
    .digest('hex');
}
export async function assistantFamily(identity: Identity) {
  parentOnly(identity);
  const data = await dashboard(identity);
  return {
    visibilityKey: visibilityKey(data.children),
    children: data.children.map((c) => ({
      id: c.id,
      name: c.name,
      private: !!c.privacy.enabled,
      spent: c.spent,
      reserved: c.reserved,
      remaining: c.remaining,
      allowance: c.allowance,
      frozen: c.frozen,
      requests: c.requests,
    })),
  };
}
export async function readAssistantCard(
  identity: Identity,
  childId: string,
  kind: 'analysis' | 'budget' | 'requests',
): Promise<AssistantCard> {
  parentOnly(identity);
  const data = await dashboard(identity, childId);
  if (kind === 'analysis') return analysisCard(data);
  if (kind === 'budget')
    return {
      type: 'budget',
      childId,
      childName: data.childName,
      policy: data.policy,
      vaultBalance: data.vault?.balance || 0,
    };
  const requests =
    data.privateRequests ||
    data.purchases
      .filter((p) => p.status === 'approval' || p.status === 'processing')
      .map((p) => ({ id: p.id, cents: p.cents, status: p.status, reason: p.reason }));
  return { type: 'requests', childId, childName: data.childName, requests };
}
export async function proposeAssistantAction(
  identity: Identity,
  input: unknown,
): Promise<ActionCard> {
  parentOnly(identity);
  const command = assistantCommand.parse(input);
  return familyTransaction(identity.parentId, async (tx) => {
    const child = await ownedChild(identity, command.childId, tx);
    if (!child.joinedAt)
      throw new HttpError('Your child needs to join before changing spending controls.');
    const budget = await currentBudget(tx, child.budget);
    validateCommand(command, budget);
    const pending = await tx.assistantAction.count({
      where: { parentId: identity.parentId, status: 'pending', expiresAt: { gt: new Date() } },
    });
    if (pending >= 30)
      throw new HttpError('Review or cancel existing proposals before creating more.', 429);
    const expiresAt = new Date(Date.now() + 10 * 60000);
    const action = await tx.assistantAction.create({
      data: {
        parentId: identity.parentId,
        childId: child.id,
        command: command as Prisma.InputJsonValue,
        baseline: baseline(budget),
        expiresAt,
      },
    });
    return {
      type: 'action',
      id: action.id,
      childId: child.id,
      childName: child.name,
      command,
      before: toPolicy(budget),
      vaultBalance: budget.vaultBalance,
      expiresAt: expiresAt.toISOString(),
    };
  });
}
function validateCommand(command: AssistantCommand, budget: Budget) {
  if (command.kind === 'budget') {
    try {
      validatePolicy({ ...command.policy, frozen: budget.frozen });
    } catch (error) {
      throw new HttpError((error as Error).message);
    }
  }
  if (
    (command.kind === 'top_up' || command.kind === 'release_vault') &&
    budget.walletBonus + command.cents > 1000000
  )
    throw new HttpError('Extra budget is limited to $10,000 per period.');
  if (command.kind === 'release_vault' && command.cents > budget.vaultBalance)
    throw new HttpError('The vault does not have enough saved budget for this release.');
}
export async function decideAssistantAction(
  identity: Identity,
  id: string,
  decision: 'confirm' | 'cancel',
) {
  parentOnly(identity);
  return familyTransaction(identity.parentId, async (tx) => {
    const action = await tx.assistantAction.findFirst({
      where: { id, parentId: identity.parentId },
    });
    if (!action) throw new HttpError('Proposal not found.', 404);
    if (action.status === 'applied') return { status: 'applied' as const, alreadyApplied: true };
    if (action.status !== 'pending') throw new HttpError('This proposal was cancelled.', 409);
    if (decision === 'cancel') {
      await tx.assistantAction.update({ where: { id }, data: { status: 'cancelled' } });
      return { status: 'cancelled' as const };
    }
    if (action.expiresAt.getTime() <= Date.now())
      throw new HttpError('This proposal expired. Create a fresh one.', 409);
    const child = await ownedChild(identity, action.childId, tx);
    const budget = await currentBudget(tx, child.budget);
    if (baseline(budget) !== action.baseline)
      throw new HttpError(
        'Budget settings changed. Create a fresh proposal before applying it.',
        409,
      );
    const command = assistantCommand.parse(action.command);
    validateCommand(command, budget);
    if (command.kind === 'budget')
      await tx.budget.update({
        where: { childId: child.id },
        data: budgetFields(validatePolicy({ ...command.policy, frozen: budget.frozen })),
      });
    if (command.kind === 'freeze')
      await tx.budget.update({ where: { childId: child.id }, data: { frozen: command.frozen } });
    if (command.kind === 'top_up')
      await tx.budget.update({
        where: { childId: child.id },
        data: { walletBonus: { increment: command.cents } },
      });
    if (command.kind === 'release_vault')
      await tx.budget.update({
        where: { childId: child.id },
        data: {
          walletBonus: { increment: command.cents },
          vaultBalance: { decrement: command.cents },
        },
      });
    await tx.assistantAction.update({
      where: { id },
      data: { status: 'applied', appliedAt: new Date() },
    });
    return { status: 'applied' as const, alreadyApplied: false };
  });
}

export async function readAssistantFamilyCard(identity: Identity) {
  const family = await assistantFamily(identity);
  return { type: 'family' as const, childName: 'Whole family' as const, children: family.children };
}
// Tool definitions are the complete allowlist. No tool can change teen privacy or send a payment.
export async function executeAssistantTool(
  identity: Identity,
  name: string,
  args: Record<string, unknown>,
) {
  if (name === 'analyze_family') return readAssistantFamilyCard(identity);
  const childId = typeof args.childId === 'string' ? args.childId : '';
  if (['analyze_spending', 'get_budget', 'get_requests'].includes(name))
    return readAssistantCard(
      identity,
      childId,
      name === 'analyze_spending' ? 'analysis' : name === 'get_budget' ? 'budget' : 'requests',
    );
  if (name === 'propose_top_up')
    return proposeAssistantAction(identity, { ...args, kind: 'top_up' });
  if (name === 'propose_vault_release')
    return proposeAssistantAction(identity, { ...args, kind: 'release_vault' });
  if (name === 'propose_freeze')
    return proposeAssistantAction(identity, { ...args, kind: 'freeze' });
  if (name === 'propose_budget')
    return proposeAssistantAction(identity, { ...args, kind: 'budget' });
  throw new HttpError('This assistant tool is not available.');
}
