# Teen Privacy Mode

At age 16, a teen can turn on **Share overall totals only** on their Overview. The choice defaults off and belongs to the teen; parent accounts cannot toggle it. Turning it off restores the parent's complete history view. The child always retains their full activity, receipt analysis, category usage, and forecast.

Parents still set allowance, category permissions, approval thresholds, Soft Decline coverage, renewals, and spending freezes. With Privacy Mode on, they see overall spent, reserved, and available amounts. Configured category limits remain editable, but category usage and forecasting are omitted. Activity does not return historical purchases. Approval and processing exceptions expose only an opaque request ID, amount, status, generic reason, and privacy marker so the parent can approve, decline, or reconcile them. Purchase names, receipts, AI evidence, allocation details, timestamps, provider IDs, and provider errors stay private, including in action responses.

## Eligibility

The parent supplies a date of birth when adding a child, or sets it once in Family for an existing profile. Dates are validated server-side and cannot be changed through the app once stored. Age is calculated using UTC calendar dates; eligibility begins on the sixteenth birthday. A February 29 birthday advances on March 1 in non-leap years. The prototype uses the parent-entered date; it does not independently verify identity or age. A production correction process would need verification and a clear audit policy, rather than a parent-editable date that can revoke privacy.

## Enforcement and limits

Dashboard reads and privacy changes run under the existing family database lock. Parent action responses recheck the current privacy choice after payment settlement, including when the teen enables it while a provider request is in flight. DTOs use an explicit allowlist. Parent screens refresh through the existing seven-second polling; information already delivered, viewed, or saved cannot be recalled. The mode covers old and new purchase details returned after it is enabled.

This is privacy within Pocket. A funding-account owner may still see transactions in PayPal. Overall balance changes, necessary exception amounts, and the parent's own rule configuration can also support inferences. The app does not promise anonymous spending or erase accounting records.

## Deployment and verification

Run `npm run db:migrate` before starting the updated app. Migration `20261110120000_teen_privacy` adds a nullable birth date and an opt-in boolean, preserving existing profiles. Unit tests cover birthday boundaries, invalid dates, and DTO redaction. PostgreSQL API tests cover ownership, one-time dates, age gating, private parent reads/actions, retained teen history, freezes, and restoring sharing.
