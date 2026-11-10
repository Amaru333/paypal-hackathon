import type { Purchase } from './wallet';

// Budget approval and payment proof are independent.
export function checkoutOutcome(purchase: Purchase) {
  const confirmed = purchase.status === 'paid' && !!purchase.orderId && !!purchase.captureId;
  const reserved = purchase.status === 'processing';
  const budget =
    purchase.status === 'blocked'
      ? 'Blocked by Pocket'
      : purchase.status === 'approval'
        ? 'Parent approval needed'
        : purchase.status === 'declined'
          ? 'Declined by parent'
          : purchase.parentApproved
            ? 'Parent approved'
            : purchase.warning
              ? confirmed
                ? 'Soft Decline coverage applied'
                : reserved
                  ? 'Soft Decline coverage reserved'
                  : 'Soft Decline coverage planned'
              : 'Budget approved';
  const payment = confirmed
    ? 'PayPal sandbox payment confirmed'
    : reserved
      ? 'Payment confirmation pending'
      : purchase.status === 'paid'
        ? 'Payment recorded; receipt unavailable'
        : 'Payment not sent';
  return { confirmed, reserved, budget, payment };
}
