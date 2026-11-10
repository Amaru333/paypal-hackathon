import { request } from '@/lib/api-client';
import type { Policy, Purchase } from '@/domain/wallet';
import type { Snapshot, InviteResult } from './types';

export const dashboardApi = {
  state: (childId?: string) =>
    request<Snapshot>('/dashboard' + (childId ? `?childId=${encodeURIComponent(childId)}` : '')),
  addChild: (name: string, email: string) => request<InviteResult>('/children', { name, email }),
  invite: (id: string) =>
    request<InviteResult>(`/children/${encodeURIComponent(id)}/invitation`, {}),
  revoke: (id: string) => request(`/children/${encodeURIComponent(id)}/invitation`, {}, 'DELETE'),
  policy: (id: string, policy: Policy) =>
    request(`/children/${encodeURIComponent(id)}/budget`, { policy }, 'PUT'),
  freeze: (id: string, frozen: boolean) =>
    request(`/children/${encodeURIComponent(id)}/freeze`, { frozen }, 'PATCH'),
  draft: (childId: string, prompt: string) =>
    request<{ policy: Policy }>('/ai/budget', { childId, prompt }),
  connect: () => request<{ url: string }>('/payments/paypal/connect', {}),
  purchase: (childId: string, productId: string, key: string) =>
    request<{ purchase: Purchase }>('/purchases', { childId, productId, key }),
  prepareCheckout: (childId: string, productId: string, key: string) =>
    request<{ purchase: Purchase }>('/purchases', { childId, productId, key, prepare: true }),
  action: (id: string, action: 'approve' | 'decline' | 'retry') =>
    request<{ purchase: Purchase }>(`/purchases/${encodeURIComponent(id)}/actions`, { action }),
  vault: (id: string, input: { enabled: boolean } | { cents: number }) =>
    request(`/children/${encodeURIComponent(id)}/vault`, input),
  logout: () => request('/auth/logout', {}),
};
