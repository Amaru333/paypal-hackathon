# API routes

All routes return JSON except the successful PayPal callback, which redirects. Errors use `{ "error": "message" }` and an appropriate status. Mutating requests require a matching Origin header and session cookie where listed. Request IDs in paths never replace ownership checks.

## Authentication

- `POST /api/auth/signup`: `{ name, email, password }`; creates a parent and sets the session cookie.
- `POST /api/auth/login`: `{ role, email?, username?, password }`; parent email or child username.
- `POST /api/auth/logout`: invalidates the current session and removes the cookie.
- `GET /api/auth/session`: returns `{ identity }` or `{ identity: null }`.

## Family and invitations

- `GET /api/dashboard?childId=...`: authenticated family/child DTO; parents may select their own child, children can only view themselves.
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
- `POST /api/purchases`: child; `{ productId, key, childId? }`; validates the catalog product and applies budget rules. The key is unique per child.
- `POST /api/purchases/[purchaseId]/actions`: `{ action: "approve" | "decline" | "retry" }`. Approval/decline and reconciliation of processing payments require the parent. A child can retry their own ready purchase.

The old `/api/family/[...path]` dispatcher has been removed. Use these method-specific endpoints when adding new clients.
