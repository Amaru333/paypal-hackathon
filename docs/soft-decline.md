# Soft Decline

Soft Decline covers a small spending-category shortfall from other unspent spending categories before a Pocket checkout proceeds to PayPal sandbox. It is automatic coverage, despite the feature name: it does not decline an otherwise eligible transaction.

Parents set the maximum shortfall per purchase under Budgets, from $0 (disabled) to $10. The default is $10. For example, a $15 food purchase with $10 left in Food can allocate $10 to Food and $5 to Everything else. The purchase keeps its original Food classification, and its stored allocations record which budgets funded it. Both dashboards show the warning once the payment is confirmed; purchase activity also distinguishes planned coverage and pending reservations.

Donors are considered in order: Everything else, Groceries, Transport, Food, excluding the purchase's category. Multiple donors can contribute. The private vault is never a donor. Parents cannot configure donor priorities in this milestone.

Total spending capacity, frozen spending, large-purchase approval thresholds, and uncertain AI classification checks still apply. Shortfalls above the configured cap, disabled coverage, or insufficient donor balances require parent approval. A parent can explicitly approve a category exception, but cannot bypass the total allowance or a freeze.

Allocations are recorded with the purchase and count against category budgets only for processing and paid purchases. Ready purchases show a plan; they do not reserve funds. The plan is recalculated under the existing family database lock when payment is reserved. Uncertain PayPal outcomes keep their original reservation. Reconciliation uses the same purchase and payment keys without borrowing again. Legacy purchases without allocations count against their original category.

This milestone provides persistent in-app warnings. It does not send device push, SMS, or spending-notification emails. Budget coverage does not prove payment: a paid status requires the existing verified PayPal capture flow.

Validation includes cap boundaries, disabled coverage, multiple donors, exhausted donors, freeze and total safeguards, legacy accounting, concurrent donor contention, duplicate requests, and reconciliation after a lost payment response. External payments are mocked in integration tests.
