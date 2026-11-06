'use client';
import { usePocket } from '../pocket-provider';
import { PurchaseList } from '@/features/purchases/components/purchase-list';
import type { Purchase } from '@/domain/wallet';
export default function RequestsView() {
  const { pending } = usePocket();
  const renderPurchases = (items: Purchase[], detailed = false) => (
    <PurchaseList items={items} detailed={detailed} />
  );

  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>
          Needs your approval <span className="count">{pending.length}</span>
        </h2>
        <span className="muted">Your rules. Your call.</span>
      </div>
      {renderPurchases(pending, true)}
    </section>
  );
}
