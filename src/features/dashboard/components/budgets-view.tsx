'use client';
import { usePocket } from '../pocket-provider';
import { categories } from '@/domain/wallet';
import { money, colors } from '../format';
import { dashboardApi } from '../api';
export default function BudgetsView() {
  const {
    data,
    busy,
    setNotice,
    setDraft,
    prompt,
    setPrompt,
    run,
    draft: pendingDraft,
  } = usePocket();
  const draft = pendingDraft || data.policy;

  return (
    <div className="settings-grid">
      <section className="panel budget-form">
        <h2>Make the allowance yours.</h2>
        <p className="muted">
          These amounts are spending permissions, not deposits to a child’s PayPal account.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              await dashboardApi.policy(data.childId!, draft);
              setNotice('Your new budget is saved. Existing spending still counts.');
            });
          }}
        >
          <div className="two-inputs">
            <label>
              Total allowance ($)
              <input
                type="number"
                min="1"
                max="1000"
                step="0.01"
                value={draft.allowance / 100}
                onChange={(e) =>
                  setDraft({ ...draft, allowance: Math.round(Number(e.target.value) * 100) })
                }
              />
            </label>
            <label>
              Renews every
              <select
                value={draft.periodDays}
                onChange={(e) => setDraft({ ...draft, periodDays: Number(e.target.value) })}
              >
                <option value={1}>Day</option>
                <option value={7}>Week</option>
                <option value={30}>30 days</option>
              </select>
            </label>
          </div>
          <div className="form-divider" />
          <h3>Give every dollar a place</h3>
          {categories.map((c, i) => (
            <label className="budget-input" key={c}>
              <span>
                <i style={{ background: colors[i] }} />
                {c}
              </span>
              <div>
                <span>$</span>
                <input
                  aria-label={`${c} budget in dollars`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.limits[c] / 100}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      limits: { ...draft.limits, [c]: Math.round(Number(e.target.value) * 100) },
                    })
                  }
                />
              </div>
            </label>
          ))}
          <p
            className={
              categories.reduce((s, c) => s + draft.limits[c], 0) === draft.allowance
                ? 'form-note'
                : 'inline-error'
            }
          >
            Allocated {money(categories.reduce((s, c) => s + draft.limits[c], 0))} of{' '}
            {money(draft.allowance)}. These amounts must match.
          </p>
          <div className="form-divider" />
          <label>
            Ask me before purchases over ($)
            <input
              type="number"
              min="0"
              step="0.01"
              value={draft.threshold / 100}
              onChange={(e) =>
                setDraft({ ...draft, threshold: Math.round(Number(e.target.value) * 100) })
              }
            />
          </label>
          <button disabled={busy} className="button primary">
            {busy ? 'Working…' : 'Save our budget →'}
          </button>
        </form>
      </section>
      <div>
        <section className="ai-card">
          <span className="eyebrow">✦ &nbsp; A LITTLE HELP FROM AI</span>
          <h2>
            Your words.
            <br />
            Your family’s rules.
          </h2>
          <p>
            Describe the allowance you have in mind. Review the proposed amounts before you save.
          </p>
          <label className="sr-only" htmlFor="policy-prompt">
            Describe your allowance policy
          </label>
          <textarea
            id="policy-prompt"
            rows={6}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={1000}
          />
          <button
            disabled={busy || !data.ai}
            className="button primary full"
            onClick={() =>
              run(async () => {
                const result = await dashboardApi.draft(data.childId!, prompt);
                setDraft(result.policy);
                setNotice('AI draft ready. Review the amounts, then choose Save our budget.');
              })
            }
          >
            {busy ? 'Thinking…' : 'Draft my budget ✦'}
          </button>
          {!data.ai && (
            <p className="form-note">
              AI drafting is currently unavailable. You can still set your budget manually.
            </p>
          )}
        </section>
        <section className="panel connection-settings">
          <h3>Payment connection</h3>
          <p>{data.connected ? '✓ PayPal is connected.' : 'PayPal is not connected.'}</p>
          <p className="muted">
            Payments use a PayPal test account. No real money moves. Your payment details stay
            private.
          </p>
          <div className="form-divider" />
          <h3>Spending controls</h3>
          <button
            className="button secondary"
            disabled={busy}
            onClick={() =>
              run(async () => {
                await dashboardApi.freeze(data.childId!, !data.policy.frozen);
                setDraft({ ...draft, frozen: !data.policy.frozen });
              })
            }
          >
            {data.policy.frozen ? 'Resume spending' : 'Pause spending'}
          </button>
        </section>
      </div>
    </div>
  );
}
