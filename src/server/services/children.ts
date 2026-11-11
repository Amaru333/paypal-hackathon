import { randomBytes } from 'node:crypto';
import { defaultPolicy } from '@/domain/wallet';
import { database } from '@/server/db/client';
import { budgetFields } from '@/server/db/mappers';
import { familyTransaction, type Transaction } from '@/server/db/transactions';
import { createSession, type Identity } from '@/server/auth/session';
import { digestToken, hashPassword } from '@/server/auth/password';
import { HttpError } from '@/server/http/errors';
import { sendInvitationEmail } from '@/server/integrations/email';
import { validBirthDate, privacyState } from '@/domain/privacy';

export async function ownedChild(identity: Identity, id?: string, db: Transaction = database()) {
  if (identity.role === 'child' && id && id !== identity.childId)
    throw new HttpError('You can only access your own pocket.', 403);
  const child = await db.child.findFirst({
    where: {
      id: identity.role === 'child' ? identity.childId : id || '__missing__',
      parentId: identity.parentId,
    },
    include: { budget: true },
  });
  if (!child?.budget) throw new HttpError('Child not found.', 404);
  return { ...child, budget: child.budget };
}
async function issueInvitation(tx: Transaction, childId: string, origin: string) {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 86400000);
  const data = { tokenHash: digestToken(token), expiresAt };
  await tx.invitation.upsert({ where: { childId }, create: { childId, ...data }, update: data });
  return { childId, url: `${origin}/invite#invite=${token}`, expiresAt: expiresAt.getTime() };
}
export async function addChild(
  identity: Identity,
  name: string,
  origin: string,
  email?: string,
  birthDate?: string,
) {
  const birth = birthDate ? parseBirthDate(birthDate) : null;
  const invitation = await familyTransaction(identity.parentId, async (tx) => {
    if ((await tx.child.count({ where: { parentId: identity.parentId } })) >= 12)
      throw new HttpError('This demo supports up to 12 children per family.');
    const child = await tx.child.create({
      data: {
        parentId: identity.parentId,
        name,
        email,
        birthDate: birth,
        budget: { create: budgetFields(defaultPolicy) },
      },
    });
    return issueInvitation(tx, child.id, origin);
  });
  return deliverInvitation(invitation);
}
function parseBirthDate(value: string) {
  try {
    return validBirthDate(value);
  } catch (error) {
    throw new HttpError((error as Error).message);
  }
}
export function setBirthDate(identity: Identity, childId: string, value: string) {
  if (identity.role !== 'parent') throw new HttpError('Only parents can set a birth date.', 403);
  const birthDate = parseBirthDate(value);
  return familyTransaction(identity.parentId, async (tx) => {
    const child = await ownedChild(identity, childId, tx);
    if (child.birthDate)
      throw new HttpError('The birth date is already set and cannot be changed.', 409);
    await tx.child.update({ where: { id: child.id }, data: { birthDate } });
    return { ok: true };
  });
}
export function setPrivacy(identity: Identity, childId: string, enabled: boolean) {
  if (identity.role !== 'child') throw new HttpError('Only the teen can change Privacy Mode.', 403);
  return familyTransaction(identity.parentId, async (tx) => {
    const child = await ownedChild(identity, childId, tx);
    if (enabled && !privacyState(child).eligible)
      throw new HttpError(
        'Privacy Mode is available from age 16 once a parent has set your birth date.',
      );
    await tx.child.update({ where: { id: child.id }, data: { privacyEnabled: enabled } });
    return { ok: true };
  });
}
export async function renewInvitation(identity: Identity, childId: string, origin: string) {
  const invitation = await familyTransaction(identity.parentId, async (tx) => {
    const child = await ownedChild(identity, childId, tx);
    if (child.joinedAt) throw new HttpError('This child has already joined.');
    return issueInvitation(tx, childId, origin);
  });
  return deliverInvitation(invitation);
}
async function deliverInvitation(invitation: { childId: string; url: string; expiresAt: number }) {
  const child = await database().child.findUniqueOrThrow({ where: { id: invitation.childId } });
  const emailStatus = child.email
    ? await sendInvitationEmail({ to: child.email, name: child.name, url: invitation.url })
    : 'missing_email';
  return { ...invitation, email: child.email, emailStatus };
}
export function revokeInvitation(identity: Identity, childId: string) {
  return familyTransaction(identity.parentId, async (tx) => {
    await ownedChild(identity, childId, tx);
    await tx.invitation.deleteMany({ where: { childId } });
    return { ok: true };
  });
}
export async function findInvitation(token: string, db: Transaction = database()) {
  const invitation = await db.invitation.findUnique({
    where: { tokenHash: digestToken(token) },
    include: { child: { include: { parent: true } } },
  });
  if (!invitation || invitation.expiresAt <= new Date() || invitation.child.joinedAt)
    throw new HttpError(
      'This invitation is invalid, expired, or already used. Ask your parent for a new link.',
      410,
    );
  return invitation;
}
export async function acceptInvitation(token: string, username: string, password: string) {
  const invitation = await findInvitation(token);
  const passwordHash = hashPassword(password);
  return familyTransaction(invitation.child.parentId, async (tx) => {
    const current = await findInvitation(token, tx);
    await tx.child.update({
      where: { id: current.childId },
      data: { username: username.toLowerCase(), passwordHash, joinedAt: new Date() },
    });
    await tx.budget.update({
      where: { childId: current.childId },
      data: { periodStart: new Date() },
    });
    await tx.invitation.delete({ where: { childId: current.childId } });
    return createSession(tx, {
      role: 'child',
      parentId: current.child.parentId,
      childId: current.childId,
    });
  });
}
