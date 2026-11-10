# Checkout proof

Pocket's demo store uses a two-step checkout. A teen selects an item and chooses **Check my budget**. The server classifies the server-priced catalog item, evaluates spending rules, and saves the decision. This step makes no PayPal request and does not reserve budget. An approval-needed result is visible in the parent's Requests view.

For an eligible purchase, the teen then chooses **Pay with PayPal**. The server rechecks the current budget under the family lock, reserves category allocations, and uses the parent's previously consented sandbox payment token with PayPal Orders v2. The receipt stays open and shows the result instead of immediately navigating away.

The receipt separates the budget decision from payment confirmation. It shows classification, Soft Decline coverage when applicable, budget allocations, the Pocket purchase reference, and available PayPal order and capture IDs. A completed purchase is presented as confirmed only when both order and capture IDs exist. The backend independently retrieves the order and checks the completed capture's currency and amount before saving a paid status. Order creation alone is not confirmation. Uncertain outcomes remain reserved and can be reconciled by the parent using **Check payment**. Receipt details remain available to both roles in Activity.

## Live sandbox walkthrough

1. Configure sandbox credentials and connect a sandbox buyer account from the parent's Budgets page. Keep the buyer separate from the merchant. Invite the teen and sign in to their account in another browser session.
2. Set a $100 weekly allowance: Food $10, Groceries $0, Transport $0, Everything else $90. Set the purchase approval threshold to $25 and Soft Decline coverage to $10. Start with no spending in this period.
3. In the teen's Shop, choose **Checkout** on Lunch break ($12), then **Check my budget**. Show the planned $10 from Food and $2 from Everything else, the Soft Decline warning, and **Payment not sent**.
4. Choose **Pay with PayPal · $12.00**. Show the resulting confirmed capture with its actual sandbox order and capture IDs. The dashboard now counts $12 as spent, with category usage split $10/$2. Verify the same receipt in the parent's Activity view.
5. Check the $45 game. Show **Parent approval needed** and **Payment not sent**. The parent may approve and pay or decline it in Requests.
6. For an ordinary approval, check the $5 bus pass with a sufficient Transport category budget. For a blocked result, reduce the total allowance below the selected item's cost, or prepare a checkout and then have the parent pause spending before the teen pays. A fresh payment check must block it before any PayPal order is created.

Only run step 4 with connected PayPal sandbox consent. Automated tests use a mocked provider; synthetic UI fixtures use visibly QA-prefixed references and are not evidence of a live PayPal capture.

## Boundary and verification

This is a Pocket-controlled merchant checkout. It does not intercept unrelated PayPal transactions or use a post-payment webhook to authorize a purchase. Prices and rules stay server-controlled, and the AI cannot authorize payments. Test money only; no goods are delivered.

Integration coverage verifies preparation makes zero PayPal calls, does not reserve funds, and is idempotent; payment goes through create, capture, and independent verification; rule changes block stale checkout plans; approval-needed and blocked decisions make no PayPal calls; mismatched capture amounts remain unconfirmed and reserved; and reconciliation reuses the existing order. Live-provider confirmation is a separate demo check.
