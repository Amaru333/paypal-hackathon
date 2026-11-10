import type { Purchase } from '@/domain/wallet';
import { categories } from '@/domain/wallet';
import { checkoutOutcome } from '@/domain/checkout';
import { money } from '@/features/dashboard/format';
import styles from './checkout.module.css';
import { ReceiptEvidence } from './receipt-evidence';

export function CheckoutReceipt({
  purchase,
  simulated = false,
}: {
  purchase: Purchase;
  simulated?: boolean;
}) {
  const outcome = checkoutOutcome(purchase);
  const simulationComplete = simulated && purchase.status === 'paid';
  return (
    <section className={styles.receipt} aria-label="Checkout receipt" aria-live="polite">
      <span className={styles.badge}>
        {simulated ? 'SIMULATION · NO API CALLS' : 'PAYPAL SANDBOX · TEST MONEY'}
      </span>
      <ol className={styles.steps}>
        <li>
          <span className={styles.number}>01</span>
          <div>
            <h3>
              {simulationComplete && purchase.warning
                ? 'Simulated Soft Decline applied'
                : outcome.budget}
            </h3>
            <p>
              {['blocked', 'approval', 'declined', 'ready'].includes(purchase.status)
                ? purchase.reason
                : simulated
                  ? 'This illustrates the budget check in Pocket’s demo-store checkout.'
                  : purchase.parentApproved
                    ? 'Your parent approved this purchase before payment.'
                    : 'Pocket checked your allowance, category budgets, and spending controls before sending payment.'}
            </p>
          </div>
        </li>
        <li>
          <span className={styles.number}>02</span>
          <div>
            <h3>{simulationComplete ? 'Simulated checkout complete' : outcome.payment}</h3>
            <p>
              {simulationComplete
                ? 'Illustrative result only. No money moved and no PayPal order or capture was created.'
                : outcome.confirmed
                  ? `${money(purchase.cents)} captured with test money. No goods are delivered.`
                  : outcome.reserved
                    ? 'Your budget stays reserved until the outcome is known. Ask your parent to use Check payment; do not start another purchase.'
                    : purchase.status === 'paid'
                      ? 'This record has no complete PayPal receipt. It is not proof of a verified capture.'
                      : 'A budget decision is not a payment. Eligible purchases still need the Pay with PayPal step.'}
            </p>
          </div>
        </li>
      </ol>
      <ReceiptEvidence purchase={purchase} />
      {purchase.warning && ['ready', 'processing', 'paid'].includes(purchase.status) && (
        <p className="budget-warning">{purchase.warning}</p>
      )}
      {!!purchase.allocations &&
        Object.keys(purchase.allocations).length > 0 &&
        ['ready', 'processing', 'paid'].includes(purchase.status) && (
          <div className={styles.allocations}>
            <strong>
              {simulationComplete
                ? 'Sample budget after purchase'
                : outcome.confirmed
                  ? 'Budget used'
                  : outcome.reserved
                    ? 'Budget reserved'
                    : 'Planned budget coverage'}
            </strong>
            {categories
              .filter((category) => (purchase.allocations?.[category] || 0) > 0)
              .map((category) => (
                <div key={category}>
                  <span>{category}</span>
                  <span>{money(purchase.allocations![category]!)}</span>
                </div>
              ))}
          </div>
        )}
      {purchase.error && (
        <p role="alert" className="inline-error">
          {purchase.error}
        </p>
      )}
      {!simulated && (
        <dl className={styles.references}>
          <div>
            <dt>Pocket purchase</dt>
            <dd>{purchase.id}</dd>
          </div>
          {purchase.orderId && (
            <div>
              <dt>PayPal order ID</dt>
              <dd>{purchase.orderId}</dd>
            </div>
          )}
          {purchase.captureId && (
            <div>
              <dt>PayPal capture ID</dt>
              <dd>{purchase.captureId}</dd>
            </div>
          )}
        </dl>
      )}
    </section>
  );
}
