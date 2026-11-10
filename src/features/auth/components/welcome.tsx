import { Card } from '@/components/ui/card';
import { Brand } from '@/components/brand';
export function Welcome({ children }: { children: React.ReactNode }) {
  return (
    <main className="welcome-shell">
      <section className="welcome-story">
        <Brand />
        <div className="story-copy">
          <span className="eyebrow light">A LITTLE FREEDOM. A LIFETIME OF GOOD HABITS.</span>
          <h1>
            Big steps.
            <br />
            Little pockets.
          </h1>
          <p>A first taste of independence, with a little guidance from you.</p>
          <div className="illustration" aria-hidden="true">
            <div className="mini-card">
              <span>MY POCKET</span>
              <strong>
                $100<span>.00</span>
              </strong>
              <div className="mini-card-footer">
                <span>Room to grow.</span>
                <span>✦</span>
              </div>
            </div>
            <span className="floating-coin one">✦</span>
            <span className="floating-coin two">$</span>
            <span className="float-label">Good habits start small ↗</span>
          </div>
        </div>
        <p className="story-footer">Built for families. Powered by possibility.</p>
      </section>
      <section className="welcome-form">
        <Card className="auth-card">{children}</Card>
      </section>
    </main>
  );
}
