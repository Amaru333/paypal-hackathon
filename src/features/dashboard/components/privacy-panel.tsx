'use client';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { usePocket } from '../pocket-provider';
import { dashboardApi } from '../api';

export function PrivacyPanel() {
  const { data, parent, busy, run, setNotice } = usePocket();
  const privacy = data.privacy;
  if (!privacy) return null;
  return (
    <section className="panel privacy-panel" aria-label="Privacy Mode">
      <span className="eyebrow">INDEPENDENCE WITH BOUNDARIES</span>
      <h2>Privacy Mode {privacy.enabled ? 'is on' : 'is off'}</h2>
      <p>
        {parent
          ? privacy.enabled
            ? 'You can see overall spending, reserved funds, and remaining budget. Purchase history, categories used, receipts, AI details, and exact transaction times are private.'
            : 'From age 16, your teen can choose to share only overall spending and remaining budget.'
          : 'From age 16, choose whether your parent can see your individual spending. You always keep your complete history and forecast.'}
      </p>
      <p className="form-note">
        Parents still set budgets, limits, and freezes. Approval exceptions and uncertain payments
        show the parent only an amount, status, and generic rule reason. This setting covers
        Pocket’s app; a funding-account owner may still see charges in PayPal.
      </p>
      {!parent && (
        <div className="flex items-center gap-3 mt-4">
          <Switch
            id="teen-privacy"
            checked={privacy.enabled}
            disabled={busy || !privacy.eligible}
            onCheckedChange={(enabled) =>
              run(async () => {
                await dashboardApi.privacy(data.childId!, enabled);
                setNotice(
                  enabled
                    ? 'Privacy Mode is on. Your parent now sees overall totals and necessary exceptions only.'
                    : 'Privacy Mode is off. Your parent can see your full purchase history again.',
                );
              })
            }
          />
          <Label htmlFor="teen-privacy">Share overall totals only</Label>
        </div>
      )}
      {!privacy.birthDate && (
        <p className="form-note">
          Ask your parent to set your birth date in Family to establish eligibility.
        </p>
      )}
      {privacy.age !== null && (
        <p className="form-note">
          Age {privacy.age} ·{' '}
          {privacy.eligible
            ? 'The teen controls this setting.'
            : 'Privacy Mode becomes available at 16.'}{' '}
          Based on the parent-entered birth date.
        </p>
      )}
      {!parent && (
        <p className="form-note">
          While on, old and new purchase details are hidden from parent APIs. Information already
          viewed or saved cannot be taken back. Turning it off shares your full history again.
        </p>
      )}
    </section>
  );
}
