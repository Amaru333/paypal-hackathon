'use client';
import { usePocket } from '@/features/dashboard/pocket-provider';
import { products, type Purchase } from '@/domain/wallet';
import { money, statusLabel } from '@/features/dashboard/format';
export function PurchaseList({
  items,
  detailed = false,
}: {
  items: Purchase[];
  detailed?: boolean;
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
              })}
            </span>
            {detailed && (
              <>
                <p>{p.explanation}</p>
                <p className="muted">{p.reason}</p>
                {p.error && <p className="inline-error">{p.error}</p>}
                {p.captureId && <small>PayPal capture: {p.captureId}</small>}
                <small>{p.source}</small>
              </>
            )}
          </div>
          <div className="transaction-end">
            <strong>{money(p.cents)}</strong>
            <span className={`status ${p.status}`}>{statusLabel[p.status]}</span>
            {parent && p.status === 'approval' && (
              <div className="inline-actions">
                <button
                  disabled={busy}
                  className="button small primary"
                  onClick={() => purchaseAction(p, 'approve')}
                >
                  Approve & pay
                </button>
                <button
                  disabled={busy}
                  className="button small ghost"
                  onClick={() => purchaseAction(p, 'decline')}
                >
                  Decline
                </button>
              </div>
            )}
            {((p.status === 'ready' && data.connected) ||
              (p.status === 'processing' && parent)) && (
              <button
                className="text-button"
                disabled={busy}
                onClick={() => purchaseAction(p, 'retry')}
              >
                {p.status === 'processing' ? 'Check payment' : 'Pay now'}
              </button>
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
        <button className="button secondary" onClick={() => changeTab('Shop')}>
          Explore the shop
        </button>
      )}
    </div>
  );
}
