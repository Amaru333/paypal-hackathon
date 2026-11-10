'use client';
import { Button } from '@/components/ui/button';
import { VaultPanel } from './vault-panel';
import { usePocket } from '../pocket-provider';
import { categories } from '@/domain/wallet';
import { money, colors } from '../format';
import { dashboardApi } from '../api';
import { PurchaseList } from '@/features/purchases/components/purchase-list';
import styles from './dashboard.module.css';
import { SpendingForecastPanel } from './spending-forecast-panel';

export default function OverviewView({ preview = false }: { preview?: boolean }) {
  const { data, busy, setNotice, parent, changeTab, run, pending, remaining, periodName, date } =
    usePocket();

  const paidCount = data.purchases.filter(
    (purchase) => purchase.status === 'paid' && purchase.period === data.period,
  ).length;
  const spendable = data.policy.allowance + (data.policy.walletBonus || 0);
  const remainingPercent = spendable ? Math.min(100, (remaining / spendable) * 100) : 0;

  return (
    <>
      <div className={styles.hero}>
        <section className={styles.balance}>
          <div className={styles.balanceTop}>
            <strong>{parent ? `${data.childName}’s pocket` : 'Available now'}</strong>
            <span>{periodName} allowance</span>
          </div>
          <div className={styles.balanceAmount}>
            ${Math.floor(remaining / 100)}
            <span>.{String(remaining % 100).padStart(2, '0')}</span>
          </div>
          <p className={styles.balanceCaption}>of {money(spendable)} this period</p>
          <div className={styles.balanceBar} aria-hidden="true">
            <span style={{ width: `${remainingPercent}%` }} />
          </div>
          <div className={styles.balanceFoot}>
            <span>Renews {date}</span>
            <span>{data.reserved ? `${money(data.reserved)} reserved` : 'Nothing reserved'}</span>
          </div>
        </section>

        <section className={styles.metrics}>
          <div className={styles.metric}>
            <span>Spent this period</span>
            <strong>{money(data.spent)}</strong>
            <Button variant="ghost" type="button" onClick={() => changeTab('Activity')}>
              {paidCount} completed →
            </Button>
          </div>
          <div className={styles.metric}>
            <span>{parent ? 'Waiting for approval' : 'With your parent'}</span>
            <strong>{pending.length}</strong>
            <Button
              variant="ghost"
              type="button"
              onClick={() => changeTab(parent ? 'Requests' : 'Activity')}
            >
              {pending.length ? 'Review requests →' : 'You’re caught up →'}
            </Button>
          </div>
        </section>
      </div>

      {parent && <VaultPanel />}
      {!parent && data.forecast && (
        <SpendingForecastPanel
          key={data.period}
          forecast={data.forecast}
          timeZone={preview ? 'UTC' : undefined}
        />
      )}
      {data.purchases.some((p) => p.status === 'paid' && p.warning && p.period === data.period) && (
        <section className="panel" aria-label="Soft Decline notifications">
          <h2>{parent ? 'Spending check-ins' : 'A little budget guidance'}</h2>
          {data.purchases
            .filter((p) => p.status === 'paid' && p.warning && p.period === data.period)
            .slice(0, 3)
            .map((p) => (
              <p className="budget-warning" key={p.id}>
                <strong>{p.name} · Paid</strong>
                <br />
                {p.warning}
              </p>
            ))}
        </section>
      )}
      <div className={styles.sectionHead}>
        <div>
          <h2>Categories</h2>
          <p>What’s left in each spending bucket.</p>
        </div>
        {parent && (
          <Button variant="ghost" className="text-button" onClick={() => changeTab('Budgets')}>
            Edit budgets
          </Button>
        )}
      </div>

      <div className={styles.categories}>
        {categories.map((category, index) => {
          const limit = data.policy.limits[category];
          const used = data.used[category];
          const left = Math.max(0, limit - used);
          return (
            <section className={styles.category} key={category}>
              <div className={styles.categoryTop}>
                <span className={styles.dot} style={{ background: colors[index] }} />
                {category}
              </div>
              <div className={styles.categoryValue}>
                {money(left)}
                <small> left</small>
              </div>
              <div className={styles.progress}>
                <span
                  style={{
                    width: `${limit ? Math.min(100, (used / limit) * 100) : 0}%`,
                    background: colors[index],
                  }}
                />
              </div>
              <small className={styles.categoryNote}>
                {money(used)} used of {money(limit)}
              </small>
            </section>
          );
        })}
      </div>

      <div className={styles.split}>
        <section className={`${styles.panel}`}>
          <div className={styles.panelHead}>
            <h2>Recent activity</h2>
            <Button variant="ghost" className="text-button" onClick={() => changeTab('Activity')}>
              View all
            </Button>
          </div>
          <PurchaseList items={data.purchases.slice(0, 4)} timeZone={preview ? 'UTC' : undefined} />
        </section>

        <section className={styles.controlCard}>
          <span className="eyebrow">{parent ? 'CONTROLS' : 'NEXT STEP'}</span>
          <h2>{parent ? 'Keep spending on your terms' : 'Ready for a small purchase?'}</h2>
          <p>
            {parent
              ? `Purchases over ${money(data.policy.threshold)} need your approval. You can pause new spending anytime.`
              : `You have ${money(remaining)} left until ${date}. Check your categories before you shop.`}
          </p>
          {parent ? (
            <Button
              variant="ghost"
              disabled={busy}
              className="button secondary"
              onClick={() =>
                run(async () => {
                  await dashboardApi.freeze(data.childId!, !data.policy.frozen);
                  setNotice(
                    data.policy.frozen
                      ? 'Spending resumed.'
                      : 'New spending is paused. Payments already sent may still complete.',
                  );
                })
              }
            >
              {data.policy.frozen ? 'Resume spending' : 'Pause spending'}
            </Button>
          ) : (
            <Button variant="ghost" className="button primary" onClick={() => changeTab('Shop')}>
              Go to shop
            </Button>
          )}
        </section>
      </div>
    </>
  );
}
