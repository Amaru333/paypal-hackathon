'use client';
import { usePocket, usePocketState } from '../pocket-provider';
import { money } from '../format';
import { dashboardApi } from '../api';
export default function PurchaseDialog() {
  const { data, selected } = usePocketState();
  if (!data || !selected) return null;
  return <LoadedPurchaseDialog />;
}
function LoadedPurchaseDialog() {
  const { data, busy, setNotice, selected, setSelected, requestKey, changeTab, run } = usePocket();

  return (
    selected && (
      <div className="modal-backdrop" onClick={() => !busy && setSelected(null)}>
        <section
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="purchase-title"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="modal-close"
            aria-label="Close purchase"
            disabled={busy}
            onClick={() => setSelected(null)}
          >
            ×
          </button>
          <div className="modal-icon" style={{ background: selected.color }}>
            {selected.icon}
          </div>
          <span className="eyebrow">A LITTLE SOMETHING FOR YOU</span>
          <h2 id="purchase-title">{selected.name}</h2>
          <p>{selected.description}</p>
          <strong className="modal-price">{money(selected.cents)}</strong>
          <div className="shop-note">
            <p>
              Your budget is checked before payment. If it fits and PayPal is connected, this button
              makes a purchase with test money. No real money moves and no goods are delivered.
              Otherwise, we’ll ask your parent or hold it ready.
            </p>
          </div>
          <button
            autoFocus
            disabled={busy}
            className="button primary full"
            onClick={() =>
              run(async () => {
                const result = await dashboardApi.purchase(data.childId!, selected.id, requestKey);
                setNotice(result.purchase.error || result.purchase.reason);
                setSelected(null);
                changeTab('Activity');
              })
            }
          >
            {busy ? 'Checking your pocket…' : `Request / pay ${money(selected.cents)} →`}
          </button>
        </section>
      </div>
    )
  );
}
