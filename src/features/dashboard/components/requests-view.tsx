'use client';
import { usePocket } from '../pocket-provider';
import { PurchaseList } from '@/features/purchases/components/purchase-list';
import styles from './dashboard.module.css';

export default function RequestsView() {
  const { pending } = usePocket();

  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h2>Needs approval</h2>
        <span>
          {pending.length} {pending.length === 1 ? 'request' : 'requests'}
        </span>
      </div>
      <PurchaseList items={pending} detailed />
    </section>
  );
}
