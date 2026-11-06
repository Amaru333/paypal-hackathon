'use client';
import { usePocket } from '../pocket-provider';
import { products } from '@/domain/wallet';
import { money } from '../format';
export default function ShopView() {
  const { data, busy, setSelected, setRequestKey } = usePocket();

  return (
    <>
      <div className="shop-note">
        <span>✦</span>
        <p>
          Purchases within your limits can be paid automatically. Bigger choices go to your parent.
        </p>
      </div>
      <div className="shop-grid">
        {products
          .filter((product) => product.id !== 'test')
          .map((p) => (
            <article className="product" key={p.id}>
              <div className="product-art" style={{ background: p.color }}>
                <span>{p.icon}</span>
                <small>{p.category}</small>
              </div>
              <div className="product-body">
                <h2>{p.name}</h2>
                <p>{p.description}</p>
                <div>
                  <strong>{money(p.cents)}</strong>
                  <button
                    className="button secondary small"
                    disabled={busy || data.policy.frozen}
                    onClick={() => {
                      setSelected(p);
                      setRequestKey(crypto.randomUUID());
                    }}
                  >
                    Take a look ↗
                  </button>
                </div>
              </div>
            </article>
          ))}
      </div>
    </>
  );
}
