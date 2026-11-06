'use client';
import Link from 'next/link';
import type { Role } from '@/domain/wallet';
import { Welcome } from './welcome';
type Props = {
  initialized?: boolean;
  busy: boolean;
  error: string;
  role: Role;
  setRole: (role: Role) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
};
export function Auth({ initialized, busy, error, role, setRole, onSubmit }: Props) {
  return (
    <Welcome>
      <span className="eyebrow">YOUR FAMILY, CONNECTED</span>
      <h2>
        {initialized === undefined
          ? 'Opening your pocket…'
          : initialized
            ? 'Welcome back.'
            : 'Your family starts with you.'}
      </h2>
      <p className="muted">
        {initialized
          ? 'A small check-in. A little more confidence.'
          : 'Create your parent account now. Invite your children whenever you’re ready.'}
      </p>
      {error && (
        <div className="message error" role="alert">
          {error}
        </div>
      )}
      {initialized !== undefined && (
        <form onSubmit={onSubmit}>
          {initialized ? (
            <>
              <div className="role-toggle">
                <button
                  type="button"
                  className={role === 'parent' ? 'active' : ''}
                  onClick={() => setRole('parent')}
                >
                  I’m a parent
                </button>
                <button
                  type="button"
                  className={role === 'child' ? 'active' : ''}
                  onClick={() => setRole('child')}
                >
                  My pocket
                </button>
              </div>
              {role === 'child' ? (
                <label>
                  Your username
                  <input
                    name="username"
                    required
                    autoComplete="username"
                    placeholder="e.g. maya_explores"
                  />
                </label>
              ) : (
                <label>
                  Your email
                  <input
                    name="email"
                    type="email"
                    required
                    autoComplete="username"
                    placeholder="you@example.com"
                  />
                </label>
              )}
              <label>
                Password
                <input
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                />
              </label>
            </>
          ) : (
            <>
              <label>
                Your first name
                <input
                  name="name"
                  required
                  maxLength={40}
                  autoComplete="given-name"
                  placeholder="Alex"
                />
              </label>
              <label>
                Your email
                <input
                  name="email"
                  type="email"
                  required
                  maxLength={254}
                  autoComplete="email"
                  placeholder="you@example.com"
                />
              </label>
              <label>
                Create a parent password
                <input
                  name="password"
                  type="password"
                  required
                  minLength={10}
                  maxLength={128}
                  autoComplete="new-password"
                  placeholder="At least 10 characters"
                />
              </label>
              <p className="form-note">
                Your children will choose their own passwords when they accept an invitation.
              </p>
            </>
          )}
          <button className="button primary full" disabled={busy}>
            {busy ? 'One moment…' : initialized ? 'Open my pocket →' : 'Create my parent account →'}
          </button>
        </form>
      )}
      <div className="auth-route-link">
        <Link href={initialized ? '/signup' : '/login'}>
          {initialized ? 'New family? Create a parent account' : 'Already have an account? Sign in'}
        </Link>
      </div>
    </Welcome>
  );
}
