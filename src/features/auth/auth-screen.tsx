'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Role } from '@/domain/wallet';
import { request } from '@/lib/api-client';
import { Auth } from './components/auth-form';

export function AuthScreen({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter();
  const [role, setRole] = useState<Role>('parent');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    setError('');
    try {
      await request(`/auth/${mode}`, { ...values, role });
      router.replace(role === 'child' && mode === 'login' ? '/child/overview' : '/parent/family');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Auth
        initialized={mode === 'login'}
        busy={busy}
        error={error}
        role={role}
        setRole={setRole}
        onSubmit={submit}
      />
    </>
  );
}
