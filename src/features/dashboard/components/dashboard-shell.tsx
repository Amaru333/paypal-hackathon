'use client';
import Link from 'next/link';
import { usePocket, usePocketState } from '../pocket-provider';
import { DashboardLoadingShell } from './dashboard-loading-shell';
import { dashboardApi } from '../api';
import { Brand } from '@/components/brand';
import type { Tab } from '../types';
export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const { data } = usePocketState();
  if (!data) return <DashboardLoadingShell>{children}</DashboardLoadingShell>;
  return <LoadedDashboardShell>{children}</LoadedDashboardShell>;
}
function LoadedDashboardShell({ children }: { children: React.ReactNode }) {
  const {
    href,
    data,
    busy,
    notice,
    setNotice,
    error,
    setError,
    parent,
    tab,
    changeTab,
    selectChild,
    run,
    logout,
    pending,
  } = usePocket();
  const nav: Tab[] = parent
    ? data.childId
      ? ['Family', 'Overview', 'Requests', 'Budgets', 'Activity']
      : ['Family']
    : ['Overview', 'Shop', 'Activity'];
  const navIcons: Record<Tab, string> = {
    Family: '♧',
    Overview: '◫',
    Requests: '▱',
    Budgets: '◉',
    Activity: '↗',
    Shop: '▧',
  };
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <div className="family-label">YOUR FAMILY SPACE</div>
        <nav>
          {nav.map((item, i) => (
            <Link
              key={item}
              className={tab === item ? 'nav-item active' : 'nav-item'}
              href={href(item)}
            >
              <span className="nav-icon">{navIcons[item]}</span>
              {item}
              {item === 'Requests' && pending.length > 0 ? (
                <b className="nav-count">{pending.length}</b>
              ) : (
                <small>0{i + 1}</small>
              )}
            </Link>
          ))}
        </nav>
        <div className="sidebar-note">
          <span>✦</span>
          <h3>
            Little choices.
            <br />
            Lasting confidence.
          </h3>
          <p>
            Make space for learning,
            <br />
            one purchase at a time.
          </p>
        </div>
        <div className="sidebar-bottom">
          <div className="avatar">{(parent ? data.parentName : data.childName).slice(0, 1)}</div>
          <div>
            <strong>{parent ? data.parentName : data.childName}</strong>
            <small>{parent ? 'Parent account' : 'My pocket'}</small>
          </div>
          <button aria-label="Sign out" title="Sign out" onClick={logout}>
            ↪
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Your family <span>/</span> {tab}
          </div>
          <div className="topbar-right">
            {parent && data.children.length > 0 && (
              <select
                className="child-picker"
                aria-label="Choose a child"
                disabled={busy}
                value={data.childId || ''}
                onChange={(e) => selectChild(e.target.value)}
              >
                {data.children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}’s pocket
                  </option>
                ))}
              </select>
            )}
            <span className="avatar small">{data.childName.slice(0, 1)}</span>
          </div>
        </header>
        <main className="dashboard">
          <div className="page-heading">
            <div>
              <span className="eyebrow">
                {parent ? 'A LITTLE GUIDANCE GOES A LONG WAY' : 'YOUR MONEY JOURNEY STARTS HERE'}
              </span>
              <h1>
                {tab === 'Family'
                  ? `Your people, ${data.parentName}.`
                  : tab === 'Overview'
                    ? parent
                      ? `Good to see you, ${data.parentName}.`
                      : `Hey, ${data.childName}. Make it yours.`
                    : tab === 'Shop'
                      ? 'Small choices. Big possibilities.'
                      : tab === 'Budgets'
                        ? 'Room to spend. Space to learn.'
                        : tab === 'Requests'
                          ? 'A little say in the big things.'
                          : 'Every little step.'}
              </h1>
              <p className="muted">
                {tab === 'Family'
                  ? 'A little freedom looks different for everyone. Start with an invitation.'
                  : tab === 'Overview'
                    ? parent
                      ? `Here’s how ${data.childName}’s pocket is looking.`
                      : 'A little independence, with your family behind you.'
                    : tab === 'Shop'
                      ? 'Explore the shop and put your budget into practice.'
                      : tab === 'Budgets'
                        ? 'Set the boundaries that work for your family.'
                        : tab === 'Requests'
                          ? 'Review the purchase, understand the reason, and make the call.'
                          : 'Your purchases, decisions, and payment confirmations.'}
              </p>
            </div>
            {parent && tab === 'Overview' && (
              <button className="button secondary" onClick={() => changeTab('Budgets')}>
                Manage allowance ↗
              </button>
            )}
          </div>
          <div aria-live="polite">
            {notice && (
              <div className="message success">
                <span>✓</span>
                {notice}
                <button aria-label="Dismiss message" onClick={() => setNotice('')}>
                  ×
                </button>
              </div>
            )}
            {error && (
              <div className="message error" role="alert">
                {error}
                <button aria-label="Dismiss error" onClick={() => setError('')}>
                  ×
                </button>
              </div>
            )}
          </div>
          {!data.connected && tab !== 'Family' && (
            <div className="connection-banner">
              <div>
                <strong>One connection. A little more freedom.</strong>
                <p>
                  {parent
                    ? 'Connect a PayPal test account to try purchases. No real money moves.'
                    : 'Your parent needs to connect PayPal before you can make purchases.'}
                </p>
              </div>
              {parent && (
                <button
                  disabled={busy}
                  className="button primary"
                  onClick={() =>
                    run(async () => {
                      const result = await dashboardApi.connect();
                      window.location.assign(result.url);
                    })
                  }
                >
                  Connect PayPal ↗
                </button>
              )}
            </div>
          )}
          {data.policy.frozen && tab !== 'Family' && (
            <div className="message paused">
              Ⅱ &nbsp; Spending is paused.{' '}
              {parent
                ? 'Resume it when you’re ready.'
                : 'Your parent will let you know when you can shop again.'}
            </div>
          )}
          {children}
          <footer className="dashboard-footer">
            <span>
              <b>pocket</b> &nbsp; A little freedom, thoughtfully given.
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
