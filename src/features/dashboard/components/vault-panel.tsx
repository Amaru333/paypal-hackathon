'use client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { usePocket } from '../pocket-provider';
import { dashboardApi } from '../api';
import { money } from '../format';

export function VaultPanel() {
  const { data, parent, busy, run, setNotice } = usePocket();
  const [amount, setAmount] = useState('');
  const vault = data.vault;
  if (!parent || !vault || !data.childId) return null;
  const child = data.children.find((child) => child.id === data.childId);
  const cents = Math.round(Number(amount) * 100);
  async function release(value: number) {
    if (
      await run(async () => {
        await dashboardApi.vault(data.childId!, { cents: value });
        setNotice(`${money(value)} released into ${data.childName}’s spending budget.`);
      })
    )
      setAmount('');
  }
  return (
    <section className="panel vault-panel" aria-label={`${data.childName}’s private vault`}>
      <div className="panel-heading">
        <div>
          <span className="eyebrow">PARENT EYES ONLY</span>
          <h2>{data.childName}’s vault</h2>
        </div>
        <Badge className="status">
          {vault.enabled ? 'Saving automatically' : 'Auto-saving off'}
        </Badge>
      </div>
      <strong className="vault-value">{money(vault.balance)}</strong>
      <p className="muted">
        Unused budget moves here when the allowance renews. Only you can see this balance and
        release it.
      </p>
      <p className="form-note">
        Renewals wait for processing payments to finish. Released money follows existing category
        limits and approval rules.
      </p>
      <div className="flex items-center gap-3 mt-4">
        <Switch
          id="vault-saving"
          checked={vault.enabled}
          disabled={busy || !child?.joined}
          onCheckedChange={(enabled) =>
            run(async () => {
              await dashboardApi.vault(data.childId!, { enabled });
              setNotice(
                enabled
                  ? 'Vault mode enabled for future renewals.'
                  : 'Automatic saving turned off. Existing vault savings remain available.',
              );
            })
          }
        />
        <Label htmlFor="vault-saving" className="!mb-0">
          Automatic vault saving
        </Label>
      </div>
      {!child?.joined && <p className="form-note">Available once your child has joined.</p>}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void release(cents);
        }}
        className="vault-release"
      >
        <Label>
          Release to wallet ($)
          <Input
            type="number"
            min="0.01"
            step="0.01"
            max={vault.balance / 100}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
            disabled={busy || !vault.balance}
          />
        </Label>
        <Button
          variant="ghost"
          className="button primary"
          disabled={busy || !Number.isSafeInteger(cents) || cents <= 0 || cents > vault.balance}
        >
          Release amount →
        </Button>
        <Button
          variant="ghost"
          type="button"
          className="button secondary"
          disabled={busy || !vault.balance}
          onClick={() => void release(vault.balance)}
        >
          Release all {money(vault.balance)}
        </Button>
      </form>
      {!!data.policy.walletBonus && (
        <p className="form-note">
          {money(data.policy.walletBonus)} added to this period’s spending budget from the vault.
        </p>
      )}
    </section>
  );
}
