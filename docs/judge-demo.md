# Judge demo

The landing page presents the working dashboard components with fixed, illustrative sample data. It is public and requires no signup. The preview provider does not mount authenticated polling or execute mutation callbacks. Dashboard controls are read-only, while the checkout walkthrough changes only local sample state. It makes no AI, database, or PayPal requests, and does not fabricate order or capture IDs. Sample dates use UTC for stable server and browser rendering; real dashboards continue to use the viewer's locale.

## Two minute presentation

**First 30 seconds — open the public page.** Lead with the visible example: “A teen has $10 left for food and wants a $12 lunch. Pocket can cover the $2 shortfall from another available spending category, within the parent's rules, and show both people a check-in.” Switch between Teen and Parent previews, then run Checkout demo. State explicitly that this public walkthrough is a simulation. The signed-in shop is the dummy storefront used for actual PayPal sandbox testing.

**Next 45 seconds — show an actual sandbox capture.** Rehearse this separately before presenting. Sign in to prepared parent and teen accounts in separate browser sessions. Connect a PayPal sandbox buyer from the parent’s Budgets page, using the configured sandbox merchant credentials. Set a $100 allowance with Food $10, Groceries $20, Transport $20, and Everything else $50; use a $25 purchase threshold and $10 Soft Decline coverage. Begin a fresh period with no spending. In the teen's Shop, check Lunch break ($12), show the server-approved $10/$2 plan and Payment not sent, then choose Pay with PayPal. Only call this a completed sandbox payment when the receipt returns an actual verified order and capture ID. Show the same receipt and warning in the parent's Activity view. Do not substitute the public simulation for this payment proof. See [checkout walkthrough](checkout-demo.md).

**Next 25 seconds — show the AI and forecast.** Compare item receipts from Pocket Market: home-food items versus a video game share a broad merchant label but lead to different categories. Show source, model-reported confidence, and reasoning; uncertain or unavailable AI requires parent review. The public preview is sample data, not a live AI response. For live classification, use a configured key and the signed-in shop. Use the labeled public sample week to show the spending forecast; fresh live accounts intentionally have no future projection until enough paid history exists.

**Final 20 seconds — explain Why PayPal.** “Our hypothesis is that PayPal can earn a family relationship earlier: help parents guide spending, give teens a reason to build their first money habits in the PayPal ecosystem, and keep that relationship as they grow. Pocket combines the spending moment with guidance, rather than leaving that habit to another app.” Present acquisition and retention as a business hypothesis, not a measured result or an official PayPal commitment.

## Before presenting

- Confirm both dashboard previews and the full public checkout walkthrough work without authentication, including restart and parent check-in.
- Keep the live sandbox buyer separate from the merchant. Verify configured credentials, consent, connectivity, and any OpenAI quota before the rehearsal.
- Rehearse the actual signed-in $12 sandbox capture and check its order and capture IDs. No real funds or goods are involved.
- If a live provider is unavailable, say so and use the labeled simulation for UX only. Never describe a simulated or mocked payment as an actual PayPal capture.
- Controls apply to Pocket’s merchant checkout, not all PayPal transactions. The prototype does not open a teen bank account, issue a card, or transfer recurring allowance deposits. It is independent and not endorsed by PayPal.

## Implementation verification

Tests verify that sample balances reconcile with the shared budget evaluator, sample data remains isolated, child previews omit vault balances, and simulated purchases have no payment proof. The actual receipt and dashboard components are reused. Authenticated API behavior is covered by the existing integration suite. Browser verification covers public role switching, both simulation steps, restart, sample parent notifications, and responsive layout. Publication and an actual-provider payment rehearsal are separate from this local implementation milestone.
