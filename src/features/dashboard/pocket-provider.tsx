'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import type { Policy, Purchase } from '@/domain/wallet';
import { products } from '@/domain/wallet';
import type { Snapshot, Tab, InviteResult } from './types';
import { dashboardApi } from './api';

function useDashboardState() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ childId?: string }>();
  const childId = params.childId;
  const [data, setData] = useState<Snapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [draftState, setDraftState] = useState<{ childId?: string; policy: Policy } | null>(null);
  const draft = draftState?.childId === childId ? draftState?.policy || null : null;
  const setDraft = (policy: Policy | null) => setDraftState(policy ? { childId, policy } : null);
  const [invitation, setInvitation] = useState<InviteResult | null>(null);
  const [selected, setSelected] = useState<(typeof products)[number] | null>(null);
  const [requestKey, setRequestKey] = useState('');
  const [prompt, setPrompt] = useState(
    'Give my child $100 each week: 30% food, 20% groceries, 20% transport, and the rest for everything else. Ask me for purchases over $25.',
  );
  const refreshVersion = useRef(0);
  const refresh = useCallback(async () => {
    const version = ++refreshVersion.current;
    try {
      const snapshot = await dashboardApi.state(childId);
      if (version !== refreshVersion.current) return;
      if (pathname.startsWith('/parent') !== (snapshot.role === 'parent')) {
        router.replace(snapshot.role === 'parent' ? '/parent/family' : '/child/overview');
        return;
      }
      setData(snapshot);
    } catch (error) {
      if (version !== refreshVersion.current) return;
      if (error instanceof Error && error.message === 'Please sign in again.')
        router.replace('/login');
      else setError(error instanceof Error ? error.message : 'Could not load this pocket.');
    }
  }, [childId, pathname, router]);
  useEffect(() => {
    // Initial synchronization with the authenticated API, followed by polling.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    const timer = setInterval(() => void refresh(), 7000);
    return () => {
      clearInterval(timer);
    };
  }, [refresh]);
  useEffect(() => {
    const readPayment = () => {
      const payment = new URLSearchParams(window.location.search).get('payment');
      if (payment === 'connected')
        setNotice('PayPal connected. Your family is ready to try a purchase.');
      if (payment === 'cancelled')
        setNotice('PayPal connection cancelled. You can connect again whenever you’re ready.');
      if (payment) router.replace(pathname);
    };
    readPayment();
  }, [pathname, router]);
  const parent = data?.role === 'parent';
  const routeTab = pathname.split('/').at(-1) || 'overview';
  const tab = (routeTab.charAt(0).toUpperCase() + routeTab.slice(1)) as Tab;
  const href = (target: Tab, id = data?.childId) =>
    parent
      ? target === 'Family' || !id
        ? '/parent/family'
        : `/parent/children/${encodeURIComponent(id)}/${target.toLowerCase()}`
      : `/child/${target.toLowerCase()}`;
  function changeTab(target: Tab) {
    setDraft(null);
    router.push(href(target));
  }
  function selectChild(id: string) {
    setDraft(null);
    setSelected(null);
    router.push(href('Overview', id));
  }
  async function run(work: () => Promise<void>) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await work();
      await refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }
  async function purchaseAction(purchase: Purchase, action: 'approve' | 'decline' | 'retry') {
    await run(async () => {
      const result = await dashboardApi.action(purchase.id, action);
      setNotice(result.purchase.error || result.purchase.reason);
    });
  }
  async function logout() {
    await run(async () => {
      await dashboardApi.logout();
      router.replace('/login');
    });
  }
  const pending = data?.purchases.filter((p) => p.status === 'approval') || [];
  const remaining = data ? Math.max(0, data.policy.allowance - data.spent - data.reserved) : 0;
  const periodName =
    data?.policy.periodDays === 1 ? 'Daily' : data?.policy.periodDays === 7 ? 'Weekly' : '30-day';
  const date = data
    ? new Date(data.renewsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '';
  return {
    data,
    busy,
    notice,
    setNotice,
    error,
    setError,
    draft,
    setDraft,
    invitation,
    setInvitation,
    selected,
    setSelected,
    requestKey,
    setRequestKey,
    prompt,
    setPrompt,
    parent,
    tab,
    href,
    changeTab,
    selectChild,
    run,
    purchaseAction,
    logout,
    pending,
    remaining,
    periodName,
    date,
  };
}
type PocketState = ReturnType<typeof useDashboardState>;
const PocketContext = createContext<PocketState | null>(null);
export function PocketProvider({ children }: { children: React.ReactNode }) {
  const state = useDashboardState();
  const params = useParams<{ childId?: string }>();
  const data = params.childId && params.childId !== state.data?.childId ? null : state.data;
  return <PocketContext.Provider value={{ ...state, data }}>{children}</PocketContext.Provider>;
}
export function usePocketState() {
  const context = useContext(PocketContext);
  if (!context) throw new Error('Dashboard components require PocketProvider.');
  return context;
}
export function usePocket() {
  const context = usePocketState();
  if (!context.data) throw new Error('Pocket content requires loaded dashboard data.');
  return { ...context, data: context.data };
}
export function PocketContent({ children }: { children: React.ReactNode }) {
  const { data, error } = usePocketState();
  if (!data) return <p role={error ? 'alert' : 'status'}>{error || 'Loading your pocket…'}</p>;
  return children;
}
