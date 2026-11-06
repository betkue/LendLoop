# Next.js specification — LendLoop

> English version. Version française : [cahier-nextjs.fr.md](cahier-nextjs.fr.md)
> General specification: [cahier-general.en.md](cahier-general.en.md)

The front-end displays and composes; it decides nothing. The UI is in English by default and translatable into French, Chinese and German.

## Front-end stack

| Tool | Usage |
| --- | --- |
| Next.js 16 (App Router) + TypeScript | Application, routing, server rendering of the public page |
| Clerk (`@clerk/nextjs`, `@clerk/localizations`) | Sign-in, translated screens |
| Convex (`convex/react`, `ConvexProviderWithClerk`) | Real-time data |
| next-intl | Translations, per-language routing, date formats |
| Tailwind + shadcn/ui | Clean, minimal UI |
| react-hook-form + zod | Forms and validation |
| date-fns (locales en, fr, zh-CN, de) | Relative dates ("2 days ago") |

## Routes

Every language is prefixed: `/en/tools`, `/fr/tools`, `/zh/tools`, `/de/tools`. The root URL `/` redirects to the browser language if supported, otherwise to `/en`. Paths in the table are relative to that prefix.

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

## Screen behavior

Each screen shows the general specification's rules before Convex enforces them: users understand why an action is unavailable instead of hitting an error.

| Screen | What you do there | Visible rules |
| --- | --- | --- |
| Public page | See available tools, change language, sign in | Name and category only |
| All tools | Browse, filter by category | Available / Unavailable badge; Trusted Lender badge on relevant listings |
| Tool detail | Read the listing, request a loan | Calendar greys out already-approved periods (`use-booked-ranges`); form hidden on your own tool; past dates and end-before-start blocked |
| Create / edit | Enter name, category, condition, description | Translated categories and conditions; translated error messages |
| My listings | Edit, delete | Delete disabled with an explanation while an approved loan is not returned; confirmation warns that pending requests will be declined |
| My requests | Track your requests, cancel | Cancel button only while the request is pending; reminder history ("Reminder sent yesterday", "Day-before reminder sent") |
| Incoming requests | Approve, decline, mark returned | Approve disabled with a warning if the period overlaps an approved loan; Mark returned only on an approved loan |
| Admin | View all loans, remove a listing, manage the badge | Status filter, including "Overdue" |

Statuses shown by `loan-status-badge`: Pending, Approved, Declined, Returned, Cancelled, plus "Overdue" computed from the dates. Errors returned by Convex (`FORBIDDEN`, `OWN_TOOL`, `INVALID_DATES`, `DATES_OVERLAP`, `TOOL_HAS_ACTIVE_LOAN`, `INVALID_TRANSITION`) are translated through `messages/*.json` (`errors.<CODE>`).

## Route protection

1. `proxy.ts` (clerkMiddleware + next-intl middleware) redirects a signed-out visitor to `/sign-in` in their language.
2. `AdminGuard` shows "Access denied" to non-admins.
3. **Convex functions reject the action**: the only real barrier; the first two levels are for convenience.

`proxy.ts` replaces `middleware.ts` since Next.js 16; to be confirmed against the installed version.

## Tree

```
app/                                     ROUTING: thin pages, module composition
├─ globals.css                           Tailwind
└─ [locale]/                             en | fr | zh | de
   ├─ layout.tsx                         <html lang>, font (+ Noto Sans SC), <AppProviders>
   ├─ page.tsx                           server: preloadQuery(listPublic) → <PublicLanding>
   ├─ not-found.tsx
   ├─ error.tsx
   ├─ sign-in/[[...sign-in]]/page.tsx    <SignIn />
   ├─ sign-up/[[...sign-up]]/page.tsx    <SignUp />
   ├─ (app)/
   │  ├─ layout.tsx                      <AppShell userMenu={<UserMenu/>}> + useEnsureUser
   │  ├─ loading.tsx
   │  ├─ tools/page.tsx                  <ToolsBrowser />
   │  ├─ tools/new/page.tsx              <ToolForm mode="create" />
   │  ├─ tools/[id]/page.tsx             <ToolDetail /> + <RequestForm />  (composes tools + loans)
   │  ├─ tools/[id]/edit/page.tsx        <ToolForm mode="edit" />
   │  ├─ my-listings/page.tsx            <MyListings />
   │  ├─ my-requests/page.tsx            <MyRequests />
   │  └─ incoming/page.tsx               <IncomingRequests />
   └─ (admin)/admin/
      ├─ layout.tsx                      <AdminGuard> + <AppShell>
      ├─ page.tsx                        <AllLoans />
      └─ users/page.tsx                  <UsersAdmin />

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

i18n/
├─ routing.ts                            locales, defaultLocale "en", localePrefix "always"
├─ request.ts                            loads messages/<locale>.json
└─ navigation.ts                         localized Link, useRouter, redirect
messages/                                en.json (source of truth), fr.json, zh.json, de.json

hooks/                                   use-search-param, use-safe-mutation
lib/                                     dates, errors (Convex code → translation key), routes, cn
providers/                               app-providers (NextIntl > localized Clerk > Convex), convex-client-provider
proxy.ts                                 clerkMiddleware + next-intl
next.config.ts  tsconfig.json (@/ alias)  components.json (shadcn)
```

## Modules, hooks, providers and sharing

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

## Internationalization

next-intl handles the four languages; `messages/en.json` is the source of truth and the other three files must have exactly the same keys.

| Topic | Implementation |
| --- | --- |
| Languages | `en` (default), `fr`, `zh` (simplified Chinese), `de`, declared in `i18n/routing.ts` |
| Detection | Browser language on first visit, then the `NEXT_LOCALE` cookie |
| Switcher | `language-switcher` in the header and on the public page; also calls `users.setLocale` when signed in |
| Keys | Grouped by module: `tools.form.title`, `loans.status.approved`, `errors.DATES_OVERLAP` |
| Checks | Keys typed from `en.json` + a script that flags missing keys in fr, zh, de |
| Convex data | Categories, conditions, statuses and errors arrive as keys or codes, translated at display time |
| Clerk | `localization` = enUS, frFR, zhCN or deDE depending on the active language |
| Forms | zod schemas built with `t()` for translated error messages |
| Dates and numbers | next-intl `useFormatter` and date-fns with the active locale |
| Layout | Font with Chinese glyphs (Noto Sans SC); buttons wide enough for German |
| Not translated | Tool name and description entered by users |

## Next.js environment variables

| Variable | Role |
| --- | --- |
| `NEXT_PUBLIC_CONVEX_URL` | Convex deployment URL |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key, server-side |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` |

## Conventions

- Files in kebab-case, components in PascalCase, hooks prefixed with `use-`.
- `'use client'` as low as possible: only interactive components are client components; the public page stays server-rendered.
- No hard-coded text in components: everything goes through `t()`.
- Every list has an explicit, translated empty state (`EmptyState`: "No listings yet, add your first tool").
- Mobile-friendly layout: single-column grids and tables replaced by cards on small screens.
