'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { request } from '@/lib/api-client';
import { Invitation } from './components/invitation-form';
import Link from 'next/link';
import { Welcome } from './components/welcome';

type InviteInfo = { name: string; parentName: string; expiresAt: number };
async function invitationApi(action: string, body?: unknown) {
  return request<InviteInfo>(
    action === 'invite/info' ? '/invitations/inspect' : '/invitations/accept',
    body,
  );
}
export function InvitationScreen() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [parentSignedIn, setParentSignedIn] = useState(false);
  useEffect(() => {
    const read = () =>
      setToken(new URLSearchParams(window.location.hash.slice(1)).get('invite') || '');
    read();
    window.addEventListener('hashchange', read);
    request<{ identity: { role: string } | null }>('/auth/session')
      .then((result) => setParentSignedIn(result.identity?.role === 'parent'))
      .catch(() => {});
    return () => window.removeEventListener('hashchange', read);
  }, []);
  if (token === null)
    return (
      <Welcome>
        <p role="status">Opening your invitation…</p>
      </Welcome>
    );
  if (!token)
    return (
      <Welcome>
        <span className="eyebrow">YOUR NEXT CHAPTER</span>
        <h2>An invitation is needed.</h2>
        <p className="muted">Ask your parent for a new invitation link.</p>
        <Link className="button primary" href="/login">
          Back to sign in ↗
        </Link>
      </Welcome>
    );
  return (
    <Invitation
      key={token}
      token={token}
      api={invitationApi}
      parentSignedIn={parentSignedIn}
      onJoined={async () => {
        router.replace('/child/overview');
      }}
    />
  );
}
