# Ask Pocket: the parent assistant

Open **Ask Pocket** from the parent dashboard header. Choose a child or keep **Whole family** selected. Chat can analyze spending, show the current budget and requests, and prepare top-ups, recurring budget changes, spending pauses/resumes, and saved-vault releases. Analysis cards include interactive overall/category/day views; private teens get overall totals only. Family comparisons respect each child's own allowance period. Quick actions work without an AI key and use the same server services as model tools.

## What adding balance means

Pocket currently manages sandbox spending permissions, not a cash account. **Add budget** increases `walletBonus` for the current allowance period, without sending money or creating a PayPal charge. It expires at renewal, and category caps, approval thresholds, and freezes remain in force. An exhausted category can still require an exception. A recurring allowance change belongs in **Set budget**, where category allocations must sum to the allowance. A vault release consumes the parent's saved vault budget.

## Tool calling and review

The server uses the [OpenAI Responses function-calling flow](https://developers.openai.com/api/docs/guides/function-calling), with strict schemas, an allowlist, sequential calls, and a bounded loop. Set `OPENAI_API_KEY`; optionally override the existing model with `OPENAI_ASSISTANT_MODEL`. Requests use `store: false`. No arbitrary generated code, HTML, SQL, URLs, payment actions, or privacy changes can be executed by the model.

Read tools: `analyze_family`, `analyze_spending`, `get_budget`, `get_requests`.

Proposal tools: `propose_top_up`, `propose_budget`, `propose_freeze`, `propose_vault_release`.

Models and quick forms only create a review card. **Apply change** submits its opaque server-generated proposal ID. The server never accepts updated amounts or policies with that confirmation. Cancelling does not alter the account. Proposals expire after ten minutes; budget settings, renewal, extra-budget, or vault changes invalidate an older proposal. A transaction and family row lock apply a proposal and mark it consumed atomically. Concurrent retries return the existing result without a second credit. Applied proposals retain their command and timestamp as an audit record. Top-ups/releases are capped at $1,000 per proposal and $10,000 total extra budget per period.

## Data and privacy

Only the owning parent can use these endpoints. Read tools reuse the existing privacy-aware dashboard and add a second analysis projection gate. Provider inputs contain family totals and tool results; credentials, PayPal IDs, receipt images, dates of birth, raw receipt/AI payloads, and other families' data are excluded. Non-private analysis may include current-period category usage, daily spending, grouped product names, and forecasts. Private analysis excludes those entirely. Configured budgets and the parent's own vault remain parent controls.

The browser keeps chat in memory for the current dashboard session, without saving transcripts to local storage or the database. It sends only recent parent questions as conversational context, never older assistant analysis. A change to any child's privacy setting resets the panel and chat when dashboard polling observes it. The server also compares privacy state before and after model execution and refuses a response if it changed mid-turn. Previously delivered information cannot be recalled. PayPal's own funding-account visibility is outside this feature.

## API and validation

- `POST /api/assistant/chat`: `{ message, previous: string[], childId?, visibilityKey }`; returns plain text, typed cards, tool outcomes, and the visibility key. Requires configured AI. Four tool calls maximum per request.
- `POST /api/assistant/insights`: `{ kind: "family" }` or `{ childId, kind: "analysis" | "budget" | "requests" }`; no AI required.
- `POST /api/assistant/proposals`: a strict command (`top_up`, `release_vault`, `budget`, `freeze`) with a child ID and validated values.
- `POST /api/assistant/actions`: `{ id, decision: "confirm" | "cancel" }`; no additional values accepted.

All routes require an authenticated parent, ownership checks, matching Origin, and no-store responses. Run `npm run db:migrate` before starting the updated app. Migration `20261110170000_parent_assistant` adds the proposal/audit table without changing existing balances. Tests cover real orchestration with mocked provider responses, API boundaries, privacy projection, pending proposals, cancellation/expiry/staleness, concurrent credits, renewal, and vault/budget constraints. Production hosting should apply its existing authenticated API rate limits to the chat endpoint as well.
