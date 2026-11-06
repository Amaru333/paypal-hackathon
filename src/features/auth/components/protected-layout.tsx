import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cookieName, getIdentity } from '@/server/auth/session';
import type { Role } from '@/domain/wallet';

export async function ProtectedLayout({
  role,
  children,
}: {
  role: Role;
  children: React.ReactNode;
}) {
  const identity = await getIdentity((await cookies()).get(cookieName)?.value);
  if (!identity) redirect('/login');
  if (identity.role !== role)
    redirect(identity.role === 'parent' ? '/parent/family' : '/child/overview');
  return children;
}
