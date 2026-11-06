# General specification — LendLoop

> English version. Version française : [cahier-general.fr.md](cahier-general.fr.md)
> Detailed front-end specification: [cahier-nextjs.en.md](cahier-nextjs.en.md)

## Project overview

LendLoop is a neighborhood tool-lending platform: people lend what they don't use and borrow what they need instead of buying it. Tagline: "Borrow what you need. Lend what you don't."

The platform is in English by default, and available in French, Chinese and German.

### Expected features

What the brief asks for; details are in the following sections.

- **Public page**: tagline, list of available tools (name and category only), sign-in button.
- **Sign-in** with Clerk.
- **Listings**: list a tool (name, category, condition, description), edit or delete your own.
- **Browse**: see tools and their availability, filter by category.
- **Borrowing**: request a tool for a date range.
- **Request handling**: approve or decline requests on your tools, mark a loan as returned.
- **Views**: My listings, My requests, Incoming requests.
- **Admin**: remove any listing, view all loans, grant the "Trusted Lender" badge.
- **Permissions** enforced server-side (Convex), not only in the UI.
- **Notification** on every request or status change (n8n).
- **Daily reminder** for overdue loans, with the result written back to Convex (n8n).
- **Reliable and secure automations**: HMAC-signed webhooks, secrets out of the code, idempotent write-backs, retries, error workflow.
- **Bonus**: automation history per loan ("Reminder sent 2 days ago").

### Added improvements

What the project adds to the brief; each addition is justified in the README.

- **4 languages**: English by default, French, Chinese and German; notifications in the recipient's language.
- **No overlap**: a tool cannot be lent twice over the same period.
- **Request checks**: you cannot borrow your own tool; dates must be consistent and not in the past.
- **Cancellation** of a pending request by the borrower.
- **Day-before reminder** ahead of the end date, in addition to the overdue reminder.
- **Replay protection** for webhooks: signed timestamp rejected after 5 minutes, unique ID per message (duplicates ignored), constant-time signature comparison, in both directions (Convex to n8n and n8n to Convex).
- **Outbox**: no notification is lost if n8n is down.
- **Listing deletion blocked** while an approved loan has not been returned.
- **Polished UI**: explicit empty states, mobile-friendly layout.

## How the platform works

A loan goes through four statuses (plus "cancelled", proposed), driven first by the borrower and then by the lender; overdue is computed automatically and triggers a daily reminder.

### Loan lifecycle

```
                 ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
                   Cancelled
                 │ by the borrower     │   (proposed)
                 └ ─ ─ ─ ─ ▲ ─ ─ ─ ─ ─ ┘
                           │ cancels
                 ┌─────────┴───────────┐  approves ┌─────────────────────┐ returned ┌─────────────────────┐
                 │ Pending             ├──────────►│ Approved            ├─────────►│ Returned            │
                 │ by the borrower     │           │ by the lender       │          │ by the lender       │
                 └─────────┬───────────┘           └──────────┬──────────┘          └──────────▲──────────┘
                           │ declines                         │ end date passed                │
                 ┌─────────▼───────────┐           ┌──────────▼──────────┐                     │
                 │ Declined            │           │ Overdue             ├─────────────────────┘
                 │ by the lender       │           │ computed, not stored│   returned late
                 └─────────────────────┘           │ daily n8n reminder  │
                                                   └─────────────────────┘
```

Every status change triggers a notification (workflow 1). Only the lender moves a loan forward after the request; "overdue" is never stored, it is derived from the dates.

### Business rules

Rules marked "proposed" are not in the brief: they are choices to validate and then justify in the README.

| Topic | Rule | Origin |
| --- | --- | --- |
| Availability | A tool is available if no approved, unreturned loan covers today | Brief ("availability"); definition proposed |
| Request | Covers a period: start date and end date; end ≥ start; no past dates | Brief; checks proposed |
| Own tool | You cannot borrow your own tool | Proposed |
| Overlap | Two approved loans cannot overlap on the same tool; an overlapping approval is rejected | Proposed |
| Multiple requests | Several pending requests may target the same tool; the lender chooses | Proposed |
| Cancellation | The borrower can cancel a request while it is pending | Proposed |
| Response | Only the lender approves or declines a request on their tool | Brief |
| Return | The lender marks the loan as returned; the tool becomes available again | Brief; actor proposed |
| Overdue | A loan is overdue if it is approved, not returned, and past its end date; this status is computed, not stored | Brief; definition proposed |
| Reminder | At most one reminder per day per overdue loan, sent in the borrower's language | Brief (daily); limit proposed |
| Notifications | Every new request and every status change notifies the person concerned | Brief |
| Listing deletion | Not allowed while an approved loan is not returned; pending requests are then declined automatically | Proposed |
| Trusted Lender | Badge shown on the lender's listings; granted or removed by an admin; grants no permission | Brief; effect proposed |

### End-to-end scenario

This scenario covers every feature; it doubles as the demo script and the manual test plan. Characters: Awa (lender), Marc and Léa (borrowers), Sophie (admin).

1. **Public visit**: Marc lands on LendLoop in English, switches to French, sees "Drill · DIY" with no information about the owner, then signs up.
2. **Listing**: Awa lists a drill (DIY, good condition, "with 2 batteries"); it appears in My listings and on the public page.
3. **Requests**: Marc filters by DIY and requests the drill from November 10 to 12; Léa requests it from November 11 to 13. Awa is notified of each request.
4. **Response**: Awa approves Marc. Léa's request overlaps that loan: Awa declines it. Marc and Léa are notified; their pages update without a reload.
5. **Forbidden attempt**: Marc tries to delete Awa's listing by calling Convex directly; the action is rejected (FORBIDDEN).
6. **Overdue**: on November 13 the drill has not been returned. The daily reminder notifies Marc in French; his page shows "Reminder sent today".
7. **Incident**: the email service fails; n8n retries, then the error workflow logs the failure. On the next run, no reminder is recorded twice.
8. **Return**: Awa marks the loan as returned; the drill is available again.
9. **Administration**: Sophie views all loans, grants Awa the "Trusted Lender" badge and removes a spam listing.

## Required tech stack

All five building blocks are mandatory.

| Building block | Role |
| --- | --- |
| Next.js (App Router) | Web application, public and private pages |
| Clerk | Sign-in and account management |
| Convex | Database and server logic (queries, mutations, actions, HTTP endpoints) |
| n8n | Automations; self-hosted with Docker or n8n Cloud |
| TypeScript | Language for the whole project |

## Overall architecture

Convex is the only place that decides: Next.js displays, Clerk identifies, n8n executes. Each folder has its own detailed specification: Next.js for now, Convex and n8n will follow.

```
┌──────────────────────────────┐    sign-in    ┌──────────────────────────────┐
│ Next.js (App Router)         │◄─────────────►│ Clerk                        │
│ pages, forms, 4 languages    │               │ sign-in, signed JWT          │
│ no business rules            │               │ no role stored               │
└──────────────┬───────────────┘               └──────────────┬───────────────┘
               │ calls + JWT                                  │ JWT verification
┌──────────────▼──────────────────────────────────────────────▼───────────────┐
│ Convex: data, permissions, rules                                            │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│ │ Functions    ├─►│ Tables       ├─►│ outbox.dispatch  │  │ http.ts       │ │
│ │ requireUser  │  │ users, tools │  │ signs, sends,    │  │ checks HMAC,  │ │
│ │ requireAdmin │  │ loans, outbox│  │ retries          │  │ timestamp,    │ │
│ │              │  │ automation…  │  │                  │  │ eventId       │ │
│ └──────────────┘  └──────────────┘  └────────┬─────────┘  └───────▲───────┘ │
└──────────────────────────────────────────────┼────────────────────┼─────────┘
                               signed webhook  │                    │ signed GET / POST
┌──────────────────┐   ┌───────────────────────┼────────────────────┼─────────┐
│ Message channel  │◄──┤ n8n (Docker)          ▼                    │         │
│ email, Slack,    │   │ ┌────────────────┐ ┌──────────────┐ ┌──────┴───────┐ │
│ Discord or log   │   │ │ Error workflow │◄┤ Workflow 1   │ │ Workflow 2   │ │
└──────────────────┘   │ │ logs failures  │ │ notification │ │ reminders    │ │
                       │ └────────────────┘ └──────────────┘ └──────────────┘ │
                       └──────────────────────────────────────────────────────┘
```

Next.js calls Convex with the Clerk token; Convex writes the event to the outbox, then sends it signed to n8n. n8n only talks to Convex through the signed endpoints in http.ts.

### Role of each building block

| Building block | Does | Does not |
| --- | --- | --- |
| Next.js (App Router) | Pages, forms, filters, translations, real-time display | No trusted permission checks, no direct data access |
| Clerk | Identify the user, provide a signed JWT to Convex | Store the role or business data |
| Convex | Data, permissions, loan rules, overdue computation, sending and receiving webhooks | Send emails or messages |
| n8n (Docker) | Scheduled jobs, sending messages in the recipient's language, retries, error workflow | Decide who is overdue, modify the database directly |

### Architecture decisions

| # | Decision | Why |
| --- | --- | --- |
| 1 | The role is stored in `users` (Convex); the first admin comes from `ADMIN_EMAILS` | The rule lives with the data; no self-promotion possible |
| 2 | The user is created in Convex on their first call (`ensureUser`) | Simpler than an extra Clerk webhook |
| 3 | The **lender** marks the loan as returned | They are the one who sees the tool come back |
| 4 | Dates as `YYYY-MM-DD` days; "overdue" computed in Convex | A single definition of overdue |
| 5 | One HMAC secret per direction | If one leaks, the other direction stays protected |
| 6 | **Outbox**: the mutation writes the event, a scheduled action sends it and retries | A mutation cannot call the network; no notification lost; the eventId is the dedup key |
| 7 | Translations with next-intl in Next.js; Convex stores only keys and error codes | Data stays language-independent |

### Repository layout

| Folder | Content | Specification |
| --- | --- | --- |
| `app/`, `features/`, `components/`, `hooks/`, `lib/`, `providers/`, `i18n/`, `messages/`, `proxy.ts` | Next.js application | Next.js specification |
| `convex/` | Schema, functions, HTTP endpoints, outbox | Dedicated specification to come |
| `n8n/` | docker-compose and workflows exported as JSON | n8n workflows section below (dedicated specification to come) |
| `doc/` | Specifications (French and English) | — |
| Root | `README.md`, `.env.example`, `package.json` | — |

Full repository tree; the role of each Next.js file is detailed in the Next.js specification, Convex and n8n files will be in theirs.

```
LendLoop/
├─ app/                                   NEXT.JS — routing
│  ├─ globals.css
│  └─ [locale]/                           en | fr | zh | de
│     ├─ layout.tsx
│     ├─ page.tsx                         public page
│     ├─ not-found.tsx
│     ├─ error.tsx
│     ├─ sign-in/[[...sign-in]]/page.tsx
│     ├─ sign-up/[[...sign-up]]/page.tsx
│     ├─ (app)/
│     │  ├─ layout.tsx
│     │  ├─ loading.tsx
│     │  ├─ tools/page.tsx
│     │  ├─ tools/new/page.tsx
│     │  ├─ tools/[id]/page.tsx
│     │  ├─ tools/[id]/edit/page.tsx
│     │  ├─ my-listings/page.tsx
│     │  ├─ my-requests/page.tsx
│     │  └─ incoming/page.tsx
│     └─ (admin)/admin/
│        ├─ layout.tsx
│        ├─ page.tsx
│        └─ users/page.tsx
│
├─ features/                              NEXT.JS — business logic per module
│  ├─ tools/
│  │  ├─ components/                      public-landing, public-tool-list, tools-browser, tool-card,
│  │  │                                   tool-detail, tool-form, category-filter, my-listings
│  │  ├─ hooks/                           use-tools, use-tool, use-my-listings, use-tool-mutations
│  │  ├─ schemas.ts
│  │  ├─ types.ts
│  │  └─ index.ts
│  ├─ loans/
│  │  ├─ components/                      request-form, my-requests, incoming-requests, loan-actions,
│  │  │                                   loan-status-badge, automation-activity
│  │  ├─ hooks/                           use-my-requests, use-incoming-requests, use-loan-actions,
│  │  │                                   use-booked-ranges, use-automation-activity
│  │  ├─ schemas.ts
│  │  ├─ types.ts
│  │  └─ index.ts
│  ├─ admin/
│  │  ├─ components/                      all-loans, users-admin, trusted-lender-toggle, remove-tool-button
│  │  ├─ hooks/use-admin.ts
│  │  ├─ providers/admin-guard.tsx
│  │  └─ index.ts
│  └─ auth/
│     ├─ components/user-menu.tsx
│     ├─ hooks/use-current-user.ts, use-ensure-user.ts
│     └─ index.ts
│
├─ components/                            NEXT.JS — shared
│  ├─ ui/                                 shadcn
│  ├─ layout/                             app-shell, header, nav, language-switcher
│  └─ shared/                             page-header, empty-state, confirm-dialog, date-range-picker,
│                                         data-table, error-state, loading-skeleton, relative-time,
│                                         trusted-lender-badge
├─ hooks/                                 use-search-param, use-safe-mutation
├─ lib/                                   dates, errors, routes, cn
├─ providers/                             app-providers, convex-client-provider
├─ i18n/                                  routing, request, navigation
├─ messages/                              en.json, fr.json, zh.json, de.json
├─ proxy.ts                               Clerk + next-intl
│
├─ convex/                                BACK-END
│  ├─ schema.ts
│  ├─ auth.config.ts
│  ├─ shared/                             constants, validators, loan-rules (shared with Next.js)
│  ├─ lib/                                auth, errors, hmac
│  ├─ users.ts
│  ├─ tools.ts
│  ├─ loans.ts
│  ├─ admin.ts
│  ├─ outbox.ts
│  ├─ automation.ts
│  ├─ http.ts
│  └─ _generated/                         generated by Convex, not edited
│
├─ n8n/                                   AUTOMATIONS
│  ├─ docker-compose.yml
│  ├─ .env.example
│  └─ workflows/
│     ├─ notification.json                workflow 1
│     ├─ overdue-reminder.json            workflow 2 (overdue + day before)
│     └─ error-handler.json               error workflow
│
├─ doc/                                   specifications (fr, en)
├─ scripts/
│  └─ check-messages.ts                   checks that the 4 languages have the same keys
├─ public/                                logo, favicon
├─ .env.example                           Next.js and Convex variables, no values
├─ .gitignore
├─ components.json                        shadcn configuration
├─ next.config.ts
├─ tsconfig.json                          @/ alias
├─ package.json
└─ README.md                              in English
```

### Security by layer

| Layer | Protection |
| --- | --- |
| Next.js | Routes protected by `proxy.ts`, AdminGuard, no client-side secret besides `NEXT_PUBLIC_*` |
| Clerk → Convex | JWT verified by Convex on every call |
| Convex functions | requireUser, requireOwner, requireAdmin; `v` validators; controlled status transitions |
| Public page | `listPublic` query limited to name and category |
| Convex ↔ n8n | HMAC-SHA256, timestamp < 5 min, unique eventId, constant-time comparison, one secret per direction |
| Data sent to n8n | Minimal: eventId, first name, email, language, tool name, dates |
| Repository | `.env.example` without values, `.env*` ignored by git |

### Environment variables

| Variable | Where | Role |
| --- | --- | --- |
| `NEXT_PUBLIC_CONVEX_URL` | Next.js | Convex deployment URL |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Next.js | Clerk publishable key |
| `CLERK_SECRET_KEY` | Next.js | Clerk secret key |
| `CLERK_JWT_ISSUER_DOMAIN` | Convex | Token verification |
| `ADMIN_EMAILS` | Convex | Emails that get the admin role |
| `N8N_NOTIFY_WEBHOOK_URL` | Convex | Workflow 1 webhook |
| `HMAC_SECRET_CONVEX_TO_N8N` | Convex and n8n | Signs messages to n8n |
| `HMAC_SECRET_N8N_TO_CONVEX` | Convex and n8n | Signs messages to Convex |
| `CONVEX_SITE_URL` | n8n | Convex HTTP endpoints URL |
| `N8N_ENCRYPTION_KEY` | n8n | Encrypts n8n credentials |
| `GENERIC_TIMEZONE` | n8n | Time zone of the daily reminder |

**Caveat**: a cloud-hosted Convex deployment cannot reach an n8n instance on `localhost`. In development we use a local Convex deployment (`npx convex dev`, local option); otherwise a tunnel to n8n (cloudflared or ngrok).

## Public page

The home page is accessible without signing in and exposes no personal data.

- Fictional company name: **LendLoop**.
- A short tagline, e.g. "Borrow what you need. Lend what you don't."
- A read-only list of available tools, pulled from Convex: **name and category only**, no owner details.
- A "Sign in to lend or borrow" button wired to Clerk.

The public Convex query itself must return only the name and category: filtering in the UI alone is not enough.

## Features for signed-in users

A signed-in user can lend and borrow. Every data action goes through Convex.

Actions:

- **List a tool**: name, category, condition, short description.
- **Request to borrow** a tool for a date range (start date and end date).
- **Approve or decline** requests on their own tools.
- **Mark a loan as returned**.

Views:

| View | Content |
| --- | --- |
| All tools | List with availability, filterable by category |
| My listings | My tools, edit and delete |
| My requests | The loans I requested and their status |
| Incoming requests | Requests on my tools, with approve or decline |

The UI must be clean and minimal ("nice, minimal layout").

## Languages

The platform is in **English by default** and translatable into **French, Chinese (simplified) and German**. The brief does not ask for it: it is an added product requirement, presented as such in the README.

| Requirement | Detail |
| --- | --- |
| Languages | `en` (default), `fr`, `zh` (simplified Chinese), `de` |
| Switcher | Visible on every page, including the public page; the choice is remembered |
| First visit | Browser language if supported, otherwise English |
| URL | Every language prefixed (`/en/tools`, `/fr/tools`, `/zh/tools`, `/de/tools`); `/` redirects to the browser language, otherwise `/en` |
| Translated | All UI text, Clerk sign-in screens, categories, conditions, statuses, error messages, date formats |
| Not translated | User-entered content: tool name and description |
| Notifications | n8n emails and reminders sent in the recipient's language, stored in `users.locale` |

Categories, conditions and statuses are stored in Convex as keys (`garden`, `approved`) and translated at display time. Convex errors are codes (`FORBIDDEN`, `DATES_OVERLAP`) translated in Next.js.

## Roles and access control

Permissions must be enforced **in Convex functions**, not just hidden in the UI. Every query or mutation identifies the user through the Clerk token, then checks their role and ownership of the data.

| Action | User | Admin |
| --- | --- | --- |
| Create a listing | Yes | Yes |
| Edit or delete a listing | Own only | Delete any |
| Request a loan | Yes, not on own tools | Yes |
| Approve or decline a request | On own tools only | Not required |
| Mark a loan as returned | Only loans they are part of | Not required |
| View all loans | No, own only | Yes |
| Grant the "Trusted Lender" badge | No | Yes |

The brief does not say whether the lender or the borrower marks the loan as returned. This choice is justified in the README.

Preventing users from borrowing their own tool is a common-sense rule not written in the brief.

## Proposed data model

The brief does not impose a schema. This model is a proposal covering every requirement with four Convex tables.

| Table | Main fields | Notes |
| --- | --- | --- |
| users | clerkId, name, email, role (user or admin), trustedLender, locale | Created on first sign-in; the role can never be changed by the user themselves |
| tools | ownerId, name, category, condition, description, createdAt | Availability derived from active loans |
| loans | toolId, borrowerId, ownerId, startDate, endDate, status, returnedAt | Statuses: pending, approved, declined, returned, cancelled (proposed); "overdue" = approved and endDate passed |
| automationEvents | loanId, type, idempotencyKey, status, createdAt | Log of n8n actions; unique index on idempotencyKey; powers the "Reminder sent 2 days ago" bonus |

Data minimization: n8n only receives what it needs to send a message (IDs, tool name, dates, recipient address).

## n8n workflows

At least two workflows are required, plus an error workflow. Every exchange between Convex and n8n is signed.

```
Convex (mutation: request created or status changed)
   │ HMAC webhook
   ▼
Workflow 1: notification ───────────────► Recipient (email, Slack, Discord or log)
   checks the signature, sends, retries

Convex HTTP ◄──── signed GET: overdue loans ──── Workflow 2: overdue (daily) ───► Borrower
            ◄──── idempotent POST: result ────      reminds, writes the result

Workflows 1 and 2 ── on failure after retries ──► Error workflow (logs)
```

1. **Request notification**: triggered by a webhook that Convex calls when a request is created or changes status. The message goes out by email, Slack or Discord; a mocked log is accepted.
2. **Overdue reminder**: scheduled once a day. It reads overdue loans from a Convex HTTP endpoint, reminds each borrower, then writes the reminder status back to Convex. It also notifies, the day before, borrowers whose loan ends the next day (proposed).
3. **Error workflow**: catches failures after retries and reports or logs them.

On the Convex side, a mutation cannot make network calls: it schedules an action (ctx.scheduler) that sends the webhook. Workflows are exported as JSON into the repository.

## Security and reliability requirements

The brief imposes five requirements and suggests one bonus.

| Requirement | What is concretely expected |
| --- | --- |
| HMAC-signed webhooks | Every message between Convex and n8n is signed (HMAC-SHA256 of body + timestamp) and verified on receipt; rejected if the signature or timestamp is invalid |
| Secrets out of the code | Environment variables in Next.js and Convex; n8n credentials in n8n; a `.env.example` without values |
| Idempotent write-backs | The same write sent twice by n8n has a single effect (idempotency key) |
| Retries | Retry configured on n8n nodes that call external services |
| Error workflow | A dedicated n8n workflow that catches failures and reports or logs them |
| Bonus: history | Show recent automation activity per loan, e.g. "Reminder sent 2 days ago" |

Server-side access control in Convex (Roles section) and the absence of personal data on the public page are also part of the security evaluation.

## Production roadmap

These items are not implemented in the project; they go into the README's "production changes" note.

| Improvement | Benefit |
| --- | --- |
| Admin action log | Know who removed or changed what, and when |
| Soft delete for listings | Restore a listing deleted by mistake |
| Per-user request rate limit | Curb spam |
| Regular HMAC secret rotation, with a window where old and new are both accepted | Limit the impact of a leak without downtime |
| Monitoring with Sentry and Datadog | Detect errors and slowness |
| Neighbor reviews, tool photos, neighborhood filter | Trust and relevance of listings |

## Deliverables

- [ ] **GitHub repository** with the full application source.
- [ ] **Exported n8n workflows** as JSON, in the repository.
- [ ] **README** (in English) covering:
  - local setup, including a docker-compose for n8n;
  - the list of environment variables;
  - the architecture;
  - security and data-minimization decisions.
- [ ] **Short note** on what would change for production.

## Evaluation criteria

1. Code structure and clarity.
2. Security-minded thinking.
3. UX and practicality.
4. n8n integration: design, reliability, error handling.
5. Documentation and reasoning.
