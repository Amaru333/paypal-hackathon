'use client';
import { usePocket } from '../pocket-provider';
import { PurchaseList } from '@/features/purchases/components/purchase-list';
import styles from './dashboard.module.css';

export default function ActivityView() {
  const { data } = usePocket();

  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h2>Purchase history</h2>
        <span>
          {data.purchases.length} {data.purchases.length === 1 ? 'item' : 'items'}
        </span>
      </div>
      <PurchaseList items={data.purchases} detailed />
    </section>
  );
}
