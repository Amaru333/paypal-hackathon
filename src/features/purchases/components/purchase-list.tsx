'use client';
import { Button } from '@/components/ui/button';
import { usePocket } from '@/features/dashboard/pocket-provider';
import { products, type Purchase } from '@/domain/wallet';
import { money, statusLabel } from '@/features/dashboard/format';
import { CheckoutReceipt } from './checkout-receipt';
export function PurchaseList({
  items,
  detailed = false,
  timeZone,
}: {
  items: Purchase[];
  detailed?: boolean;
  timeZone?: string;
}) {
  const { data, busy, parent, tab, changeTab, purchaseAction } = usePocket();
  return items.length ? (
    <div className="transactions">
      {items.map((p) => (
        <div className="transaction" key={p.id}>
          <div
            className="transaction-icon"
            style={{ background: products.find((i) => i.id === p.productId)?.color }}
          >
            {products.find((i) => i.id === p.productId)?.icon || '✦'}
          </div>
          <div className="transaction-body">
            <strong>{p.name}</strong>
            <span>
              {p.category} ·{' '}
              {new Date(p.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                timeZone,
              })}
            </span>
            {p.warning && ['paid', 'processing', 'ready'].includes(p.status) && (
              <p className="budget-warning">
                {p.status === 'paid'
                  ? 'Paid · '
                  : p.status === 'processing'
                    ? 'Budget reserved · '
                    : 'Coverage planned · '}
                {p.warning}
              </p>
            )}
            {detailed && (
              <>
                <details className="checkout-details">
                  <summary>View checkout decision & receipt</summary>
                  <CheckoutReceipt purchase={p} />
                </details>
              </>
            )}
          </div>
          <div className="transaction-end">
            <strong>{money(p.cents)}</strong>
            <span className={`status ${p.status}`}>{statusLabel[p.status]}</span>
            {parent && p.status === 'approval' && (
              <div className="inline-actions">
                <Button
                  variant="ghost"
                  disabled={busy}
                  className="button small primary"
                  onClick={() => purchaseAction(p, 'approve')}
                >
                  Approve & pay
                </Button>
                <Button
                  variant="ghost"
                  disabled={busy}
                  className="button small ghost"
                  onClick={() => purchaseAction(p, 'decline')}
                >
                  Decline
                </Button>
              </div>
            )}
            {((p.status === 'ready' && data.connected) ||
              (p.status === 'processing' && parent)) && (
              <Button
                variant="ghost"
                className="text-button"
                disabled={busy}
                onClick={() => purchaseAction(p, 'retry')}
              >
                {p.status === 'processing' ? 'Check payment' : 'Pay with PayPal'}
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  ) : (
    <div className="empty">
      <span>↗</span>
      <h3>{tab === 'Requests' ? 'All caught up.' : 'A fresh start.'}</h3>
      <p>
        {tab === 'Requests'
          ? 'Purchases that need your say will appear here.'
          : 'Your first purchase will start the story here.'}
      </p>
      {!parent && (
        <Button variant="ghost" className="button secondary" onClick={() => changeTab('Shop')}>
          Explore the shop
        </Button>
      )}
    </div>
  );
}
