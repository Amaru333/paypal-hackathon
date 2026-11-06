import { Brand } from '@/components/brand';

export function DashboardLoadingShell({ children }: { children?: React.ReactNode }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <div className="family-label">YOUR FAMILY SPACE</div>
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
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">Your family</div>
        </header>
        <main className="dashboard" aria-busy="true">
          <div className="page-heading">
            <h1>Opening your pocket…</h1>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
