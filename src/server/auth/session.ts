import { randomBytes } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { database } from '@/server/db/client';
import type { Transaction } from '@/server/db/transactions';
import { digestToken } from './password';
import { HttpError } from '@/server/http/errors';

export const cookieName = 'pocket_session';
export type Identity = { role: 'parent' | 'child'; parentId: string; childId?: string };

export async function getIdentity(token?: string): Promise<Identity | null> {
  if (!token) return null;
  const session = await database().session.findUnique({
    where: { tokenHash: digestToken(token) },
    include: { child: true },
  });
  if (!session || session.expiresAt <= new Date()) return null;
  if (session.role === 'parent' && session.parentId)
    return { role: 'parent', parentId: session.parentId };
  if (session.child)
    return { role: 'child', parentId: session.child.parentId, childId: session.child.id };
  return null;
}
export async function requireIdentity(req: NextRequest, role?: Identity['role']) {
  const identity = await getIdentity(req.cookies.get(cookieName)?.value);
  if (!identity) throw new HttpError('Please sign in again.', 401);
  if (role && identity.role !== role)
    throw new HttpError('This action is not available to this account.', 403);
  return identity;
}
export async function createSession(tx: Transaction, identity: Identity) {
  const token = randomBytes(32).toString('hex');
  await tx.session.create({
    data: {
      tokenHash: digestToken(token),
      role: identity.role,
      parentId: identity.role === 'parent' ? identity.parentId : null,
      childId: identity.childId,
      expiresAt: new Date(Date.now() + 12 * 3600000),
    },
  });
  return token;
}
export function sessionResponse(token: string, origin: string) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(cookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 43200,
    secure: origin.startsWith('https:'),
  });
  return response;
}
