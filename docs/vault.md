# Parent-only vault

Enable vault mode on a joined child's Overview or Budgets page. It starts disabled so existing budgets retain their behavior until a parent opts in. No historical savings are credited when enabling it.

At renewal, unused allowance plus unused vault releases move into the vault. Each elapsed period receives its normal allowance; if several periods pass without a visit, all unused intervening allowances are saved. Renewal is reconciled on the next dashboard read or purchase, not by a scheduled PayPal transfer. If a payment is still processing, renewal waits until its outcome is resolved so money cannot be saved and spent twice.

Parents can release a positive amount up to the vault balance, or release all. Releases increase the current period's spending capacity without changing the recurring allowance. Category budgets, approval thresholds, total spending checks, and freeze controls remain enforced. Disabling automatic saving preserves the vault balance but stops future sweeps; unused current-period releases expire at renewal while saving is disabled.

Vault fields are omitted from child dashboard responses. The release/settings API requires the owning parent and serializes changes with the existing family transaction lock. Balances use integer cents with database nonnegative constraints. These balances are application spending permissions, not funds held by PayPal or a child bank account.

Deploy the Prisma migration before deploying application code: `npm run db:migrate`, then `npm run db:generate`.
