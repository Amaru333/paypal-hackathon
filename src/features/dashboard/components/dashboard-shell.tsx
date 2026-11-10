'use client';
import { NativeSelect } from '@/components/ui/native-select';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { usePocket, usePocketState } from '../pocket-provider';
import { DashboardLoadingShell } from './dashboard-loading-shell';
import { dashboardApi } from '../api';
import { Brand } from '@/components/brand';
import type { Tab } from '../types';
import styles from './dashboard.module.css';

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const { data } = usePocketState();
  if (!data) return <DashboardLoadingShell>{children}</DashboardLoadingShell>;
  return <LoadedDashboardShell>{children}</LoadedDashboardShell>;
}

function LoadedDashboardShell({ children }: { children: React.ReactNode }) {
  const { href, data, busy, parent, tab, changeTab, selectChild, run, logout, pending } =
    usePocket();

  const nav: Tab[] = parent
    ? data.childId
      ? ['Family', 'Overview', 'Requests', 'Budgets', 'Activity']
      : ['Family']
    : ['Overview', 'Shop', 'Activity'];

  const navIcons: Record<Tab, string> = {
    Family: '◎',
    Overview: '◈',
    Requests: '◐',
    Budgets: '▣',
    Activity: '↗',
    Shop: '◇',
  };

  const title =
    tab === 'Family'
      ? 'Family'
      : tab === 'Overview'
        ? parent
          ? `${data.childName}’s pocket`
          : 'Your pocket'
        : tab === 'Shop'
          ? 'Shop'
          : tab === 'Budgets'
            ? 'Budgets'
            : tab === 'Requests'
              ? 'Requests'
              : 'Activity';

  const subtitle =
    tab === 'Family'
      ? 'Add children, share invitations, and jump into any pocket.'
      : tab === 'Overview'
        ? parent
          ? `What’s left in ${data.childName}’s allowance this period.`
          : 'See what’s left and what’s already spent.'
        : tab === 'Shop'
          ? 'Try a purchase within your family’s limits.'
          : tab === 'Budgets'
            ? `Set ${data.childName}’s allowance, categories, and approval threshold.`
            : tab === 'Requests'
              ? `Approve or decline purchases waiting on you.`
              : 'Purchases, decisions, and payment confirmations.';

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brandWrap}>
          <Brand />
        </div>
        <div className={styles.navLabel}>{parent ? 'Parent dashboard' : 'My pocket'}</div>
        <nav className={styles.nav} aria-label="Dashboard">
          {nav.map((item) => (
            <Link
              key={item}
              className={`${styles.navItem} ${tab === item ? styles.navItemActive : ''}`}
              href={href(item)}
            >
              <span className={styles.navIcon} aria-hidden="true">
                {navIcons[item]}
              </span>
              <span>{item}</span>
              {item === 'Requests' && pending.length > 0 && (
                <b className={styles.navCount}>{pending.length}</b>
              )}
            </Link>
          ))}
        </nav>
        <div className={styles.sidebarFoot}>
          <div className={styles.avatar}>
            {(parent ? data.parentName : data.childName).slice(0, 1)}
          </div>
          <div>
            <strong>{parent ? data.parentName : data.childName}</strong>
            <small>{parent ? 'Parent' : 'Child'}</small>
          </div>
          <Button variant="ghost" className={styles.signOut} onClick={logout}>
            Sign out
          </Button>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.crumb}>
            {parent ? <Link href="/parent/family">Family</Link> : <span>My pocket</span>}
            {tab !== 'Family' && (
              <>
                <span className={styles.crumbSep}>/</span>
                {parent && (
                  <>
                    <span>{data.childName}</span>
                    <span className={styles.crumbSep}>/</span>
                  </>
                )}
                <span>{tab}</span>
              </>
            )}
          </div>
          <div className={styles.topActions}>
            {parent && tab !== 'Family' && data.children.length > 0 && (
              <NativeSelect
                className={`child-picker ${styles.childSelect}`}
                aria-label="Choose a child"
                disabled={busy}
                value={data.childId || ''}
                onChange={(e) => selectChild(e.target.value)}
              >
                {data.children.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.name}
                  </option>
                ))}
              </NativeSelect>
            )}
          </div>
        </header>

        <main className={styles.content}>
          <div className={styles.heading}>
            <div>
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </div>
            {parent && tab === 'Overview' && (
              <Button
                variant="ghost"
                className="button secondary"
                onClick={() => changeTab('Budgets')}
              >
                Edit budgets
              </Button>
            )}
          </div>

          {!data.connected && tab !== 'Family' && (!parent || tab === 'Budgets') && (
            <div className={styles.banner}>
              <div>
                <strong>Connect PayPal to try purchases</strong>
                <p>
                  {parent
                    ? 'Use a PayPal sandbox account. No real money moves.'
                    : 'Ask your parent to connect PayPal before you can buy anything.'}
                </p>
              </div>
              {parent && (
                <Button
                  variant="ghost"
                  disabled={busy}
                  className="button primary"
                  onClick={() =>
                    run(async () => {
                      const result = await dashboardApi.connect();
                      window.location.assign(result.url);
                    })
                  }
                >
                  Connect PayPal
                </Button>
              )}
            </div>
          )}

          {data.policy.frozen && tab !== 'Family' && (
            <div className={styles.paused}>
              Spending is paused.
              {parent
                ? ' Resume it from Budgets when you’re ready.'
                : ' Your parent will let you know when shopping opens again.'}
            </div>
          )}

          {children}

          <footer className={styles.footer}>
            <span>
              <b>pocket</b> · Parent-guided spending practice
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
