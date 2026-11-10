import type { Purchase } from '@/domain/wallet';
import { money } from '@/features/dashboard/format';
import { classificationThreshold } from '@/domain/receipt';
import styles from './checkout.module.css';

export function ReceiptEvidence({ purchase }: { purchase: Purchase }) {
  const { receipt, classification } = purchase;
  return (
    <div className={styles.evidence}>
      {receipt && (
        <div>
          <strong>{receipt.merchant.name}</strong>
          <p className={styles.merchantType}>{receipt.merchant.type} · Demo merchant</p>
        </div>
      )}
      <div className={styles.classification}>
        <strong>{purchase.category}</strong>
        <span>{purchase.source}</span>
        {classification && (
          <p className={styles.confidence}>
            {classification.confidence === null
              ? 'Catalog fallback · no AI confidence score'
              : `AI confidence: ${(classification.confidence * 100).toFixed(1)}% (model-reported)`}
          </p>
        )}
        <p>{purchase.explanation}</p>
        {classification?.needsReview && (
          <p className="budget-warning">
            {purchase.parentApproved
              ? 'Classification was flagged for review. Your parent approved this purchase.'
              : `Parent review required: uncertain analysis, mixed categories, or unavailable AI. Automatic payment requires every item to meet ${(classificationThreshold * 100).toFixed(0)}% confidence and a single category.`}
          </p>
        )}
      </div>
      {receipt && (
        <details className={styles.itemDetails}>
          <summary>Receipt items & reasoning ({receipt.items.length})</summary>
          <ul className={styles.itemList}>
            {receipt.items.map((item) => {
              const evidence = classification?.items.find((result) => result.id === item.id);
              return (
                <li key={item.id}>
                  <div className={styles.itemTitle}>
                    <strong>{item.name}</strong>
                    <span>{money(item.quantity * item.unitCents)}</span>
                  </div>
                  <p>
                    {item.quantity} × {money(item.unitCents)} · {item.description}
                  </p>
                  {evidence && (
                    <>
                      <p>
                        <strong>{evidence.category}</strong>
                        {evidence.confidence !== null &&
                          ` · ${(evidence.confidence * 100).toFixed(1)}% confidence`}
                      </p>
                      <p>{evidence.explanation}</p>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
          <div className={styles.itemTitle}>
            <strong>Receipt total · {receipt.currency}</strong>
            <strong>
              {money(receipt.items.reduce((sum, item) => sum + item.quantity * item.unitCents, 0))}
            </strong>
          </div>
        </details>
      )}
    </div>
  );
}
