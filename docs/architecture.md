# Architecture and conventions

The App Router follows the installed Next.js project-structure guide. Route groups organize the filesystem without adding URL segments. Dynamic `[childId]` segments identify the pocket; browser refresh, links, and history preserve the selected page. Parent/child server layouts check session roles; APIs independently enforce role and ownership on every operation.

## Layer boundaries

- **Routes (`src/app`)**: page composition, HTTP method exports, request validation, and session requirements. No database queries embedded in React client components.
- **Features (`src/features`)**: cohesive UI components, browser-facing DTOs, and typed requests. Shared dashboard state handles polling and messages; individual view components correspond to real routes.
- **Domain (`src/domain`)**: deterministic budget evaluation, monetary values in integer cents, and demo catalog. No framework, network, or database dependencies.
- **Services (`src/server/services`)**: family ownership, invitations, budgets, payment orchestration, and dashboard projections. These are the application operations reused by API handlers.
- **Infrastructure (`src/server/db`, `integrations`, `auth`, `http`)**: Prisma, transaction helpers, external API adapters, password/session utilities, and transport error handling. Small Prisma queries stay in services; avoid a redundant generic repository wrapping every Prisma method.

Use named exports for services/utilities; default exports for Next.js pages/layouts and standalone views. Validate untrusted input at the route boundary. Return explicit DTOs instead of Prisma rows containing password hashes or tokens. Keep money in cents until formatting at the UI or PayPal boundary.

## Relational model

A parent owns many children, one PayPal connection, and an optional consent setup. Each child owns a budget, optional invitation, and purchases. Sessions belong to exactly one parent or child. Foreign keys, unique emails/usernames/invitation hashes, purchase idempotency keys, and check constraints reinforce application validation. Budgets use named integer columns rather than an opaque JSON store.

Parent and child identities use separate tables because child profiles may exist before enrollment. Parent email and child username are separate login namespaces. Child passwords use the same salted scrypt scheme as parents. Session tokens and invitation tokens are stored only as hashes.

## Transactions and external effects

`familyTransaction` locks the parent row using `SELECT ... FOR UPDATE`. Every budget mutation, invitation mutation/acceptance, and purchase reservation for that family uses the same lock. This serializes competing requests across application processes while allowing unrelated families to proceed independently.

Payment processing has three phases:

1. Inside a transaction, check current budgets and create a persisted `processing` reservation plus a lease.
2. After commit, call PayPal using stable order/capture idempotency keys. Save the order ID before capture. Never hold a database transaction open during network calls.
3. Update the purchase only if the worker still owns the lease. Confirmed captures become `paid`; ambiguous outcomes remain reserved for reconciliation.

A repeated purchase request returns the existing row. A parent can retry reconciliation after a lease ends. The PayPal idempotency key remains the same; an unknown order older than five hours requires manual reconciliation rather than a fresh charge. A freeze cannot retract a request already sent to PayPal.

Login attempt counters commit independently of authentication success/failure, so a failed request cannot roll back the rate limit. Invitation acceptance rechecks expiry and consumption under the family lock.

## Configuration

Prisma 7 uses `prisma.config.ts` for CLI datasource configuration and `@prisma/adapter-pg` at runtime. The singleton client is initialized lazily so static builds do not need a live database. See [Prisma client setup](https://www.prisma.io/docs/orm/v7/prisma-client/setup-and-configuration/introduction).

`APP_URL` pins the expected origin for hosted environments. Without it, only loopback hosts are accepted. Mutating routes compare Origin to the application origin. HttpOnly, SameSite=Lax session cookies use Secure when `APP_URL` is HTTPS. SQL errors, credentials, and stack traces are not returned to the browser.
