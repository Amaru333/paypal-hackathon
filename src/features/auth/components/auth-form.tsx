'use client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import type { Role } from '@/domain/wallet';
import { Welcome } from './welcome';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {initialized !== undefined && (
        <form onSubmit={onSubmit}>
          {initialized ? (
            <>
              <Tabs value={role} onValueChange={(value) => setRole(value as Role)}>
                <TabsList className="w-full">
                  <TabsTrigger value="parent" className="flex-1">
                    I’m a parent
                  </TabsTrigger>
                  <TabsTrigger value="child" className="flex-1">
                    My pocket
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              {role === 'child' ? (
                <Label>
                  Your username
                  <Input
                    name="username"
                    required
                    autoComplete="username"
                    placeholder="e.g. maya_explores"
                  />
                </Label>
              ) : (
                <Label>
                  Your email
                  <Input
                    name="email"
                    type="email"
                    required
                    autoComplete="username"
                    placeholder="you@example.com"
                  />
                </Label>
              )}
              <Label>
                Password
                <Input
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                />
              </Label>
            </>
          ) : (
            <>
              <Label>
                Your first name
                <Input
                  name="name"
                  required
                  maxLength={40}
                  autoComplete="given-name"
                  placeholder="Alex"
                />
              </Label>
              <Label>
                Your email
                <Input
                  name="email"
                  type="email"
                  required
                  maxLength={254}
                  autoComplete="email"
                  placeholder="you@example.com"
                />
              </Label>
              <Label>
                Create a parent password
                <Input
                  name="password"
                  type="password"
                  required
                  minLength={10}
                  maxLength={128}
                  autoComplete="new-password"
                  placeholder="At least 10 characters"
                />
              </Label>
              <p className="form-note">
                Your children will choose their own passwords when they accept an invitation.
              </p>
            </>
          )}
          <Button variant="ghost" className="button primary full" disabled={busy}>
            {busy ? 'One moment…' : initialized ? 'Open my pocket →' : 'Create my parent account →'}
          </Button>
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
