import { database } from '@/server/db/client';
import { createSession } from '@/server/auth/session';
import { digestToken, hashPassword, verifyPassword } from '@/server/auth/password';
import { HttpError } from '@/server/http/errors';

export async function signup(input: { name: string; email: string; password: string }) {
  const passwordHash = hashPassword(input.password);
  return database().$transaction(async (tx) => {
    const parent = await tx.parent.create({
      data: { name: input.name, email: input.email.toLowerCase(), passwordHash },
    });
    return createSession(tx, { role: 'parent', parentId: parent.id });
  });
}
export async function login(input: {
  role: 'parent' | 'child';
  email?: string;
  username?: string;
  password: string;
}) {
  const db = database();
  const identifier = (input.role === 'parent' ? input.email : input.username)?.trim().toLowerCase();
  if (!identifier) throw new HttpError('Enter your sign-in details.');
  const identity = digestToken(`${input.role}:${identifier}`);
  // Commit attempts separately so an invalid password cannot roll back the throttle.
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${identity}))`;
    await tx.loginAttempt.deleteMany({
      where: { identity, createdAt: { lt: new Date(Date.now() - 60000) } },
    });
    if ((await tx.loginAttempt.count({ where: { identity } })) >= 8)
      throw new HttpError('Too many attempts. Wait one minute.', 429);
    await tx.loginAttempt.create({ data: { identity } });
  });
  const account =
    input.role === 'parent'
      ? await db.parent.findUnique({ where: { email: identifier } })
      : await db.child.findUnique({ where: { username: identifier } });
  if (!account?.passwordHash || !verifyPassword(input.password, account.passwordHash))
    throw new HttpError('Those sign-in details did not match.', 401);
  const parentId = 'parentId' in account ? account.parentId : account.id;
  return db.$transaction(async (tx) => {
    await tx.loginAttempt.deleteMany({ where: { identity } });
    return createSession(tx, {
      role: input.role,
      parentId,
      childId: input.role === 'child' ? account.id : undefined,
    });
  });
}
