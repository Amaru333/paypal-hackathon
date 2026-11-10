'use client';
import { Button } from '@/components/ui/button';
import { usePocket } from '../pocket-provider';
import { products } from '@/domain/wallet';
import { money } from '../format';
import styles from './dashboard.module.css';

export default function ShopView() {
  const { data, busy, setSelected, setRequestKey } = usePocket();

  return (
    <>
      <div className={styles.banner}>
        <div>
          <strong>Pocket demo store · PayPal sandbox checkout</strong>
          <p>
            Pick an item, check your budget, then pay with PayPal test money. Small category
            shortfalls can use Soft Decline coverage; bigger purchases need your parent. No real
            money moves and no goods are delivered.
          </p>
        </div>
      </div>
      <div className="shop-grid">
        {products
          .filter((product) => product.id !== 'test')
          .map((product) => (
            <article className="product" key={product.id}>
              <div className="product-art" style={{ background: product.color }}>
                <span>{product.icon}</span>
                <small>{product.category}</small>
              </div>
              <div className="product-body">
                <h2>{product.name}</h2>
                <p>{product.description}</p>
                <div>
                  <strong>{money(product.cents)}</strong>
                  <Button
                    id={`purchase-${product.id}`}
                    variant="ghost"
                    className="button secondary small"
                    disabled={busy || data.policy.frozen}
                    onClick={() => {
                      setSelected(product);
                      setRequestKey(crypto.randomUUID());
                    }}
                  >
                    Checkout
                  </Button>
                </div>
              </div>
            </article>
          ))}
      </div>
    </>
  );
}
