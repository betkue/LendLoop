# Cahier Next.js — LendLoop

> Version française. English version: [cahier-nextjs.en.md](cahier-nextjs.en.md)
> Cahier général : [cahier-general.fr.md](cahier-general.fr.md)

Le front-end affiche et compose, il ne décide de rien. L'interface est en anglais par défaut et traduisible en français, chinois et allemand.

## Stack front-end

| Outil | Usage |
| --- | --- |
| Next.js 16 (App Router) + TypeScript | Application, routage, rendu serveur de la page publique |
| Clerk (`@clerk/nextjs`, `@clerk/localizations`) | Connexion, écrans traduits |
| Convex (`convex/react`, `ConvexProviderWithClerk`) | Données temps réel |
| next-intl | Traductions, routage par langue, formats de dates |
| Tailwind + shadcn/ui | Interface sobre et minimaliste |
| react-hook-form + zod | Formulaires et validation |
| date-fns (locales en, fr, zh-CN, de) | Dates relatives (« il y a 2 jours ») |

## Routes

Toutes les langues sont préfixées : `/en/tools`, `/fr/tools`, `/zh/tools`, `/de/tools`. L'adresse racine `/` redirige vers la langue du navigateur si elle est prise en charge, sinon vers `/en`. Les chemins du tableau s'entendent après ce préfixe.

| Route | Accès | Composant | Rendu |
| --- | --- | --- | --- |
| `/` | Public | PublicLanding | Serveur (`preloadQuery`), nom et catégorie seulement |
| `/sign-in`, `/sign-up` | Public | SignIn, SignUp (Clerk) | Client |
| `/tools` | Connecté | ToolsBrowser | Client, temps réel, filtre `?category=` |
| `/tools/new` | Connecté | ToolForm | Client |
| `/tools/[id]` | Connecté | ToolDetail + RequestForm | Client |
| `/tools/[id]/edit` | Propriétaire | ToolForm | Client |
| `/my-listings` | Connecté | MyListings | Client |
| `/my-requests` | Connecté | MyRequests + AutomationActivity | Client |
| `/incoming` | Connecté | IncomingRequests + LoanActions | Client |
| `/admin` | Admin | AllLoans | Client |
| `/admin/users` | Admin | UsersAdmin | Client |

## Comportement des écrans

Chaque écran affiche les règles du cahier général avant que Convex ne les impose : l'utilisateur comprend pourquoi une action est impossible au lieu de recevoir une erreur.

| Écran | Ce qu'on y fait | Règles visibles |
| --- | --- | --- |
| Page publique | Voir les outils disponibles, changer de langue, se connecter | Nom et catégorie seulement |
| Tous les outils | Parcourir, filtrer par catégorie | Badge Disponible / Indisponible ; badge Trusted Lender sur les annonces concernées |
| Fiche outil | Lire la fiche, demander un emprunt | Calendrier qui grise les périodes déjà acceptées (`use-booked-ranges`) ; formulaire masqué sur son propre outil ; dates passées et fin avant début bloquées |
| Proposer / modifier | Saisir nom, catégorie, état, description | Catégories et états traduits ; messages d'erreur traduits |
| Mes annonces | Modifier, supprimer | Suppression désactivée avec explication si un prêt accepté n'est pas rendu ; la confirmation prévient que les demandes en attente seront refusées |
| Mes demandes | Suivre ses demandes, annuler | Bouton Annuler seulement si la demande est en attente ; historique des rappels (« Rappel envoyé hier », « Rappel de la veille envoyé ») |
| Demandes reçues | Accepter, refuser, marquer rendu | Bouton Accepter désactivé et avertissement si la période chevauche un prêt accepté ; Marquer rendu seulement sur un prêt accepté |
| Admin | Voir tous les prêts, supprimer une annonce, gérer le badge | Filtre par statut, dont « En retard » |

Statuts affichés par `loan-status-badge` : Demandée, Acceptée, Refusée, Rendue, Annulée, et « En retard » calculé à partir des dates. Les erreurs renvoyées par Convex (`FORBIDDEN`, `OWN_TOOL`, `INVALID_DATES`, `DATES_OVERLAP`, `TOOL_HAS_ACTIVE_LOAN`, `INVALID_TRANSITION`) sont traduites via `messages/*.json` (`errors.<CODE>`).

## Protection des routes

1. `proxy.ts` (clerkMiddleware + middleware next-intl) redirige un visiteur non connecté vers `/sign-in` dans sa langue.
2. `AdminGuard` affiche « Accès refusé » à un non-admin.
3. **Les fonctions Convex refusent l'action** : seule vraie barrière, les deux premiers niveaux servent au confort.

`proxy.ts` remplace `middleware.ts` depuis Next.js 16, à confirmer selon la version installée.

## Arborescence

```
app/                                     ROUTAGE : pages fines, composition des modules
├─ globals.css                           Tailwind
└─ [locale]/                             en | fr | zh | de
   ├─ layout.tsx                         <html lang>, police (+ Noto Sans SC), <AppProviders>
   ├─ page.tsx                           serveur : preloadQuery(listPublic) → <PublicLanding>
   ├─ not-found.tsx
   ├─ error.tsx
   ├─ sign-in/[[...sign-in]]/page.tsx    <SignIn />
   ├─ sign-up/[[...sign-up]]/page.tsx    <SignUp />
   ├─ (app)/
   │  ├─ layout.tsx                      <AppShell userMenu={<UserMenu/>}> + useEnsureUser
   │  ├─ loading.tsx
   │  ├─ tools/page.tsx                  <ToolsBrowser />
   │  ├─ tools/new/page.tsx              <ToolForm mode="create" />
   │  ├─ tools/[id]/page.tsx             <ToolDetail /> + <RequestForm />  (compose tools + loans)
   │  ├─ tools/[id]/edit/page.tsx        <ToolForm mode="edit" />
   │  ├─ my-listings/page.tsx            <MyListings />
   │  ├─ my-requests/page.tsx            <MyRequests />
   │  └─ incoming/page.tsx               <IncomingRequests />
   └─ (admin)/admin/
      ├─ layout.tsx                      <AdminGuard> + <AppShell>
      ├─ page.tsx                        <AllLoans />
      └─ users/page.tsx                  <UsersAdmin />

features/                                MÉTIER : un dossier par module
├─ tools/
│  ├─ components/                        public-landing, public-tool-list, tools-browser,
│  │                                     tool-card, tool-detail, tool-form,
│  │                                     category-filter, my-listings
│  ├─ hooks/                             use-tools, use-tool, use-my-listings, use-tool-mutations
│  ├─ schemas.ts                         makeToolFormSchema(t) : messages zod traduits
│  ├─ types.ts                           Tool, PublicTool (déduits de Convex)
│  └─ index.ts                           API publique du module
├─ loans/
│  ├─ components/                        request-form, my-requests, incoming-requests,
│  │                                     loan-actions, loan-status-badge, automation-activity
│  ├─ hooks/                             use-my-requests, use-incoming-requests,
│  │                                     use-loan-actions, use-booked-ranges, use-automation-activity
│  ├─ schemas.ts                         makeLoanRequestSchema(t) : fin ≥ début, pas de passé
│  ├─ types.ts
│  └─ index.ts
├─ admin/
│  ├─ components/                        all-loans, users-admin, trusted-lender-toggle, remove-tool-button
│  ├─ hooks/use-admin.ts
│  ├─ providers/admin-guard.tsx          non-admin → <ErrorState code="FORBIDDEN">
│  └─ index.ts
└─ auth/
   ├─ components/user-menu.tsx           <UserButton> Clerk + rôle
   ├─ hooks/use-current-user.ts          api.users.me
   ├─ hooks/use-ensure-user.ts           ensureUser une fois après connexion
   └─ index.ts

components/                              PARTAGÉ : aucun métier
├─ ui/                                   shadcn : button, input, textarea, select, dialog, badge,
│                                        card, table, calendar, popover, skeleton, sonner
├─ layout/                               app-shell, header, nav, language-switcher
└─ shared/                               page-header, empty-state, confirm-dialog, date-range-picker,
                                         data-table, error-state, loading-skeleton,
                                         relative-time, trusted-lender-badge

i18n/
├─ routing.ts                            locales, defaultLocale "en", localePrefix "always"
├─ request.ts                            charge messages/<locale>.json
└─ navigation.ts                         Link, useRouter, redirect localisés
messages/                                en.json (référence), fr.json, zh.json, de.json

hooks/                                   use-search-param, use-safe-mutation
lib/                                     dates, errors (code Convex → clé de traduction), routes, cn
providers/                               app-providers (NextIntl > Clerk localisé > Convex), convex-client-provider
proxy.ts                                 clerkMiddleware + next-intl
next.config.ts  tsconfig.json (alias @/)  components.json (shadcn)
```

## Modules, hooks, providers et partage

Les dépendances vont dans un seul sens : `app → features → components, hooks, lib, i18n → convex/shared`.

| Module | Miroir Convex | Hooks |
| --- | --- | --- |
| `features/tools` | `convex/tools.ts` | use-tools, use-tool, use-my-listings, use-tool-mutations |
| `features/loans` | `convex/loans.ts` | use-my-requests, use-incoming-requests, use-loan-actions, use-booked-ranges, use-automation-activity |
| `features/admin` | `convex/admin.ts` | use-admin |
| `features/auth` | `convex/users.ts` | use-current-user, use-ensure-user |

- **Les pages composent, les modules ne s'importent pas.** La fiche outil assemble `ToolDetail` (tools) et `RequestForm` (loans) dans sa page.
- **Le partagé ne dépend jamais du métier.** `AppShell` reçoit le menu utilisateur en prop.
- **Hooks** : les composants n'appellent jamais `useQuery(api…)` directement ; toasts, erreurs traduites et mises à jour optimistes passent par `use-safe-mutation`.
- **Providers** : NextIntl, Clerk et Convex sont globaux ; seul `AdminGuard` est propre à un module ; le filtre par catégorie vit dans l'URL.
- **Composants** : un composant utilisé par un seul module reste dans le module ; dès qu'un deuxième en a besoin, il passe dans `components/shared`.
- **Modèles** : constantes dans `convex/shared` ; types générés (`Doc<"tools">`, `Id<"loans">`) ou déduits (`FunctionReturnType`), jamais réécrits.
- **Chaque module expose son `index.ts`** ; les pages importent `@/features/loans`, jamais un fichier interne.

## Internationalisation

next-intl gère les quatre langues ; `messages/en.json` est la référence et les trois autres fichiers doivent avoir exactement les mêmes clés.

| Sujet | Mise en œuvre |
| --- | --- |
| Langues | `en` (défaut), `fr`, `zh` (chinois simplifié), `de`, déclarées dans `i18n/routing.ts` |
| Détection | Langue du navigateur au premier passage, puis cookie `NEXT_LOCALE` |
| Sélecteur | `language-switcher` dans l'en-tête et sur la page publique ; appelle aussi `users.setLocale` si connecté |
| Clés | Groupées par module : `tools.form.title`, `loans.status.approved`, `errors.DATES_OVERLAP` |
| Contrôle | Typage des clés à partir de `en.json` + script qui signale les clés manquantes dans fr, zh, de |
| Données Convex | Catégories, états, statuts et erreurs arrivent en clés ou codes, traduits à l'affichage |
| Clerk | `localization` = enUS, frFR, zhCN ou deDE selon la langue active |
| Formulaires | Schémas zod créés avec `t()` pour des messages d'erreur traduits |
| Dates et nombres | `useFormatter` de next-intl et date-fns avec la locale active |
| Mise en page | Police avec glyphes chinois (Noto Sans SC) ; boutons assez larges pour l'allemand |
| Non traduit | Nom et description des outils saisis par les utilisateurs |

## Variables d'environnement Next.js

| Variable | Rôle |
| --- | --- |
| `NEXT_PUBLIC_CONVEX_URL` | Adresse du déploiement Convex |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clé publique Clerk |
| `CLERK_SECRET_KEY` | Clé secrète Clerk, côté serveur |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` |

## Conventions

- Fichiers en kebab-case, composants en PascalCase, hooks préfixés `use-`.
- `'use client'` au plus bas : seuls les composants interactifs sont client ; la page publique reste serveur.
- Aucun texte en dur dans les composants : tout passe par `t()`.
- Chaque liste a un état vide explicite (`EmptyState` : « No listings yet, add your first tool »), traduit.
- Mise en page adaptée au mobile : grilles en une colonne et tableaux remplacés par des cartes sur petit écran.
