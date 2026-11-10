# API routes

All routes return JSON except the successful PayPal callback, which redirects. Errors use `{ "error": "message" }` and an appropriate status. Mutating requests require a matching Origin header and session cookie where listed. Request IDs in paths never replace ownership checks.

## Authentication

- `POST /api/auth/signup`: `{ name, email, password }`; creates a parent and sets the session cookie.
- `POST /api/auth/login`: `{ role, email?, username?, password }`; parent email or child username.
- `POST /api/auth/logout`: invalidates the current session and removes the cookie.
- `GET /api/auth/session`: returns `{ identity }` or `{ identity: null }`.

## Family and invitations

- `GET /api/dashboard?childId=...`: authenticated family/child DTO; parents may select their own child, children can only view themselves.

Selected-child snapshots also include `forecast`: server-calculated status, observation window, current capacity/availability, confirmed spending, pending reservations, daily pace when enough history exists, renewal balance estimate, optional depletion date, and recorded/projected balance points. Family-only snapshots omit it. It reuses the existing purchase history and introduces no external requests. The Teen Overview renders it; owning parents can read the same selected-child data.

- `POST /api/children`: parent; `{ name }`; creates a profile, budget, and invitation.
- `POST /api/children/[childId]/invitation`: parent; replaces the pending invitation.
- `DELETE /api/children/[childId]/invitation`: parent; revokes the pending invitation.
- `POST /api/invitations/inspect`: public; `{ token }`; returns the invited child/parent first names and expiry.
- `POST /api/invitations/accept`: public; `{ token, username, password }`; consumes the invitation atomically and signs in the child. A signed-in parent must use a separate browser session.

## Budgets

- `PUT /api/children/[childId]/budget`: parent; `{ policy }`. Policy contains allowance, threshold, category limits in cents, frozen, and periodDays (1, 7, or 30).
- `PATCH /api/children/[childId]/freeze`: parent; `{ frozen: boolean }`.
- `POST /api/ai/budget`: parent; `{ childId, prompt }`; returns a draft policy, without saving it.

## Payments and purchases

- `POST /api/payments/paypal/connect`: parent; starts sandbox consent and returns `{ url }`.
- `GET /api/payments/paypal/return?state=...`: parent session; validates consent state, exchanges the token, and redirects to the family page.
- `POST /api/purchases`: child; `{ productId, key, childId?, prepare? }`; validates the catalog product and applies budget rules. The key is unique per child. The checkout UI sends `prepare: true` to persist a decision without reserving budget or making any PayPal request. The teen then explicitly pays using the ready purchase's `retry` action, which rechecks all controls under the family lock. Replaying a preparation key returns its existing purchase and never silently starts payment. Omitting `prepare` preserves the original single-request payment behavior for existing clients.
- `POST /api/purchases/[purchaseId]/actions`: `{ action: "approve" | "decline" | "retry" }`. Approval/decline and reconciliation of processing payments require the parent. A child can retry their own ready purchase.

The old `/api/family/[...path]` dispatcher has been removed. Use these method-specific endpoints when adding new clients.

Purchase DTOs include optional `receipt` (merchant, currency, and priced item lines) and `classification` (minimum item confidence, review flag, and per-item evidence). These are server-created snapshots; they are never accepted from the browser as authoritative. Legacy purchases may lack both fields. With configured AI, incomplete, invalid, mixed-category, or low-confidence analysis requires parent review before payment. AI-off catalog fallback is explicitly labeled.
