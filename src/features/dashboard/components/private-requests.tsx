'use client';
import { Button } from '@/components/ui/button';
import { usePocket } from '../pocket-provider';
import { money } from '../format';

export function PrivateRequests({ approvalsOnly = false }: { approvalsOnly?: boolean }) {
  const { data, busy, purchaseAction } = usePocket();
  const requests = (data.privateRequests || []).filter(
    (p) => !approvalsOnly || p.status === 'approval',
  );
  return (
    <section className="panel privacy-requests" aria-label="Private spending requests">
      <h2>{approvalsOnly ? 'Approval exceptions' : 'Spending controls & exceptions'}</h2>
      <p className="form-note">
        Privacy Mode is on. These are the amounts and statuses needed for your spending controls;
        individual purchase history stays private.
      </p>
      {requests.length ? (
        requests.map((request) => (
          <div className="private-request" key={request.id}>
            <div>
              <strong>{money(request.cents)}</strong>
              <p>{request.reason}</p>
            </div>
            {request.status === 'approval' ? (
              <div className="inline-actions">
                <Button disabled={busy} onClick={() => purchaseAction(request, 'approve')}>
                  Approve & pay
                </Button>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => purchaseAction(request, 'decline')}
                >
                  Decline
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => purchaseAction(request, 'retry')}
              >
                Check payment
              </Button>
            )}
          </div>
        ))
      ) : (
        <p>No exceptions waiting for you.</p>
      )}
    </section>
  );
}
