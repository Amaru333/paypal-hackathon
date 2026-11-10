'use client';
import { useEffect, useRef, useState } from 'react';
import { DashboardPreviewProvider } from '@/features/dashboard/pocket-provider';
import OverviewView from '@/features/dashboard/components/overview-view';
import { CheckoutReceipt } from '@/features/purchases/components/checkout-receipt';
import { sampleCheckout, sampleDashboard } from './demo-data';
import styles from './public-demo.module.css';

export function PublicDemo() {
  const [view, setView] = useState<'child' | 'parent' | 'checkout'>('child');
  const [step, setStep] = useState(0);
  const preview = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (view === 'parent' && step === 2)
      preview.current
        ?.querySelector('[aria-label="Soft Decline notifications"]')
        ?.scrollIntoView({ block: 'nearest' });
  }, [view, step]);
  return (
    <section className={styles.demo} id="public-demo" aria-label="Public Pocket demo">
      <div className={styles.topbar}>
        <span>pocket / inside the app</span>
        <span>No signup needed</span>
      </div>
      <div className={styles.tabs} aria-label="Choose a public preview">
        {(['child', 'parent', 'checkout'] as const).map((target) => (
          <button
            key={target}
            type="button"
            aria-pressed={view === target}
            onClick={() => setView(target)}
          >
            {target === 'child'
              ? 'Teen dashboard'
              : target === 'parent'
                ? 'Parent dashboard'
                : 'Checkout demo'}
          </button>
        ))}
      </div>
      <p className={styles.notice}>
        {view === 'checkout'
          ? 'Interactive simulation. No AI calls, payment requests, or money movement.'
          : 'Actual dashboard components · illustrative sample data · read-only'}
      </p>
      <div
        className={styles.viewport}
        ref={preview}
        key={view}
        tabIndex={0}
        role="region"
        aria-label={
          view === 'checkout'
            ? 'Simulated checkout walkthrough'
            : `${view === 'child' ? 'Teen' : 'Parent'} dashboard preview; scroll to explore`
        }
      >
        {view === 'checkout' ? (
          <div className={styles.checkout}>
            <div className={styles.progress} aria-label="Walkthrough progress">
              {['Choose lunch', 'Pocket checks', 'Sample result'].map((title, index) => (
                <span key={title} aria-current={index === step ? 'step' : undefined}>
                  {index + 1}. {title}
                </span>
              ))}
            </div>
            <h2>A $12 lunch. $10 left for food.</h2>
            {step === 0 ? (
              <>
                <p>
                  Pocket can cover the $2 shortfall from Everything else, within the parent’s $10
                  coverage cap. The total allowance and spending controls still apply.
                </p>
                <div className={styles.purchase}>
                  <strong>Lunch break</strong>
                  <span>$12.00</span>
                </div>
                <p className={styles.small}>
                  This mirrors the dummy storefront in the signed-in app. That checkout can use
                  PayPal Orders v2 sandbox after a parent connects their sandbox account.
                </p>
              </>
            ) : (
              <CheckoutReceipt purchase={sampleCheckout(step === 2)} simulated />
            )}
          </div>
        ) : (
          <DashboardPreviewProvider snapshot={sampleDashboard(view, step === 2)}>
            <fieldset disabled className={styles.dashboard}>
              <legend className="sr-only">Read-only sample dashboard</legend>
              <OverviewView preview />
            </fieldset>
          </DashboardPreviewProvider>
        )}
      </div>
      <div className={styles.footer}>
        {view === 'checkout' ? (
          <>
            {step < 2 ? (
              <button type="button" className={styles.primary} onClick={() => setStep(step + 1)}>
                {step === 0 ? 'Check budget (simulation)' : 'Simulate Pay with PayPal'}
              </button>
            ) : (
              <button type="button" className={styles.primary} onClick={() => setView('parent')}>
                See the parent’s check-in →
              </button>
            )}
            <button type="button" className={styles.reset} onClick={() => setStep(0)}>
              Restart walkthrough
            </button>
          </>
        ) : (
          <>
            <span className={styles.small}>Scroll inside to explore.</span>
            <button type="button" className={styles.primary} onClick={() => setView('checkout')}>
              Try the $12 lunch →
            </button>
          </>
        )}
      </div>
    </section>
  );
}
