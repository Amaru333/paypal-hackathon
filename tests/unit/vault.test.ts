import test from 'node:test';
import assert from 'node:assert/strict';
import { rolloverSavings } from '../../src/domain/vault';
import { defaultPolicy, evaluate } from '../../src/domain/wallet';

test('vault saves unused allowance and released funds across skipped renewals', () => {
  assert.equal(rolloverSavings(10000, 2000, 8000, 1), 4000);
  assert.equal(rolloverSavings(10000, 0, 10000, 1), 0);
  assert.equal(rolloverSavings(10000, 0, 3000, 3), 27000);
  assert.equal(rolloverSavings(10000, 0, 12000, 1), 0);
});

test('released funds expand total spending capacity but do not bypass approval or freeze', () => {
  const policy = { ...defaultPolicy, walletBonus: 5000 };
  assert.equal(evaluate(policy, [], 'period', 12000, 'Food', true).status, 'ready');
  assert.equal(evaluate(policy, [], 'period', 16000, 'Food', true).status, 'blocked');
  assert.equal(evaluate(policy, [], 'period', 12000, 'Food', false).status, 'approval');
  assert.equal(
    evaluate({ ...policy, frozen: true }, [], 'period', 100, 'Food', true).status,
    'blocked',
  );
});
