# Transaction AI

Checkout now classifies server-owned receipt lines rather than only a product title. Each receipt contains a fictional demo merchant, its broad business type, USD currency, item IDs, descriptions, quantities, and unit prices. The server verifies the receipt total against the catalog price. Browser-supplied receipts, categories, confidence scores, and prices are ignored.

Pocket Market sells both the snack restock and the adventure game. Both receipts have the same General merchandise merchant type. The receipt's apples, yogurt, and granola should classify as Groceries; the video game belongs in Everything else, which currently includes entertainment and shopping. This demonstrates why merchant labels alone do not identify what was bought. Receipt data comes from this demo store, not from a real external retailer or a PayPal item-feed integration.

The existing OpenAI Responses structured-output adapter asks for a category, confidence, and brief evidence statement for every receipt item. The server validates the allowed categories, finite confidence values from 0 to 1, nonempty explanations, and an exact match of unique item IDs. Missing items, duplicate IDs, extra fields, refusals, incomplete responses, invalid JSON, and provider failures do not authorize automatic payment. No family identities, credentials, budgets, or payment tokens are included in classification input.

The transaction confidence is the lowest item confidence. With AI enabled, automatic eligibility requires at least 85% confidence on every item and a single category. Scores are model-reported and are not calibrated probabilities. Mixed receipts require parent review even at high confidence. The current budget model assigns the complete purchase to one category; for mixed receipts this is the category with the largest item subtotal, explicitly shown before parent approval. It does not split mixed-item purchases across independent budget categories. Soft Decline allocations are separate and can cover a shortfall from other spending categories.

The original receipt and validated classification are saved with each purchase. Checkout and Activity show the merchant, source, confidence, item prices, and per-item reasoning. Payment retries and parent approval use that saved evidence rather than asking AI to reclassify. Budget evaluation, freezes, total allowance limits, and payment capture verification remain deterministic server operations.

When AI is deliberately off, checkout retains the existing catalog-based demo behavior and labels it **Shop catalog (AI off)**, with no invented confidence score. When configured AI fails or returns unusable output, the result is labeled **Shop catalog (AI unavailable)** and requires parent review. Provider internals are not exposed. Parents can explicitly approve a flagged purchase subject to the normal total and freeze safeguards.

## Demo

1. Connect a sandbox payment method and sign in to a teen account. The budget check itself makes no PayPal request.
2. Check the snack restock and expand **Receipt items & reasoning**. Show Pocket Market, the General merchandise label, three item lines totaling $18, the Groceries category, and actual confidence/reasoning.
3. Check the $45 game. Show the same merchant label with a different receipt item and the Everything else classification. The purchase decision still follows the parent's category budgets and approval threshold.
4. Show a saved receipt in Activity to demonstrate evidence persistence. For uncertain and unavailable-AI cases, use the automated test scenarios rather than presenting a mocked model response as live AI.

Validation includes 35 unit tests and 11 PostgreSQL integration tests, with mocked provider responses for adversarial cases. Two generic receipts were additionally checked against the configured live OpenAI API: groceries returned Groceries at 95% minimum item confidence; the game returned Everything else at 100%. These observations are one run, not an accuracy benchmark. No payment was sent during the live classification check.

Implementation reference: [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses). Shape validation is followed by application validation and budget checks.
