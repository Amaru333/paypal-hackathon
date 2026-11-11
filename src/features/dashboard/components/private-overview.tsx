'use client';
import { Button } from '@/components/ui/button';
import { usePocket } from '../pocket-provider';
import { dashboardApi } from '../api';
import { money } from '../format';
import { PrivacyPanel } from './privacy-panel';
import { PrivateRequests } from './private-requests';
import { VaultPanel } from './vault-panel';

export function PrivateOverview() {
  const { data, busy, remaining, run, setNotice, changeTab } = usePocket();
  return (
    <>
      <PrivacyPanel />
      <section className="panel privacy-summary" aria-label="Overall spending only">
        <h2>{data.childName}’s overall budget</h2>
        <dl className="privacy-totals">
          <div>
            <dt>Spent this period</dt>
            <dd>{money(data.spent)}</dd>
          </div>
          <div>
            <dt>Reserved</dt>
            <dd>{money(data.reserved)}</dd>
          </div>
          <div>
            <dt>Available now</dt>
            <dd>{money(remaining)}</dd>
          </div>
        </dl>
        <div className="inline-actions">
          <Button disabled={busy} onClick={() => changeTab('Budgets')}>
            Manage budgets & limits
          </Button>
          <Button
            variant="outline"
            disabled={busy}
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
        </div>
      </section>
      <PrivateRequests />
      <VaultPanel />
    </>
  );
}
