import { Brand } from '@/components/brand';
import styles from './dashboard.module.css';

export function DashboardLoadingShell({ children }: { children?: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brandWrap}>
          <Brand />
        </div>
        <div className={styles.navLabel}>Loading</div>
      </aside>
      <div className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.crumb}>Opening your pocket…</div>
        </header>
        <main className={styles.content} aria-busy="true">
          <div className={styles.heading}>
            <h1 className={styles.loadingTitle}>Opening your pocket…</h1>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
