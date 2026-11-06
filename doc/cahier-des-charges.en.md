# Specification — LendLoop

> English version. Version française : [cahier-des-charges.fr.md](cahier-des-charges.fr.md)

A single document: a general part, then one part per repository folder.

## Table of contents

1. [General](#1-general) — the whole project
   - [1.1 Project overview](#11-project-overview)
   - [1.2 Expected features](#12-expected-features)
   - [1.3 Added improvements](#13-added-improvements)
   - [1.4 How the platform works](#14-how-the-platform-works): [lifecycle](#14-how-the-platform-works), [rules](#business-rules), [roles](#roles), [end-to-end scenario](#end-to-end-scenario)
   - [1.5 Languages](#15-languages)
   - [1.6 Tech stack](#16-tech-stack)
   - [1.7 Architecture](#17-architecture): [decisions](#architecture-decisions)
   - [1.8 Repository tree](#18-repository-tree)
   - [1.9 Security by layer](#19-security-by-layer)
   - [1.10 Environment variables](#110-environment-variables)
2. [Pages and routes](#2-pages-and-routes--app) — `app/`
   - [2.1 Routes](#21-routes)
   - [2.2 Screen behavior](#22-screen-behavior)
   - [2.3 Route protection](#23-route-protection)
   - [2.4 Tree](#24-tree)
3. [Front-end code](#3-front-end-code--features-components-hooks-lib-providers-i18n-messages) — `features/`, `components/`, `hooks/`, `lib/`, `providers/`, `i18n/`, `messages/`, `proxy.ts`
   - [3.1 Tree](#31-tree)
   - [3.2 Modules and dependency rules](#32-modules-and-dependency-rules)
   - [3.3 Internationalization](#33-internationalization)
   - [3.4 Conventions](#34-conventions)
4. [Back-end](#4-back-end--convex) — `convex/`
   - [4.1 Tree](#41-tree)
   - [4.2 Data model](#42-data-model)
   - [4.3 Permissions](#43-permissions)
   - [4.4 Error codes](#44-error-codes)
   - [4.5 Exchanges with n8n](#45-exchanges-with-n8n)
5. [Automations](#5-automations--n8n) — `n8n/`
   - [5.1 Tree](#51-tree)
   - [5.2 Workflows](#52-workflows)
   - [5.3 Security and reliability requirements](#53-security-and-reliability-requirements)
6. [Documentation](#6-documentation--doc) — `doc/`
7. [Delivery](#7-delivery) — root (`README.md`, `.env.example`)
   - [7.1 Deliverables](#71-deliverables)
   - [7.2 Production roadmap](#72-production-roadmap)
   - [7.3 Evaluation criteria](#73-evaluation-criteria)

---

## 1. General

### 1.1 Project overview

LendLoop is a neighborhood tool-lending platform: people lend what they don't use and borrow what they need instead of buying it. Tagline: "Borrow what you need. Lend what you don't."

The platform is in English by default, and available in French, Chinese and German.

### 1.2 Expected features

What the brief asks for; details are in the following parts.

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

### 1.3 Added improvements

What the project adds to the brief; each addition is justified in the README.

- **4 languages**: English by default, French, Chinese and German; notifications in the recipient's language.
- **No overlap**: a tool cannot be lent twice over the same period.
- **Request checks**: you cannot borrow your own tool; dates must be consistent and not in the past.
- **Cancellation** of a pending request by the borrower.
- **Day-before reminder** ahead of the end date, in addition to the overdue reminder.
- **Replay protection** for webhooks: signed timestamp rejected after 5 minutes, unique ID per message (duplicates ignored), constant-time signature comparison, in both directions.
- **Outbox**: no notification is lost if n8n is down.
- **Listing deletion blocked** while an approved loan has not been returned.
- **Polished UI**: explicit empty states, mobile-friendly layout.

### 1.4 How the platform works

A loan goes through four statuses (plus "cancelled", proposed), driven first by the borrower and then by the lender; overdue is computed automatically and triggers a daily reminder.

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

Every status change triggers a notification. Only the lender moves a loan forward after the request; "overdue" is never stored, it is derived from the dates.

#### Business rules

Rules marked "proposed" are not in the brief: they are choices justified in the README.

| Topic | Rule | Origin |
| --- | --- | --- |
| Availability | A tool is available if no approved, unreturned loan covers today | Brief; definition proposed |
| Request | Covers a period: start date and end date; end ≥ start; no past dates | Brief; checks proposed |
| Own tool | You cannot borrow your own tool | Proposed |
| Overlap | Two approved loans cannot overlap on the same tool; an overlapping approval is rejected | Proposed |
| Multiple requests | Several pending requests may target the same tool; the lender chooses | Proposed |
| Cancellation | The borrower can cancel a request while it is pending | Proposed |
| Response | Only the lender approves or declines a request on their tool | Brief |
| Return | The lender marks the loan as returned; the tool becomes available again | Brief; actor proposed |
| Overdue | A loan is overdue if approved, not returned, and past its end date; computed, not stored | Brief; definition proposed |
| Reminder | At most one reminder per day per overdue loan, in the borrower's language | Brief; limit proposed |
| Notifications | Every new request and every status change notifies the person concerned | Brief |
| Listing deletion | Not allowed while an approved loan is not returned; pending requests are then declined automatically | Proposed |
| Trusted Lender | Badge shown on the lender's listings; granted or removed by an admin; grants no permission | Brief; effect proposed |

#### Roles

| Action | Visitor | User | Admin |
| --- | --- | --- | --- |
| View the public page | Yes | Yes | Yes |
| Create a listing | No | Yes | Yes |
| Edit or delete a listing | No | Own only | Delete any |
| Request a loan | No | Yes, not on own tools | Yes |
| Approve, decline, mark returned | No | On own tools only | Not required |
| View all loans | No | No, own only | Yes |
| Grant the "Trusted Lender" badge | No | No | Yes |

#### End-to-end scenario

This scenario covers every feature; it doubles as the demo script and the manual test plan. Characters: Awa (lender), Marc and Léa (borrowers), Sophie (admin).

1. **Public visit**: Marc lands on LendLoop in English, switches to French, sees "Drill · DIY" with no owner information, then signs up.
2. **Listing**: Awa lists a drill (DIY, good condition, "with 2 batteries"); it appears in My listings and on the public page.
3. **Requests**: Marc requests the drill from November 10 to 12; Léa from November 11 to 13. Awa is notified of each request.
4. **Response**: Awa approves Marc. Léa's request overlaps that loan: Awa declines it. Marc's and Léa's pages update without a reload.
5. **Forbidden attempt**: Marc tries to delete Awa's listing by calling Convex directly; the action is rejected (FORBIDDEN).
6. **Overdue**: on November 13 the drill has not been returned. The daily reminder notifies Marc in French; his page shows "Reminder sent today".
7. **Incident**: the email service fails; n8n retries, then the error workflow logs the failure. No reminder is recorded twice.
8. **Return**: Awa marks the loan as returned; the drill is available again.
9. **Administration**: Sophie views all loans, grants Awa the "Trusted Lender" badge and removes a spam listing.

### 1.5 Languages

| Requirement | Detail |
| --- | --- |
| Languages | `en` (default), `fr`, `zh` (simplified Chinese), `de` |
| Switcher | Visible on every page, including the public page; the choice is remembered |
| First visit | Browser language if supported, otherwise English |
| URL | Every language prefixed (`/en/tools`, `/fr/tools`, `/zh/tools`, `/de/tools`); `/` redirects to the browser language, otherwise `/en` |
| Translated | All UI text, Clerk screens, categories, conditions, statuses, errors, date formats |
| Not translated | User-entered content: tool name and description |
| Notifications | Sent in the recipient's language, stored in `users.locale` |

The brief does not ask for translations: this is an added product requirement.

### 1.6 Tech stack

| Building block | Role | Required |
| --- | --- | --- |
| Next.js 16 (App Router) | Web application | Yes |
| Clerk | Sign-in and account management | Yes |
| Convex | Database and server logic | Yes |
| n8n | Automations, self-hosted with Docker | Yes |
| TypeScript | Language for the whole project | Yes |
| next-intl | Translations and per-language routing | No |
| Tailwind + shadcn/ui | UI | No |
| react-hook-form + zod | Forms and validation | No |
| date-fns | Relative dates | No |

### 1.7 Architecture

Convex is the only place that decides: Next.js displays, Clerk identifies, n8n executes.

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

| Building block | Does | Does not |
| --- | --- | --- |
| Next.js | Pages, forms, filters, translations, real-time display | No trusted permission checks, no direct data access |
| Clerk | Identify the user, provide a signed JWT | Store the role or business data |
| Convex | Data, permissions, loan rules, overdue computation, webhooks | Send emails or messages |
| n8n | Scheduled jobs, sending messages, retries, error workflow | Decide who is overdue, modify the database directly |

#### Architecture decisions

| # | Decision | Why |
| --- | --- | --- |
| 1 | A single Next.js project at the root; `convex/` inside the same project (same `package.json`) | One `npm install`, Convex types shared directly with the front-end |
| 2 | The role is stored in `users` (Convex); the first admin comes from `ADMIN_EMAILS` | The rule lives with the data; no self-promotion possible |
| 3 | The user is created in Convex on their first call (`ensureUser`) | Simpler than an extra Clerk webhook |
| 4 | The **lender** marks the loan as returned | They are the one who sees the tool come back |
| 5 | Dates as `YYYY-MM-DD` days; "overdue" computed in Convex | A single definition of overdue |
| 6 | One HMAC secret per direction | If one leaks, the other direction stays protected |
| 7 | **Outbox**: the mutation writes the event, a scheduled action sends it and retries | A mutation cannot call the network; no notification lost; the eventId is the dedup key |
| 8 | Translations in Next.js; Convex stores only keys and error codes | Data stays language-independent |

### 1.8 Repository tree

A single project: the `LendLoop/` folder is the Next.js project. Each block is detailed in its part.

```
LendLoop/                                 single Next.js project (package.json)
├─ app/                                   PART 2 — pages and routes
├─ features/                              PART 3 — front-end code, business logic per module
├─ components/                            PART 3 — shared components
├─ hooks/                                 PART 3 — cross-cutting hooks
├─ lib/                                   PART 3 — utilities
├─ providers/                             PART 3 — global providers
├─ i18n/                                  PART 3 — language configuration
├─ messages/                              PART 3 — translations
├─ proxy.ts                               PART 3 — route protection + language
├─ convex/                                PART 4 — back-end
├─ n8n/                                   PART 5 — automations (not a Node project)
├─ doc/                                   PART 6 — specification
├─ scripts/check-messages.ts              PART 3 — checks keys across the 4 languages
├─ public/                                logo, favicon
├─ .env.example  .gitignore  components.json  next.config.ts  tsconfig.json  package.json
└─ README.md                              PART 7 — in English
```

### 1.9 Security by layer

| Layer | Protection | Part |
| --- | --- | --- |
| Next.js | Routes protected by `proxy.ts`, AdminGuard, no client-side secret besides `NEXT_PUBLIC_*` | 2, 3 |
| Clerk → Convex | JWT verified by Convex on every call | 4 |
| Convex functions | requireUser, requireOwner, requireAdmin; validators; controlled status transitions | 4 |
| Public page | `listPublic` query limited to name and category | 4 |
| Convex ↔ n8n | HMAC-SHA256, timestamp < 5 min, unique eventId, constant-time comparison, one secret per direction | 4, 5 |
| Data sent to n8n | Minimal: eventId, first name, email, language, tool name, dates | 4, 5 |
| Repository | `.env.example` without values, `.env*` ignored by git | 7 |

### 1.10 Environment variables

| Variable | Where | Role |
| --- | --- | --- |
| `NEXT_PUBLIC_CONVEX_URL` | Next.js | Convex deployment URL |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Next.js | Clerk publishable key |
| `CLERK_SECRET_KEY` | Next.js | Clerk secret key, server-side |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Next.js | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Next.js | `/sign-up` |
| `CLERK_JWT_ISSUER_DOMAIN` | Convex | Token verification |
| `ADMIN_EMAILS` | Convex | Emails that get the admin role |
| `N8N_NOTIFY_WEBHOOK_URL` | Convex | Workflow 1 webhook |
| `HMAC_SECRET_CONVEX_TO_N8N` | Convex and n8n | Signs messages to n8n |
| `HMAC_SECRET_N8N_TO_CONVEX` | Convex and n8n | Signs messages to Convex |
| `CONVEX_SITE_URL` | n8n | Convex HTTP endpoints URL |
| `N8N_ENCRYPTION_KEY` | n8n | Encrypts n8n credentials |
| `GENERIC_TIMEZONE` | n8n | Time zone of the daily reminder |

**Caveat**: a cloud-hosted Convex deployment cannot reach an n8n instance on `localhost`. In development we use a local Convex deployment (`npx convex dev`, local option); otherwise a tunnel to n8n (cloudflared or ngrok).

---

## 2. Pages and routes — `app/`

Pages are thin: each one mounts a module component (part 3) and contains no logic.

### 2.1 Routes

Every route is prefixed with the language (`/en`, `/fr`, `/zh`, `/de`); paths below are relative to that prefix.

| Route | Access | Component | Rendering |
| --- | --- | --- | --- |
| `/` | Public | PublicLanding | Server (`preloadQuery`), name and category only |
| `/sign-in`, `/sign-up` | Public | SignIn, SignUp (Clerk) | Client |
| `/tools` | Signed in | ToolsBrowser | Client, real time, `?category=` filter |
| `/tools/new` | Signed in | ToolForm | Client |
| `/tools/[id]` | Signed in | ToolDetail + RequestForm | Client |
| `/tools/[id]/edit` | Owner | ToolForm | Client |
| `/my-listings` | Signed in | MyListings | Client |
| `/my-requests` | Signed in | MyRequests + AutomationActivity | Client |
| `/incoming` | Signed in | IncomingRequests + LoanActions | Client |
| `/admin` | Admin | AllLoans | Client |
| `/admin/users` | Admin | UsersAdmin | Client |

### 2.2 Screen behavior

Each screen shows the rules before Convex enforces them: users understand why an action is unavailable instead of hitting an error.

| Screen | What you do there | Visible rules |
| --- | --- | --- |
| Public page | See available tools, change language, sign in | Name and category only |
| All tools | Browse, filter by category | Available / Unavailable badge; Trusted Lender badge |
| Tool detail | Read the listing, request a loan | Calendar greys out approved periods; form hidden on your own tool; invalid dates blocked |
| Create / edit | Enter name, category, condition, description | Translated categories, conditions and errors |
| My listings | Edit, delete | Delete disabled with an explanation while an approved loan is not returned; confirmation warns that pending requests will be declined |
| My requests | Track your requests, cancel | Cancel only while pending; reminder history ("Reminder sent yesterday") |
| Incoming requests | Approve, decline, mark returned | Approve disabled with a warning on overlap; Mark returned only on an approved loan |
| Admin | View all loans, remove a listing, manage the badge | Status filter, including "Overdue" |

### 2.3 Route protection

1. `proxy.ts` (Clerk + next-intl) redirects a signed-out visitor to `/sign-in` in their language.
2. `AdminGuard` shows "Access denied" to non-admins.
3. **Convex functions reject the action**: the only real barrier; the first two levels are for convenience.

### 2.4 Tree

```
app/
├─ globals.css                           Tailwind
└─ [locale]/                             en | fr | zh | de
   ├─ layout.tsx                         <html lang>, font (+ Noto Sans SC), <AppProviders>
   ├─ page.tsx                           server: preloadQuery(listPublic) → <PublicLanding>
   ├─ not-found.tsx
   ├─ error.tsx
   ├─ sign-in/[[...sign-in]]/page.tsx    <SignIn />
   ├─ sign-up/[[...sign-up]]/page.tsx    <SignUp />
   ├─ (app)/                             signed-in pages
   │  ├─ layout.tsx                      <AppShell userMenu={<UserMenu/>}> + useEnsureUser
   │  ├─ loading.tsx
   │  ├─ tools/page.tsx                  <ToolsBrowser />
   │  ├─ tools/new/page.tsx              <ToolForm mode="create" />
   │  ├─ tools/[id]/page.tsx             <ToolDetail /> + <RequestForm />  (composes tools + loans)
   │  ├─ tools/[id]/edit/page.tsx        <ToolForm mode="edit" />
   │  ├─ my-listings/page.tsx            <MyListings />
   │  ├─ my-requests/page.tsx            <MyRequests />
   │  └─ incoming/page.tsx               <IncomingRequests />
   └─ (admin)/admin/                     admin pages
      ├─ layout.tsx                      <AdminGuard> + <AppShell>
      ├─ page.tsx                        <AllLoans />
      └─ users/page.tsx                  <UsersAdmin />
```

---

## 3. Front-end code — `features/`, `components/`, `hooks/`, `lib/`, `providers/`, `i18n/`, `messages/`

### 3.1 Tree

```
features/                                BUSINESS LOGIC: one folder per module
├─ tools/
│  ├─ components/                        public-landing, public-tool-list, tools-browser,
│  │                                     tool-card, tool-detail, tool-form,
│  │                                     category-filter, my-listings
│  ├─ hooks/                             use-tools, use-tool, use-my-listings, use-tool-mutations
│  ├─ schemas.ts                         makeToolFormSchema(t): translated zod messages
│  ├─ types.ts                           Tool, PublicTool (inferred from Convex)
│  └─ index.ts                           module public API
├─ loans/
│  ├─ components/                        request-form, my-requests, incoming-requests,
│  │                                     loan-actions, loan-status-badge, automation-activity
│  ├─ hooks/                             use-my-requests, use-incoming-requests,
│  │                                     use-loan-actions, use-booked-ranges, use-automation-activity
│  ├─ schemas.ts                         makeLoanRequestSchema(t): end ≥ start, no past dates
│  ├─ types.ts
│  └─ index.ts
├─ admin/
│  ├─ components/                        all-loans, users-admin, trusted-lender-toggle, remove-tool-button
│  ├─ hooks/use-admin.ts
│  ├─ providers/admin-guard.tsx          non-admin → <ErrorState code="FORBIDDEN">
│  └─ index.ts
└─ auth/
   ├─ components/user-menu.tsx           Clerk <UserButton> + role
   ├─ hooks/use-current-user.ts          api.users.me
   ├─ hooks/use-ensure-user.ts           ensureUser once after sign-in
   └─ index.ts

components/                              SHARED: no business logic
├─ ui/                                   shadcn: button, input, textarea, select, dialog, badge,
│                                        card, table, calendar, popover, skeleton, sonner
├─ layout/                               app-shell, header, nav, language-switcher
└─ shared/                               page-header, empty-state, confirm-dialog, date-range-picker,
                                         data-table, error-state, loading-skeleton,
                                         relative-time, trusted-lender-badge

hooks/                                   use-search-param, use-safe-mutation
lib/                                     dates, errors (Convex code → translation key), routes, cn
providers/                               app-providers (NextIntl > localized Clerk > Convex), convex-client-provider
i18n/
├─ routing.ts                            locales, defaultLocale "en", localePrefix "always"
├─ request.ts                            loads messages/<locale>.json
└─ navigation.ts                         localized Link, useRouter, redirect
messages/                                en.json (source of truth), fr.json, zh.json, de.json
proxy.ts                                 clerkMiddleware + next-intl
```

### 3.2 Modules and dependency rules

Dependencies flow one way: `app → features → components, hooks, lib, i18n → convex/shared`.

| Module | Convex mirror | Hooks |
| --- | --- | --- |
| `features/tools` | `convex/tools.ts` | use-tools, use-tool, use-my-listings, use-tool-mutations |
| `features/loans` | `convex/loans.ts` | use-my-requests, use-incoming-requests, use-loan-actions, use-booked-ranges, use-automation-activity |
| `features/admin` | `convex/admin.ts` | use-admin |
| `features/auth` | `convex/users.ts` | use-current-user, use-ensure-user |

- **Pages compose; modules never import each other.** The tool page assembles `ToolDetail` (tools) and `RequestForm` (loans).
- **Shared code never depends on business code.** `AppShell` receives the user menu as a prop.
- **Hooks**: components never call `useQuery(api…)` directly; toasts, translated errors and optimistic updates go through `use-safe-mutation`.
- **Providers**: NextIntl, Clerk and Convex are global; only `AdminGuard` belongs to a module; the category filter lives in the URL.
- **Components**: a component used by a single module stays in that module; as soon as a second one needs it, it moves to `components/shared`.
- **Models**: constants in `convex/shared`; types generated (`Doc<"tools">`, `Id<"loans">`) or inferred (`FunctionReturnType`), never rewritten by hand.
- **Each module exposes an `index.ts`**; pages import `@/features/loans`, never an internal file.

### 3.3 Internationalization

next-intl handles the four languages; `messages/en.json` is the source of truth and the other three files have exactly the same keys.

| Topic | Implementation |
| --- | --- |
| Languages | Declared in `i18n/routing.ts` |
| Detection | Browser language on first visit, then the `NEXT_LOCALE` cookie |
| Switcher | `language-switcher` in the header and on the public page; also calls `users.setLocale` when signed in |
| Keys | Grouped by module: `tools.form.title`, `loans.status.approved`, `errors.DATES_OVERLAP` |
| Checks | Keys typed from `en.json` + `scripts/check-messages.ts` |
| Convex data | Categories, conditions, statuses and errors arrive as keys or codes, translated at display time |
| Clerk | `localization` = enUS, frFR, zhCN or deDE depending on the active language |
| Forms | zod schemas built with `t()` for translated error messages |
| Dates | next-intl `useFormatter` and date-fns with the active locale |
| Layout | Font with Chinese glyphs (Noto Sans SC); buttons wide enough for German |

### 3.4 Conventions

- Code, comments and commits in English.
- Files in kebab-case, components in PascalCase, hooks prefixed with `use-`.
- `'use client'` as low as possible: only interactive components are client components; the public page stays server-rendered.
- No hard-coded text in components: everything goes through `t()`.
- Every list has an explicit, translated empty state (`EmptyState`).
- Mobile-friendly layout: single-column grids and tables replaced by cards on small screens.

---

## 4. Back-end — `convex/`

Convex holds the data, permissions and rules. Function-level details will be completed before back-end development starts.

### 4.1 Tree

```
convex/
├─ schema.ts                users, tools, loans, outbox, automationEvents
├─ auth.config.ts           Clerk integration
├─ shared/                  imported by Convex AND the front-end
│  ├─ constants.ts          categories, conditions, statuses, roles, locales, error codes
│  ├─ validators.ts         reusable validators
│  └─ loan-rules.ts         allowed status transitions
├─ lib/                     auth (requireUser, requireOwner, requireAdmin), errors, hmac
├─ users.ts  tools.ts  loans.ts  admin.ts
├─ outbox.ts                webhook delivery + retries
├─ automation.ts            idempotent n8n results
├─ http.ts                  endpoints called by n8n
└─ _generated/              generated by Convex, not edited
```

### 4.2 Data model

| Table | Main fields | Notes |
| --- | --- | --- |
| users | clerkId, name, email, role, trustedLender, locale | Created on first sign-in; the role can never be changed by the user |
| tools | ownerId, name, category, condition, description, createdAt | Availability derived from active loans |
| loans | toolId, borrowerId, ownerId, startDate, endDate, status, returnedAt | Statuses: pending, approved, declined, returned, cancelled; "overdue" computed |
| outbox | eventId, type, payload, status, attempts, nextAttemptAt | Events to send to n8n |
| automationEvents | eventId, loanId, type, status, createdAt | Log of n8n actions; unique eventId; powers the "Reminder sent 2 days ago" bonus |

`category`, `condition` and `status` are stored as keys (`garden`, `good`, `approved`), translated in the front-end.

### 4.3 Permissions

Every query or mutation identifies the user through the Clerk token, then checks their role and ownership of the data (roles table in 1.4). Permissions are never only hidden in the UI.

### 4.4 Error codes

Functions return a code, never a plain-text message; the front-end translates it.

| Code | Case |
| --- | --- |
| `UNAUTHENTICATED` | No valid token |
| `FORBIDDEN` | Insufficient role or ownership |
| `NOT_FOUND` | Tool or loan not found |
| `INVALID_DATES` | End before start, or past date |
| `DATES_OVERLAP` | Period already taken by an approved loan |
| `OWN_TOOL` | Request on your own tool |
| `TOOL_HAS_ACTIVE_LOAN` | Deleting a tool with an approved, unreturned loan |
| `INVALID_TRANSITION` | Forbidden status change |

### 4.5 Exchanges with n8n

- A mutation cannot call the network: it writes the event to `outbox`; a scheduled action sends it signed to n8n and retries on failure.
- n8n calls signed HTTP endpoints (`http.ts`) to read overdue loans and write reminder results.
- Every message carries a signed timestamp and a unique eventId; duplicates are ignored.
- Minimal data sent: eventId, first name, email, language, tool name, dates.

---

## 5. Automations — `n8n/`

n8n runs in Docker. The folder holds its configuration and exported workflows, no Node code.

### 5.1 Tree

```
n8n/
├─ docker-compose.yml
├─ .env.example
└─ workflows/
   ├─ notification.json                  workflow 1
   ├─ overdue-reminder.json              workflow 2 (overdue + day before)
   └─ error-handler.json                 error workflow
```

### 5.2 Workflows

```
Convex (request created or status changed)
   │ HMAC webhook
   ▼
Workflow 1: notification ───────────────► Recipient (email, Slack, Discord or log)

Convex HTTP ◄──── signed GET: overdue loans ──── Workflow 2: overdue (daily) ───► Borrower
            ◄──── idempotent POST: result ────

Workflows 1 and 2 ── on failure after retries ──► Error workflow (logs)
```

1. **Notification**: triggered by the Convex webhook on every request or status change; message by email, Slack, Discord or mocked log, in the recipient's language.
2. **Reminder**: scheduled daily; reads overdue loans, reminds each borrower, writes the result back to Convex; also notifies the day before the end date.
3. **Error**: catches failures after retries and logs them.

### 5.3 Security and reliability requirements

| Requirement | What is concretely expected |
| --- | --- |
| HMAC-signed webhooks | Every message is signed (HMAC-SHA256 of body + timestamp) and verified on receipt |
| Secrets out of the code | n8n credentials and environment variables; `.env.example` without values |
| Idempotent write-backs | The same write sent twice has a single effect |
| Retries | Retry configured on nodes that call external services |
| Error workflow | Catches failures and logs them |
| Bonus: history | Recent automation activity visible per loan |

---

## 6. Documentation — `doc/`

| File | Content |
| --- | --- |
| `cahier-des-charges.fr.md` | This document, in French |
| `cahier-des-charges.en.md` | The same document, in English |

Both versions are kept in sync; every decision made during development is recorded here.

---

## 7. Delivery

### 7.1 Deliverables

- [ ] **GitHub repository** with the full application source.
- [ ] **Exported n8n workflows** as JSON, in `n8n/workflows/`.
- [ ] **README** in English: local setup (with the n8n docker-compose), environment variables, architecture, security and data-minimization decisions.
- [ ] **Note** on what would change for production.

### 7.2 Production roadmap

| Improvement | Benefit |
| --- | --- |
| Admin action log | Know who removed or changed what, and when |
| Soft delete for listings | Restore a listing deleted by mistake |
| Per-user request rate limit | Curb spam |
| Regular HMAC secret rotation | Limit the impact of a leak without downtime |
| Monitoring with Sentry and Datadog | Detect errors and slowness |
| Neighbor reviews, tool photos, neighborhood filter | Trust and relevance of listings |

### 7.3 Evaluation criteria

1. Code structure and clarity.
2. Security-minded thinking.
3. UX and practicality.
4. n8n integration: design, reliability, error handling.
5. Documentation and reasoning.
