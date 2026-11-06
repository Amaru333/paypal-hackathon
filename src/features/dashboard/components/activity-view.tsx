'use client';
import { usePocket } from '../pocket-provider';
import { PurchaseList } from '@/features/purchases/components/purchase-list';
import type { Purchase } from '@/domain/wallet';
export default function ActivityView() {
  const { data } = usePocket();
  const renderPurchases = (items: Purchase[], detailed = false) => (
    <PurchaseList items={items} detailed={detailed} />
  );

  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>The pocket journal</h2>
        <span className="muted">{data.purchases.length} purchases</span>
      </div>
      {renderPurchases(data.purchases, true)}
    </section>
  );
}
