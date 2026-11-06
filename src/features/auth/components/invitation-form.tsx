'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Welcome } from './welcome';
export function Invitation({
  token,
  api,
  onJoined,
  parentSignedIn,
}: {
  token: string;
  api: (
    path: string,
    body?: unknown,
  ) => Promise<{ name: string; parentName: string; expiresAt: number }>;
  onJoined: () => Promise<void>;
  parentSignedIn: boolean;
}) {
  const router = useRouter();
  const [info, setInfo] = useState<{ name: string; parentName: string; expiresAt: number } | null>(
    null,
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    api('invite/info', { token })
      .then((data) => {
        if (active) setInfo(data);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [token, api]);
  async function join(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(e.currentTarget));
    setError('');
    if (values.password !== values.confirm) {
      setError('Your passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await api('invite/accept', { token, username: values.username, password: values.password });
      await onJoined();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not accept invitation.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Welcome>
      <span className="eyebrow">YOUR OWN LITTLE CORNER</span>
      <h2>
        {info
          ? `A pocket for ${info.name}.`
          : error
            ? 'Let’s get a fresh link.'
            : 'Checking your invitation…'}
      </h2>
      {info && (
        <p className="muted">
          {info.parentName} invited you to join your family. Choose a username and password that are
          just yours.
        </p>
      )}
      {error && (
        <div className="message error" role="alert">
          {error}
        </div>
      )}
      {parentSignedIn ? (
        <div className="message paused">
          You’re signed in as a parent. Copy this invitation into a private browser window so your
          child can set up their account.
        </div>
      ) : (
        info && (
          <form onSubmit={join}>
            <label>
              Your username
              <input
                name="username"
                autoComplete="username"
                minLength={3}
                maxLength={24}
                pattern="[A-Za-z0-9_]{3,24}"
                required
                placeholder="maya_explores"
              />
            </label>
            <label>
              Create a password
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={10}
                maxLength={128}
                required
                placeholder="At least 10 characters"
              />
            </label>
            <label>
              Confirm your password
              <input name="confirm" type="password" autoComplete="new-password" required />
            </label>
            <button className="button primary full" disabled={busy}>
              {busy ? 'Making it yours…' : 'Join my family →'}
            </button>
            <p className="form-note">
              This invitation can be used once and expires{' '}
              {new Date(info.expiresAt).toLocaleString()}.
            </p>
          </form>
        )
      )}
      <button className="text-button" onClick={() => router.push('/login')}>
        Back to sign in
      </button>
    </Welcome>
  );
}
