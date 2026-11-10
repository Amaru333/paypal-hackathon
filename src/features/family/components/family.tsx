'use client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { money } from '@/features/dashboard/format';
import type { ChildSummary, InviteResult } from '@/features/dashboard/types';
import styles from '@/features/dashboard/components/dashboard.module.css';

type Props = {
  members: ChildSummary[];
  busy: boolean;
  invitation: InviteResult | null;
  onAdd: (name: string, email: string) => Promise<boolean>;
  onInvite: (id: string) => Promise<void>;
  onRevoke: (id: string) => Promise<void>;
  onSelect: (id: string) => void;
};

function periodLabel(days: number) {
  if (days === 1) return 'Daily';
  if (days === 7) return 'Weekly';
  return `${days}-day`;
}

function statusCopy(child: ChildSummary) {
  if (child.joined) return child.frozen ? 'Spending paused' : `@${child.username}`;
  if (child.invitationStatus === 'expired') return 'Invitation expired';
  if (child.invitationStatus === 'pending') return 'Waiting for signup';
  return 'Needs an invitation';
}

export default function Family(props: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [copied, setCopied] = useState(false);

  return (
    <>
      <div className={styles.familyLayout}>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2>Children</h2>
            <span>
              {props.members.length} {props.members.length === 1 ? 'pocket' : 'pockets'}
            </span>
          </div>
          {props.members.length ? (
            <div className={styles.childList}>
              {props.members.map((child, index) => (
                <article className={styles.childRow} key={child.id}>
                  <div className={`${styles.avatar} ${index % 2 ? styles.avatarAlt : ''}`}>
                    {child.name.slice(0, 1)}
                  </div>
                  <div className={styles.childMeta}>
                    <h3>{child.name}</h3>
                    <p>{statusCopy(child)}</p>
                    <div className={styles.childStats}>
                      <span className={styles.chip}>
                        {money(child.remaining)} left of {money(child.allowance)}
                      </span>
                      <span className={styles.chip}>{periodLabel(child.periodDays)}</span>
                      {child.requests > 0 && (
                        <span className={`${styles.chip} ${styles.chipWarn}`}>
                          {child.requests} to review
                        </span>
                      )}
                      {child.joined && !child.frozen && (
                        <span className={`${styles.chip} ${styles.chipOk}`}>Active</span>
                      )}
                    </div>
                  </div>
                  <div className={styles.childActions}>
                    <Button
                      variant="ghost"
                      className="button small primary"
                      disabled={props.busy}
                      onClick={() => props.onSelect(child.id)}
                    >
                      Open pocket
                    </Button>
                    {!child.joined && (
                      <>
                        <Button
                          variant="ghost"
                          className="text-button"
                          disabled={props.busy}
                          onClick={() => {
                            setCopied(false);
                            void props.onInvite(child.id);
                          }}
                        >
                          Send new invitation
                        </Button>
                        {child.invitationStatus === 'pending' && (
                          <Button
                            variant="ghost"
                            className="text-button"
                            disabled={props.busy}
                            onClick={() => void props.onRevoke(child.id)}
                          >
                            Revoke link
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <h3>No children yet</h3>
              <p>Add your first child to create a pocket, invitation, and spending plan.</p>
            </div>
          )}
        </section>

        <section className={`${styles.panel} ${styles.sidePanel}`}>
          <span className="eyebrow">ADD A CHILD</span>
          <h2>Invite someone in</h2>
          <p>
            We’ll create a private invitation so they can choose their own username and password.
          </p>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              if (!(await props.onAdd(name, email))) return;
              setName('');
              setEmail('');
              setCopied(false);
            }}
          >
            <Label>
              Child’s first name
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                maxLength={40}
                placeholder="e.g. Maya"
              />
            </Label>
            <Label>
              Child’s email
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                maxLength={254}
                placeholder="child@example.com"
              />
            </Label>
            <Button variant="ghost" className="button primary full" disabled={props.busy}>
              {props.busy ? 'Working…' : 'Add child & invite'}
            </Button>
          </form>
          <p className="form-note">
            Links expire after 24 hours and can only be used once. Creating a new invitation
            replaces the previous one.
          </p>
        </section>
      </div>

      {props.invitation && (
        <section className={styles.inviteBanner} aria-live="polite">
          <span className="eyebrow">
            {props.invitation.emailStatus === 'sent' ? 'INVITATION SENT' : 'INVITATION READY'}
          </span>
          <h2>Share this private link</h2>
          <p>
            It expires {new Date(props.invitation.expiresAt).toLocaleString()}.
            {props.invitation.emailStatus === 'sent'
              ? ` We also emailed ${props.invitation.email}.`
              : props.invitation.emailStatus === 'not_configured'
                ? ' Email isn’t configured yet, so share the link directly.'
                : props.invitation.emailStatus === 'missing_email'
                  ? ' This child has no email on file, so share the link directly.'
                  : ' The email couldn’t be sent, so share the link directly or create a new invitation.'}
          </p>
          <Label>
            Invitation link
            <Input
              readOnly
              value={props.invitation.url}
              onFocus={(event) => event.currentTarget.select()}
            />
          </Label>
          <Button
            variant="ghost"
            className="button primary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(props.invitation!.url);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            {copied ? 'Copied' : 'Copy link'}
          </Button>
        </section>
      )}
    </>
  );
}
