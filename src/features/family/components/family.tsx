'use client';
import { useState } from 'react';
import type { ChildSummary, InviteResult } from '@/features/dashboard/types';
type Props = {
  members: ChildSummary[];
  busy: boolean;
  invitation: InviteResult | null;
  onAdd: (name: string) => Promise<void>;
  onInvite: (id: string) => Promise<void>;
  onRevoke: (id: string) => Promise<void>;
  onSelect: (id: string) => void;
};
export default function Family(props: Props) {
  const [name, setName] = useState('');
  const [copied, setCopied] = useState(false);
  return (
    <>
      <div className="family-intro">
        <div>
          <span className="eyebrow">ONE FAMILY. ROOM FOR EVERYONE.</span>
          <h2>Growing together starts here.</h2>
          <p>Add a child, share their invitation, and let them make their pocket their own.</p>
        </div>
        <span aria-hidden="true">✳</span>
      </div>
      <div className="family-grid">
        <section className="panel">
          <div className="panel-heading">
            <h2>
              Your children <span className="count">{props.members.length}</span>
            </h2>
          </div>
          {props.members.length ? (
            props.members.map((child) => (
              <article className="child-row" key={child.id}>
                <div className="avatar">{child.name.slice(0, 1)}</div>
                <div className="child-details">
                  <h3>{child.name}</h3>
                  <p>
                    {child.joined
                      ? `@${child.username} · ${child.frozen ? 'Spending paused' : 'Ready to explore'}`
                      : child.invitationStatus === 'pending'
                        ? 'Waiting for signup · share their invitation link'
                        : child.invitationStatus === 'expired'
                          ? 'Invitation expired · create a fresh link'
                          : 'Waiting for an invitation'}
                  </p>
                  <span className={`status ${child.joined ? 'paid' : 'approval'}`}>
                    {child.joined
                      ? 'Joined'
                      : child.invitationStatus === 'pending'
                        ? 'Awaiting signup'
                        : child.invitationStatus === 'expired'
                          ? 'Expired'
                          : 'Not invited'}
                  </span>
                  {child.requests > 0 && (
                    <span className="status approval">{child.requests} awaiting approval</span>
                  )}
                </div>
                <div className="child-actions">
                  <button
                    className="button small secondary"
                    disabled={props.busy}
                    onClick={() => props.onSelect(child.id)}
                  >
                    Open pocket ↗
                  </button>
                  {!child.joined && (
                    <>
                      <button
                        className="text-button"
                        disabled={props.busy}
                        onClick={() => {
                          setCopied(false);
                          props.onInvite(child.id);
                        }}
                      >
                        Create new invitation
                      </button>
                      {child.invitationStatus === 'pending' && (
                        <button
                          className="text-button"
                          disabled={props.busy}
                          onClick={() => props.onRevoke(child.id)}
                        >
                          Revoke invitation
                        </button>
                      )}
                    </>
                  )}
                </div>
              </article>
            ))
          ) : (
            <div className="empty">
              <span>✦</span>
              <h3>Your family space is ready.</h3>
              <p>No need to set everything up at once. Add your first child when you’re ready.</p>
            </div>
          )}
        </section>
        <section className="panel add-child">
          <span className="eyebrow">A LITTLE INVITATION</span>
          <h2>Make room for someone.</h2>
          <p className="muted">
            They’ll choose their own username and password. No email address is needed for the
            child.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await props.onAdd(name);
              setName('');
              setCopied(false);
            }}
          >
            <label>
              Child’s first name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={40}
                placeholder="e.g. Maya"
              />
            </label>
            <button className="button primary full" disabled={props.busy}>
              {props.busy ? 'One moment…' : 'Add child & create invitation →'}
            </button>
          </form>
          <p className="form-note">
            Links expire after 24 hours and can be used once. A new invitation immediately replaces
            the old one.
          </p>
        </section>
      </div>
      {props.invitation && (
        <section className="invite-card" aria-live="polite">
          <div>
            <span className="eyebrow">READY TO SHARE</span>
            <h2>An invitation to a little independence.</h2>
            <p>
              Share this private link with your child. It expires{' '}
              {new Date(props.invitation.expiresAt).toLocaleString()}.
            </p>
          </div>
          <label>
            Private invitation link
            <input
              readOnly
              value={props.invitation.url}
              onFocus={(e) => e.currentTarget.select()}
            />
          </label>
          <button
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
            {copied ? 'Copied ✓' : 'Copy invitation link'}
          </button>
          <p className="form-note">
            Share the link directly with your child; an email is not sent automatically. Open it in
            a private window or a separate browser so your child can set up their account.
          </p>
        </section>
      )}
    </>
  );
}
