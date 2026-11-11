'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { ActionCard, AnalysisCard, AssistantCard } from '@/domain/assistant';
import { categories } from '@/domain/wallet';
import { money } from '@/features/dashboard/format';
import Link from 'next/link';

function SpendingChart({ card }: { card: AnalysisCard }) {
  const [view, setView] = useState<'overall' | 'categories' | 'daily'>('overall');
  const [point, setPoint] = useState<{ label: string; cents: number } | null>(null);
  const total = Math.max(1, card.allowance, card.spent + card.reserved);
  const spent = (card.spent / total) * 100;
  const reserved = (card.reserved / total) * 100;
  const rows =
    view === 'categories'
      ? card.categories || []
      : (card.daily || []).map((r) => ({
          name: new Date(r.date + 'T12:00:00Z').toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          }),
          cents: r.cents,
        }));
  const largest = Math.max(1, ...rows.map((r) => r.cents));
  return (
    <>
      <div className="assistant-chart-tabs" role="group" aria-label="Spending chart view">
        <Button
          size="sm"
          variant={view === 'overall' ? 'default' : 'ghost'}
          aria-pressed={view === 'overall'}
          onClick={() => {
            setView('overall');
            setPoint(null);
          }}
        >
          Overall
        </Button>
        {!card.private && (
          <>
            <Button
              size="sm"
              variant={view === 'categories' ? 'default' : 'ghost'}
              aria-pressed={view === 'categories'}
              onClick={() => {
                setView('categories');
                setPoint(null);
              }}
            >
              Categories
            </Button>
            <Button
              size="sm"
              variant={view === 'daily' ? 'default' : 'ghost'}
              aria-pressed={view === 'daily'}
              onClick={() => {
                setView('daily');
                setPoint(null);
              }}
            >
              By day
            </Button>
          </>
        )}
      </div>
      {view === 'overall' ? (
        <div className="assistant-chart-overall">
          <div
            className="assistant-donut"
            role="img"
            aria-label={`Spent ${money(card.spent)}, reserved ${money(card.reserved)}, remaining ${money(card.remaining)}`}
            style={{
              background: `conic-gradient(#173c50 0 ${spent}%, #d7ad73 ${spent}% ${spent + reserved}%, #d9e7df ${spent + reserved}% 100%)`,
            }}
          >
            <span>
              <small>Available</small>
              <strong>{money(card.remaining)}</strong>
            </span>
          </div>
          <dl>
            <div>
              <dt>
                <i style={{ background: '#173c50' }} />
                Spent
              </dt>
              <dd>{money(card.spent)}</dd>
            </div>
            <div>
              <dt>
                <i style={{ background: '#d7ad73' }} />
                Reserved
              </dt>
              <dd>{money(card.reserved)}</dd>
            </div>
            <div>
              <dt>
                <i style={{ background: '#d9e7df' }} />
                Remaining
              </dt>
              <dd>{money(card.remaining)}</dd>
            </div>
          </dl>
        </div>
      ) : (
        <div
          className="assistant-bars"
          aria-label={
            view === 'daily'
              ? 'Completed spending by day'
              : 'Budget used by category, including reservations'
          }
        >
          {view === 'categories' && (
            <p className="form-note">
              Budget used, including reservations and Soft Decline allocations.
            </p>
          )}
          {rows.length ? (
            rows.map((r) => (
              <button
                key={r.name}
                type="button"
                onClick={() => setPoint({ label: r.name, cents: r.cents })}
                onFocus={() => setPoint({ label: r.name, cents: r.cents })}
                aria-label={`${r.name}: ${money(r.cents)}`}
              >
                <span>{r.name}</span>
                <span className="assistant-bar-track">
                  <i style={{ width: `${(r.cents / largest) * 100}%` }} />
                </span>
                <strong>{money(r.cents)}</strong>
              </button>
            ))
          ) : (
            <p>No completed purchases in this period.</p>
          )}
          {point && (
            <output className="assistant-chart-point" aria-live="polite">
              {point.label}: {money(point.cents)}
            </output>
          )}
        </div>
      )}
    </>
  );
}
function ActionDetails({ card }: { card: ActionCard }) {
  const { command, before } = card;
  if (command.kind === 'budget')
    return (
      <>
        <dl className="assistant-change-list">
          <div>
            <dt>Recurring allowance</dt>
            <dd>
              {money(before.allowance)} → <strong>{money(command.policy.allowance)}</strong>
            </dd>
          </div>
          <div>
            <dt>Renewal period</dt>
            <dd>
              {before.periodDays} → <strong>{command.policy.periodDays} days</strong>
            </dd>
          </div>
          {categories.map((c) => (
            <div key={c}>
              <dt>{c}</dt>
              <dd>
                {money(before.limits[c])} → <strong>{money(command.policy.limits[c])}</strong>
              </dd>
            </div>
          ))}
          <div>
            <dt>Approval threshold</dt>
            <dd>
              {money(before.threshold)} → <strong>{money(command.policy.threshold)}</strong>
            </dd>
          </div>
          <div>
            <dt>Soft Decline cap</dt>
            <dd>
              {money(before.softLimit ?? 1000)} → <strong>{money(command.policy.softLimit)}</strong>
            </dd>
          </div>
        </dl>
        <p className="form-note">
          Existing spending still counts. The current spending pause setting stays in force.
        </p>
      </>
    );
  if (command.kind === 'freeze')
    return (
      <>
        <p className="assistant-change-value">
          {command.frozen ? 'Pause new spending' : 'Resume spending'}
        </p>
        <p className="form-note">
          {before.frozen ? 'Spending is currently paused.' : 'Spending is currently active.'}{' '}
          Payments already sent may still complete.
        </p>
      </>
    );
  return (
    <>
      <p className="assistant-change-value">+{money(command.cents)}</p>
      <dl className="assistant-change-list">
        <div>
          <dt>Extra budget this period</dt>
          <dd>
            {money(before.walletBonus || 0)} →{' '}
            <strong>{money((before.walletBonus || 0) + command.cents)}</strong>
          </dd>
        </div>
        {command.kind === 'release_vault' && (
          <div>
            <dt>Parent vault</dt>
            <dd>
              {money(card.vaultBalance)} →{' '}
              <strong>{money(card.vaultBalance - command.cents)}</strong>
            </dd>
          </div>
        )}
      </dl>
      <p className="form-note">
        Spending permission only; no cash or PayPal transfer. Extra budget expires at renewal.
        Category limits, approvals, and freezes still apply.
      </p>
    </>
  );
}
export function AssistantCardView({
  card,
  busy,
  status,
  onDecision,
  onEditBudget,
}: {
  card: AssistantCard;
  busy: boolean;
  status?: string;
  onDecision: (id: string, decision: 'confirm' | 'cancel') => void;
  onEditBudget: (childId: string) => void;
}) {
  const expiresAt = card.type === 'action' ? card.expiresAt : null;
  const [expired, setExpired] = useState(() => !!expiresAt && Date.parse(expiresAt) <= Date.now());
  useEffect(() => {
    if (!expiresAt) return;
    const timer = setTimeout(
      () => setExpired(true),
      Math.max(0, Date.parse(expiresAt) - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [expiresAt]);
  return (
    <section className="assistant-card">
      <div className="assistant-card-heading">
        <span className="eyebrow">{card.childName}</span>
        <span className="assistant-tag">
          {card.type === 'action'
            ? 'Review change'
            : card.type === 'analysis' && card.private
              ? 'Privacy Mode'
              : 'Snapshot'}
        </span>
      </div>
      {card.type === 'family' ? (
        <>
          <h3>Your family at a glance</h3>
          {card.children.length ? (
            card.children.map((c) => (
              <div className="assistant-family-row" key={c.id}>
                <div>
                  <strong>{c.name}</strong>
                  <span>
                    {c.private
                      ? 'Privacy Mode · overall totals'
                      : c.frozen
                        ? 'Spending paused'
                        : 'Current allowance period'}
                  </span>
                </div>
                <p>{money(c.remaining)} available</p>
                <div
                  className="assistant-family-bar"
                  role="img"
                  aria-label={`${c.name}: ${money(c.spent)} spent, ${money(c.reserved)} reserved, ${money(c.remaining)} remaining`}
                >
                  <i
                    style={{
                      width: `${Math.min(100, ((c.spent + c.reserved) / Math.max(1, c.spent + c.reserved + c.remaining)) * 100)}%`,
                    }}
                  />
                </div>
                <small>
                  {money(c.spent)} spent · {money(c.reserved)} reserved · {c.requests} requests
                </small>
              </div>
            ))
          ) : (
            <p>Add a child in Family to start a spending plan.</p>
          )}
          <p className="form-note">
            Each child’s totals reflect their own current allowance period. Private details are
            never included.
          </p>
        </>
      ) : card.type === 'analysis' ? (
        <>
          <h3>Where the budget stands</h3>
          <SpendingChart card={card} />
          <p className="form-note">
            Current allowance period · renews {new Date(card.renewsAt).toLocaleDateString()}
          </p>
          {card.private ? (
            <p className="assistant-private-note">
              Overall totals only. Your teen’s purchase details, categories used, and transaction
              timeline stay private.
            </p>
          ) : (
            <>
              {card.forecast && (
                <div className="assistant-insight">
                  <strong>
                    {card.forecast.status === 'at-risk'
                      ? 'Spending may outpace this allowance'
                      : card.forecast.status === 'on-track'
                        ? 'The current pace is within budget'
                        : 'Building a picture of this period'}
                  </strong>
                  {card.forecast.dailyRateCents !== null && (
                    <p>
                      Recorded pace: {money(Math.round(card.forecast.dailyRateCents))}/day.{' '}
                      {card.forecast.projectedEndCents !== null
                        ? `Estimated remaining at renewal: ${money(Math.round(card.forecast.projectedEndCents))}.`
                        : ''}{' '}
                      Estimates can change.
                    </p>
                  )}
                </div>
              )}
              {!!card.purchases?.length && (
                <details>
                  <summary>Explore completed purchases</summary>
                  <dl className="assistant-change-list">
                    {card.purchases.map((p) => (
                      <div key={p.name}>
                        <dt>
                          {p.name} ×{p.count}
                        </dt>
                        <dd>{money(p.cents)}</dd>
                      </div>
                    ))}
                  </dl>
                </details>
              )}
            </>
          )}
        </>
      ) : card.type === 'action' ? (
        <>
          <h3>
            {card.command.kind === 'top_up'
              ? 'Add extra spending budget'
              : card.command.kind === 'budget'
                ? 'Update the budget'
                : card.command.kind === 'release_vault'
                  ? 'Release saved vault budget'
                  : 'Change spending controls'}
          </h3>
          <ActionDetails card={card} />
          {status ? (
            <p className="assistant-action-status" role="status">
              {status === 'applied'
                ? '✓ Applied successfully'
                : status === 'cancelled'
                  ? 'Cancelled · nothing changed'
                  : status}
            </p>
          ) : (
            <>
              <p className="form-note">
                Review expires{' '}
                {new Date(card.expiresAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                . Nothing changes until you apply.
              </p>
              <div className="assistant-card-actions">
                <Button disabled={busy || expired} onClick={() => onDecision(card.id, 'confirm')}>
                  {expired ? 'Proposal expired' : 'Apply change'}
                </Button>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => onDecision(card.id, 'cancel')}
                >
                  Cancel
                </Button>
              </div>
            </>
          )}
        </>
      ) : card.type === 'budget' ? (
        <>
          <h3>
            {money(card.policy.allowance)} every {card.policy.periodDays} days
          </h3>
          <dl className="assistant-change-list">
            {categories.map((c) => (
              <div key={c}>
                <dt>{c} limit</dt>
                <dd>{money(card.policy.limits[c])}</dd>
              </div>
            ))}
            <div>
              <dt>Approval threshold</dt>
              <dd>{money(card.policy.threshold)}</dd>
            </div>
            <div>
              <dt>Soft Decline cap</dt>
              <dd>{money(card.policy.softLimit ?? 1000)}</dd>
            </div>
            <div>
              <dt>Parent vault</dt>
              <dd>{money(card.vaultBalance)}</dd>
            </div>
          </dl>
          <Button variant="outline" disabled={busy} onClick={() => onEditBudget(card.childId)}>
            Edit this budget
          </Button>
        </>
      ) : (
        <>
          <h3>Requests that need you</h3>
          {card.requests.length ? (
            <>
              <dl className="assistant-change-list">
                {card.requests.map((r) => (
                  <div key={r.id}>
                    <dt>{r.reason}</dt>
                    <dd>{money(r.cents)}</dd>
                  </div>
                ))}
              </dl>
              <Link
                className="assistant-open-link"
                href={`/parent/children/${encodeURIComponent(card.childId)}/requests`}
              >
                Open approval requests →
              </Link>
              <Link
                className="assistant-open-link"
                href={`/parent/children/${encodeURIComponent(card.childId)}/activity`}
              >
                Check processing payments →
              </Link>
            </>
          ) : (
            <p>No pending exceptions.</p>
          )}
        </>
      )}
    </section>
  );
}
