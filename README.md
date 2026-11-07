# LendLoop

**Borrow what you need. Lend what you don't.** A neighborhood tool-lending board with automated workflows.

Neighbors list the tools they own, request others for a date range, approve or decline requests on their own tools and mark loans as returned. n8n sends a notification for every request and decision, and a daily reminder for loans that are due tomorrow or overdue. The UI is in English by default and available in French, Chinese and German.

Built with **Next.js 16 (App Router)**, **Clerk**, **Convex**, **n8n** and **TypeScript**.

To try it quickly, load the demo data and sign in with one of the [demo accounts](#demo-accounts), the admin one included.

- [Features](#features)
- [Architecture](#architecture)
- [Security and data minimization](#security-and-data-minimization)
- [Local setup](#local-setup) and [demo accounts](#demo-accounts)
- [Environment variables](#environment-variables)
- [n8n workflows](#n8n-workflows)
- [Tests](#tests)
- [Project structure](#project-structure)
- [What I would change for production](#what-i-would-change-for-production)

Full specification: [doc/cahier-des-charges.en.md](doc/cahier-des-charges.en.md) (French: [doc/cahier-des-charges.fr.md](doc/cahier-des-charges.fr.md)).

## Features

| Area | What you can do |
| --- | --- |
| Home | Tagline, how it works, categories and the latest tools, sign-in |
| Catalog (public) | Store-style header with search by name and a bar of categories; one page per category, a search results page, an "available today" filter and sorting. Visitors see name, category, condition, photo and availability; opening a tool asks them to sign in |
| Listings | List a tool with name, category, condition, description and an optional photo; edit or delete your own |
| Borrowing | Request a date range; already-approved periods are greyed out in the calendar |
| Requests | My requests (cancel while pending) and Incoming requests (approve, decline, mark returned) |
| Admin | All loans with a status filter (including overdue), the member list, remove any listing, grant or remove the Trusted Lender badge |
| Automations | Notification on every request and status change; daily day-before and overdue reminders; per-loan history ("Overdue reminder sent 2 days ago") |
| Languages | English (default), French, Chinese and German, with the locale in every URL (`/en/tools`, `/fr/tools`…) |

Beyond the brief: overlapping approvals are refused, owners cannot borrow their own tools, borrowers can cancel pending requests, a reminder is also sent the day before the end date, deleting a listing is blocked during a loan, webhooks are protected against replays, and an outbox guarantees no notification is lost while n8n is down. Each of these is a business rule enforced in Convex, not only in the UI.

## Architecture

```
┌──────────────────────────┐   sign-in   ┌──────────────────────────┐
│ Next.js (App Router)     │◄───────────►│ Clerk                    │
│ UI only, 4 languages     │             │ identity, signed JWT     │
└────────────┬─────────────┘             └────────────┬─────────────┘
             │ queries / mutations + JWT              │ JWT verification
┌────────────▼────────────────────────────────────────▼─────────────┐
│ Convex — the only place that decides                              │
│ functions (requireUser / requireOwner / requireAdmin) · tables    │
│ outbox ──► outbox.dispatch (signed, retried, cron every minute)   │
│ http.ts ◄── signed endpoints for n8n                              │
└─────────────────────────────┬─────────────────────▲───────────────┘
                 signed webhook│                     │signed GET / POST
┌─────────────────────────────▼─────────────────────┴───────────────┐
│ n8n (Docker): notifications · daily reminders · error workflow    │──► Mailpit (local inbox)
└───────────────────────────────────────────────────────────────────┘
```

**Database.** Convex is a document database with typed tables (`users`, `tools`, `loans`, `outbox`, `automationEvents`, defined in [convex/schema.ts](convex/schema.ts)). Every mutation is a transaction, and pages update live when data changes. Locally it runs on your machine; in production it would be a Convex cloud deployment.

Key decisions:

1. **Convex is the source of truth for permissions.** Every query and mutation identifies the user from the Clerk JWT and checks role and ownership. The proxy and the admin guard in Next.js are only conveniences.
2. **The role lives in Convex**, not in Clerk; admins come from the `ADMIN_EMAILS` deployment variable, so a user can never promote themselves.
3. **Outbox pattern.** A mutation cannot call the network, so it writes the event to an `outbox` table in the same transaction as the change, and an action delivers it. Nothing is sent if the change fails; nothing is lost if n8n is down (retries with exponential backoff, then `automation_failed` is recorded on the loan after five attempts).
4. **"Overdue" is computed**, never stored: an approved loan past its end date. Loan dates are `YYYY-MM-DD` days, so they compare as strings and have no time-zone ambiguity.
5. **The lender marks a loan as returned**: they are the one who sees the tool come back.
6. **Business data is language-independent.** Convex stores keys (`garden`, `approved`) and error codes (`DATES_OVERLAP`); Next.js translates them with next-intl.
7. **Feature modules.** `features/tools`, `features/loans`, `features/admin` and `features/auth` mirror the Convex files; modules never import each other, pages compose them (the tool page combines the tool details, the request form and the admin panel).
8. **Cache Components is off.** Pages are client components fed live by Convex; its static-shell rules would require a Suspense boundary around every URL-reading hook for no real gain here.

## Security and data minimization

| Layer | Protection |
| --- | --- |
| Convex functions | `requireUser`, `requireOwner`, `requireAdmin` in every function; `v` validators on every argument; allowed status transitions only (`convex/shared/loanRules.ts`); text and photo limits re-checked server-side |
| Public data | `tools.listPublic` and `tools.catalog` give visitors name, category, condition, photo and availability only — no owner, no email |
| Member data | Other members appear by first name only; email addresses are visible to admins only |
| Webhooks, both directions | HMAC-SHA256 over `timestamp.body`; requests older than 5 minutes are rejected (replay protection); constant-time comparison; one secret per direction, so a leak on one side does not compromise the other |
| Idempotency | Every event has an `eventId`; Convex records each write-back once (`automationEvents.by_eventId`), n8n remembers handled events, daily reminder ids are built per loan and day (at most one reminder of each kind per day) |
| Outbox | Stores no personal data: the recipient's first name, email and language are resolved only at send time |
| Data sent to n8n | Only what an email needs: recipient first name, email and language, the other party's first name, tool name and dates |
| Uploads | JPEG, PNG or WebP up to 5 MB, checked in the browser and again in Convex (rejected files are deleted) |
| Secrets | Environment variables only (`.env.local`, Convex deployment env, `n8n/.env`), all git-ignored; `.env.example` files list names without values |
| Network | n8n and Mailpit listen on `127.0.0.1` only |

## Local setup

Prerequisites: Node.js 22.18+ (24 used here; the scripts are TypeScript run directly by Node), npm, Docker Desktop (for n8n), free [Clerk](https://clerk.com) and [Convex](https://convex.dev) accounts.

```bash
git clone <this repository> && cd LendLoop
npm install
```

**1. Clerk**

1. Create an application in the Clerk dashboard (email and Google sign-in).
2. In **Configure → Sessions → JWT templates**, add a template from the **Convex** preset (it must be named `convex`).
3. Copy the publishable and secret keys into `.env.local` (see `.env.example`).

**2. Convex** (local deployment, so Convex can reach n8n on your machine)

In a first terminal, start Convex and keep it running. It asks you to log in, then writes `CONVEX_*` and `NEXT_PUBLIC_CONVEX_*` to `.env.local`. The first push stops on the missing `CLERK_JWT_ISSUER_DOMAIN`: that is expected.

```bash
npx convex dev --configure new --dev-deployment local
```

In a second terminal, set the deployment variables. `npx convex dev` picks them up and finishes the push (if it does not, stop it and start it again).

```bash
npx convex env set CLERK_JWT_ISSUER_DOMAIN https://<your-app>.clerk.accounts.dev
npx convex env set ADMIN_EMAILS you@example.com
npx convex env set N8N_NOTIFY_WEBHOOK_URL http://localhost:5678/webhook/lendloop-events
npx convex env set HMAC_SECRET_CONVEX_TO_N8N <secret-1>
npx convex env set HMAC_SECRET_N8N_TO_CONVEX <secret-2>
```

Generate each secret with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. `ADMIN_EMAILS` is optional if you only use the demo admin account (see [Demo accounts](#demo-accounts)).

**3. n8n and Mailpit**

```bash
cp n8n/.env.example n8n/.env        # paste the same two secrets, add an encryption key
docker compose -f n8n/docker-compose.yml up -d
```

The three workflows are imported automatically. In n8n (http://localhost:5678):

1. Create an **SMTP** credential named `Mailpit (local)`: host `mailpit`, port `1025`, no user, SSL off.
2. Open each workflow, select that credential on the email nodes if asked, and **activate** "Loan notifications" and "Daily reminders" (the error handler runs on its own).

Emails land in Mailpit at http://localhost:8025.

**4. Next.js**

```bash
npm run dev                          # http://localhost:3000
```

Sign up with the email you put in `ADMIN_EMAILS` to get the admin area.

### Demo accounts

```bash
npm run seed                                # demo accounts and data
npm run seed -- --me you@example.com        # optional: your own account also gets listings and history
```

The script needs development Clerk keys (`sk_test_`) and refuses production keys. It creates four neighbors and an admin account in the Clerk development instance, then fills Convex with 15 tools with photos and about 30 loans in every status: pending (including two overlapping requests), current, due tomorrow, overdue, returned, declined, cancelled. The loans come with their notification and reminder history.

| Account | Language | Role |
| --- | --- | --- |
| `awa+clerk_test@lendloop.dev` | French | member, trusted lender |
| `marc+clerk_test@lendloop.dev` | French | member |
| `lea+clerk_test@lendloop.dev` | English | member |
| `sophie+clerk_test@lendloop.dev` | German | member, trusted lender |
| `admin+clerk_test@lendloop.dev` | English | **admin**: moderation only, no listings or loans |

They all share the password set in `DEMO_PASSWORD` in [scripts/seed-demo.mts](scripts/seed-demo.mts). If Clerk asks for an email code, enter `424242`: `+clerk_test` addresses receive no real email. Rerunning the script resets the demo data first. `npx convex run seed:reset` removes it and keeps real accounts.

## Environment variables

| Variable | Where | Role |
| --- | --- | --- |
| `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CONVEX_SITE_URL`, `CONVEX_DEPLOYMENT` | `.env.local` | Written by `npx convex dev` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | `.env.local` | Clerk keys |
| `CLERK_JWT_ISSUER_DOMAIN` | Convex | Clerk Frontend API URL, used to verify JWTs |
| `ADMIN_EMAILS` | Convex | Comma-separated emails that get the admin role |
| `N8N_NOTIFY_WEBHOOK_URL` | Convex | Workflow 1 webhook |
| `HMAC_SECRET_CONVEX_TO_N8N` | Convex and `n8n/.env` | Signs Convex → n8n messages |
| `HMAC_SECRET_N8N_TO_CONVEX` | Convex and `n8n/.env` | Signs n8n → Convex messages |
| `N8N_ENCRYPTION_KEY` | `n8n/.env` | Encrypts credentials stored by n8n |
| `CONVEX_SITE_URL` | `n8n/.env` | Convex HTTP actions URL seen from the container (`http://host.docker.internal:3211`) |
| `GENERIC_TIMEZONE` | `n8n/.env` | Time zone of the 8:00 reminder |

## n8n workflows

Exported in [`n8n/workflows/`](n8n/workflows/). The Code node sources live in [`n8n/code/`](n8n/code/) and `node n8n/build-workflows.mjs` regenerates the JSON, so the logic stays readable and is unit-tested.

| Workflow | Flow |
| --- | --- |
| Loan notifications | Webhook (raw body) → verify HMAC + timestamp (401 otherwise) → skip already-handled events → compose the email in the recipient's language → send (3 attempts) → signed write-back to `/n8n/notification-result` → 200. A failure returns an error to Convex, whose outbox retries later. |
| Daily reminders | Every day at 8:00 → signed `GET /n8n/due-reminders` (overdue + due tomorrow, minus those already sent today) → one email per loan (3 attempts) → signed `POST /n8n/reminder-result`, idempotent on `eventId` |
| Error handler | Set as the error workflow of both: logs the failing workflow, node and message and reports it to `/n8n/automation-error`; when a loan id is known, the loan history shows "An automation failed" |

## Tests

```bash
npm test               # 43 tests with convex-test + Vitest
npm run i18n:check     # every language has the same keys as en.json (add -- --strict to fail on missing ones)
npm run lint
```

The tests run the real Convex functions: permissions (users cannot touch other users' data, admin-only functions), loan rules (own tool, past or reversed dates, overlaps, allowed transitions, cancellation), the public catalog (search, category, what visitors can see), outbox delivery (signed minimal payload, retries and give-up), the HTTP endpoints (unsigned, wrong-secret and replayed requests, duplicates, malformed bodies) and the n8n Code nodes themselves against the Convex HMAC implementation.

## Project structure

```
app/[locale]/            pages only: public, sign-in/up, (app) member pages, (admin) pages
features/                business modules: tools, loans, admin, auth (components, hooks, schemas, types)
components/ui            shadcn/ui primitives (Base UI)
components/shared        cross-module components (states, dialogs, data table, date range picker, motion)
components/layout        header, nav, footer, language switcher, logo
hooks/  lib/  providers/ cross-cutting hooks, utilities, global providers
i18n/  messages/         next-intl routing and the en, fr, zh, de messages
convex/                  schema, public API (users, tools, loans, admin), model/ rules, outbox, http, crons, seed, tests
n8n/                     docker-compose, Code node sources, generated workflows
scripts/                 demo seed (Clerk test accounts + Convex data), message key check
test/                    convex-test setup and helpers
public/seed/             credits of the demo photos
doc/                     specification (en, fr)
```

## What I would change for production

- **Hosting**: Convex cloud production deployment and n8n behind HTTPS (or n8n Cloud); the webhook URL and `CONVEX_SITE_URL` then point to public HTTPS endpoints.
- **Email**: a transactional provider (Postmark, Resend, SES) with SPF/DKIM instead of Mailpit, and per-user notification preferences.
- **Secret rotation**: support two active HMAC secrets per direction during rotation.
- **Rate limiting** on loan requests and uploads (e.g. the Convex rate-limiter component).
- **Audit log** of admin actions, and soft delete for listings.
- **Observability**: Sentry for the front-end and Convex functions, Datadog or an n8n log stream for workflows, alerts on outbox rows in `failed`.
- **Durable n8n dedupe**: store handled `eventId`s in a database table instead of workflow static data.
- **Images**: resize and strip EXIF metadata on upload (location data), and serve through a CDN.
- **Accessibility and E2E**: Playwright tests of the main scenario in the four languages.

## Credits

Photos from [Unsplash](https://unsplash.com) under the [Unsplash License](https://unsplash.com/license); see [public/seed/CREDITS.md](public/seed/CREDITS.md).
