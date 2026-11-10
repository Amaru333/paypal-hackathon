# Invitation emails

Pocket uses Resend's email API. Adding a child requires a name and email address. Pocket saves the child and single-use invitation before contacting Resend, so an email failure does not discard the child. Creating a new invitation emails the stored address and invalidates the previous link. Existing children without an email can still use a manually shared link.

## Setup

1. Create an account at https://resend.com and add a domain you own. Add the DNS records Resend provides and wait until verification succeeds. A sending subdomain such as `mail.example.com` is suitable.
2. Create a sending API key and set `RESEND_API_KEY` in your local `.env` and hosting environment. Keep it server-side; do not use a `NEXT_PUBLIC_` prefix.
3. Set `EMAIL_FROM` to a sender on the verified domain, for example `Pocket <invites@mail.example.com>`.
4. Set `APP_URL` to your public app origin, for example `https://pocket.example.com`. Localhost links only work on the same computer; use a reachable hosted app for invitations sent to other devices.
5. Run `npm run db:migrate` against the intended database to add the optional child email column, then `npm run db:generate`. Restart the app after changing environment variables.
6. Add a child using an inbox you control. Check the invitation arrives, opens the account setup screen, and can only be accepted once. Check Resend's email log if the inbox does not receive it. API acceptance is not confirmation of inbox delivery.

Without a verified domain, Resend's `onboarding@resend.dev` sender can only send test messages to the address associated with your Resend account. To invite other recipients, verify your own domain.

Invitations expire after 24 hours. Provider errors never expose API responses or credentials to the browser. The parent sees whether the email request was accepted, failed, or was not configured, and retains a copyable invitation link. Pocket does not currently track bounces or delivery webhooks. Disable email click tracking for invitation emails so private signup links are not rewritten.

References: https://resend.com/docs/api-reference/emails/send-email and https://resend.com/docs/dashboard/domains/introduction
