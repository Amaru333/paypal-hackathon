import test from 'node:test';
import assert from 'node:assert/strict';
import { checkoutOutcome } from '../../src/domain/checkout';
import type { Purchase } from '../../src/domain/wallet';

const purchase: Purchase = {
  id: 'purchase',
  childId: 'teen',
  key: 'key',
  productId: 'lunch',
  name: 'Lunch',
  cents: 1200,
  category: 'Food',
  explanation: '',
  source: 'Shop catalog',
  createdAt: '',
  period: '',
  status: 'ready',
  reason: 'Within budget',
};

test('budget approval, coverage, and order creation do not imply captured payment', () => {
  assert.equal(checkoutOutcome(purchase).payment, 'Payment not sent');
  assert.equal(
    checkoutOutcome({ ...purchase, warning: 'Covered' }).budget,
    'Soft Decline coverage planned',
  );
  const pending = checkoutOutcome({
    ...purchase,
    status: 'processing',
    orderId: 'ORDER',
    warning: 'Covered',
  });
  assert.equal(pending.confirmed, false);
  assert.equal(pending.payment, 'Payment confirmation pending');
  assert.equal(pending.budget, 'Soft Decline coverage reserved');
  assert.equal(checkoutOutcome({ ...purchase, status: 'paid', orderId: 'ORDER' }).confirmed, false);
});

test('confirmed captures retain the budget outcome; blocked and approval requests remain unpaid', () => {
  const paid = { ...purchase, status: 'paid' as const, orderId: 'ORDER', captureId: 'CAPTURE' };
  assert.equal(checkoutOutcome(paid).confirmed, true);
  assert.equal(
    checkoutOutcome({ ...paid, warning: 'Covered' }).budget,
    'Soft Decline coverage applied',
  );
  assert.equal(checkoutOutcome({ ...paid, parentApproved: true }).budget, 'Parent approved');
  assert.equal(checkoutOutcome({ ...purchase, status: 'blocked' }).budget, 'Blocked by Pocket');
  assert.equal(checkoutOutcome({ ...purchase, status: 'approval' }).payment, 'Payment not sent');
  assert.equal(checkoutOutcome({ ...purchase, status: 'declined' }).budget, 'Declined by parent');
});
