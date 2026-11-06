import { randomUUID } from 'node:crypto';

import { defaultPolicy, type Policy, type Purchase, type Role } from '../src/domain/wallet';
export type Child = {
  id: string;
  name: string;
  username?: string;
  password?: string;
  policy: Policy;
  period: string;
  joinedAt?: string;
  invitation?: { hash: string; expiresAt: number };
};
export type Store = {
  version: 2;
  parent?: { name: string; email?: string; password: string };
  children: Child[];
  purchases: Purchase[];
  sessions: { hash: string; role: Role; childId?: string; expires: number }[];
  paypal?: { token: string };
  setup?: { id: string; state: string; createdAt: number; requestId: string };
  loginAttempts: { at: number }[];
};
type LegacyStore = Omit<Store, 'version' | 'children'> & {
  version: 1;
  child: { name: string; pin: string };
  policy: Policy;
  period: string;
};
export function newChild(name: string): Child {
  return {
    id: randomUUID(),
    name,
    policy: structuredClone(defaultPolicy),
    period: new Date().toISOString(),
  };
}
export function migrateStore(old: LegacyStore): Store {
  const child =
    old.parent && old.child?.pin
      ? {
          ...newChild(old.child.name),
          username:
            old.child.name
              .toLowerCase()
              .replace(/[^a-z0-9]/g, '')
              .slice(0, 20) || 'child',
          password: old.child.pin,
          policy: old.policy,
          period: old.period,
          joinedAt: old.period,
        }
      : undefined;
  return {
    version: 2,
    parent: old.parent,
    children: child ? [child] : [],
    purchases: old.purchases.map((p) => ({ ...p, childId: child?.id || 'legacy' })),
    sessions: old.sessions
      .filter((s) => s.role === 'parent' || child)
      .map((s) => ({ ...s, ...(s.role === 'child' ? { childId: child?.id } : {}) })),
    paypal: old.paypal,
    setup: old.setup,
    loginAttempts: old.loginAttempts || [],
  };
}
