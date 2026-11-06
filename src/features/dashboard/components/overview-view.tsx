'use client';
import { usePocket } from '../pocket-provider';
import { categories } from '@/domain/wallet';
import { money, colors, icons } from '../format';
import { dashboardApi } from '../api';
import { PurchaseList } from '@/features/purchases/components/purchase-list';
import type { Purchase } from '@/domain/wallet';
import { KidsPocketCard } from './kids-pocket-card';
export default function OverviewView() {
  const { data, busy, setNotice, parent, changeTab, run, pending, remaining, periodName, date } =
    usePocket();
  const renderPurchases = (items: Purchase[], detailed = false) => (
    <PurchaseList items={items} detailed={detailed} />
  );

  return (
    <>
      <div className="overview-grid">
        {!parent ? (
          <KidsPocketCard
            name={data.childName}
            remaining={remaining}
            allowance={data.policy.allowance}
            reserved={data.reserved}
            periodName={periodName}
            date={date}
            frozen={data.policy.frozen}
          />
        ) : (
          <section className="balance-card">
            <div className="card-top">
              <span>{data.childName.toUpperCase()}’S POCKET</span>
              <span className="balance-tag">{periodName} allowance</span>
            </div>
            <div className="balance-body">
              <div>
                <p>Available to explore</p>
                <div className="balance-value">
                  ${Math.floor(remaining / 100)}
                  <span>.{String(remaining % 100).padStart(2, '0')}</span>
                </div>
                <p className="balance-caption">of {money(data.policy.allowance)} this period</p>
              </div>
              <div className="pocket-art" aria-hidden="true">
                <span>✦</span>
                <div>p.</div>
              </div>
            </div>
            <div className="balance-progress">
              <span
                style={{ width: `${Math.min(100, (remaining / data.policy.allowance) * 100)}%` }}
              />
            </div>
            <div className="balance-footer">
              <span>↻ &nbsp; Renews {date}</span>
              <span>
                {data.reserved ? `${money(data.reserved)} reserved` : 'A fresh start, every period'}
              </span>
            </div>
          </section>
        )}
        <section className="stats-stack">
          <div className="stat-card">
            <div className="stat-icon peach">↗</div>
            <div>
              <span>Spent this period</span>
              <strong>{money(data.spent)}</strong>
              <small>
                {
                  data.purchases.filter((p) => p.status === 'paid' && p.period === data.period)
                    .length
                }{' '}
                completed purchases
              </small>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon sage">▱</div>
            <div>
              <span>{parent ? 'Waiting for your say' : 'With your parent'}</span>
              <strong>
                {pending.length}
                <em> {pending.length === 1 ? 'request' : 'requests'}</em>
              </strong>
              <button
                className="text-button"
                onClick={() => changeTab(parent ? 'Requests' : 'Activity')}
              >
                {pending.length ? 'Take a look →' : 'You’re all caught up ✓'}
              </button>
            </div>
          </div>
        </section>
      </div>
      <div className="section-heading">
        <div>
          <h2>A place for every dollar</h2>
          <p className="muted">Thoughtful limits, everyday freedom.</p>
        </div>
        {parent && (
          <button className="text-button" onClick={() => changeTab('Budgets')}>
            Edit budgets ↗
          </button>
        )}
      </div>
      <div className="budget-grid">
        {categories.map((c, i) => (
          <section className="budget-card" key={c}>
            <div className="budget-title">
              <span
                className="category-icon"
                style={{ background: `${colors[i]}28`, color: colors[i] }}
              >
                {icons[i]}
              </span>
              <span>{c}</span>
            </div>
            <div className="budget-value">
              {money(Math.max(0, data.policy.limits[c] - data.used[c]))}
              <small> left</small>
            </div>
            <div className="progress">
              <span
                style={{
                  width: `${data.policy.limits[c] ? Math.min(100, (data.used[c] / data.policy.limits[c]) * 100) : 0}%`,
                  background: colors[i],
                }}
              />
            </div>
            <small>
              {money(data.used[c])} used of {money(data.policy.limits[c])}
            </small>
          </section>
        ))}
      </div>
      <div className="bottom-grid">
        <section className="panel">
          <div className="panel-heading">
            <h2>Recent little steps</h2>
            <button className="text-button" onClick={() => changeTab('Activity')}>
              View all ↗
            </button>
          </div>
          {renderPurchases(data.purchases.slice(0, 4))}
        </section>
        <section className="guidance-card">
          <span className="eyebrow">
            {parent ? 'YOU SET THE PACE' : 'A LITTLE FOOD FOR THOUGHT'}
          </span>
          <div className="sun-symbol">✳</div>
          <h2>{parent ? 'Independence, with a safety net.' : 'Today’s small choices add up.'}</h2>
          <p>
            {parent
              ? `Purchases over ${money(data.policy.threshold)} need your approval. You can pause new spending at any time.`
              : `You have ${money(remaining)} to use until ${date}. Check your categories before choosing your next purchase.`}
          </p>
          {parent ? (
            <button
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
              {data.policy.frozen ? '▷ Resume spending' : 'Ⅱ Pause spending'}
            </button>
          ) : (
            <button className="button primary" onClick={() => changeTab('Shop')}>
              Find your next little thing ↗
            </button>
          )}
        </section>
      </div>
    </>
  );
}
