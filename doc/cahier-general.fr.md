# Cahier général — LendLoop

> Version française. English version: [cahier-general.en.md](cahier-general.en.md)
> Cahier détaillé du front-end : [cahier-nextjs.fr.md](cahier-nextjs.fr.md)

## Présentation du projet

LendLoop est une plateforme de prêt d'outils entre voisins : chacun prête ce qu'il n'utilise pas et emprunte ce dont il a besoin, au lieu de l'acheter. Slogan : « Borrow what you need. Lend what you don't. »

La plateforme est en anglais par défaut, et disponible en français, chinois et allemand.

### Fonctionnalités attendues

Ce que le sujet demande ; le détail est dans les sections suivantes.

- **Page publique** : slogan, liste des outils disponibles (nom et catégorie seulement), bouton de connexion.
- **Connexion** avec Clerk.
- **Annonces** : proposer un outil (nom, catégorie, état, description), modifier ou supprimer les siennes.
- **Recherche** : parcourir les outils et leur disponibilité, filtrer par catégorie.
- **Emprunt** : demander un outil sur une période.
- **Gestion des demandes** : accepter ou refuser les demandes sur ses outils, marquer un prêt comme rendu.
- **Vues** : Mes annonces, Mes demandes, Demandes reçues.
- **Admin** : supprimer n'importe quelle annonce, voir tous les prêts, attribuer le badge « Trusted Lender ».
- **Droits** vérifiés côté serveur (Convex), pas seulement dans l'interface.
- **Notification** à chaque demande ou changement de statut (n8n).
- **Rappel quotidien** des prêts en retard, avec résultat enregistré dans Convex (n8n).
- **Fiabilité et sécurité des automatisations** : webhooks signés HMAC, secrets hors du code, écritures idempotentes, nouvelles tentatives, workflow d'erreur.
- **Bonus** : historique des automatisations par prêt (« Reminder sent 2 days ago »).

### Améliorations ajoutées

Ce que le projet ajoute au sujet ; chaque ajout est à justifier dans le README.

- **4 langues** : anglais par défaut, français, chinois et allemand ; notifications dans la langue du destinataire.
- **Pas de chevauchement** : un outil ne peut pas être prêté deux fois sur la même période.
- **Contrôles de demande** : impossible d'emprunter son propre outil ; dates cohérentes et non passées.
- **Annulation** d'une demande en attente par l'emprunteur.
- **Rappel la veille** de la date de fin, en plus du rappel de retard.
- **Protection contre le rejeu** des webhooks : horodatage signé refusé au-delà de 5 minutes, identifiant unique par message (doublons ignorés), signatures comparées à temps constant, dans les deux sens (Convex vers n8n et n8n vers Convex).
- **File d'envoi (outbox)** : aucune notification perdue si n8n est arrêté.
- **Suppression d'annonce bloquée** tant qu'un prêt accepté n'est pas rendu.
- **Interface soignée** : pages vides explicites, affichage adapté au mobile.

## Fonctionnement de la plateforme

Un prêt passe par quatre statuts (plus « annulée », proposé), décidés par l'emprunteur puis par le prêteur ; le retard est calculé automatiquement et déclenche un rappel quotidien.

### Cycle de vie d'un prêt

```
                 ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
                   Annulée (cancelled)
                 │ par l'emprunteur    │   (proposé)
                 └ ─ ─ ─ ─ ▲ ─ ─ ─ ─ ─ ┘
                           │ annule
                 ┌─────────┴───────────┐  accepte  ┌─────────────────────┐  rendu  ┌─────────────────────┐
                 │ Demandée (pending)  ├──────────►│ Acceptée (approved) ├────────►│ Rendue (returned)   │
                 │ par l'emprunteur    │           │ par le prêteur      │         │ par le prêteur      │
                 └─────────┬───────────┘           └──────────┬──────────┘         └──────────▲──────────┘
                           │ refuse                           │ date de fin dépassée          │
                 ┌─────────▼───────────┐           ┌──────────▼──────────┐                    │
                 │ Refusée (declined)  │           │ En retard           ├────────────────────┘
                 │ par le prêteur      │           │ calculé, non stocké │   rendu en retard
                 └─────────────────────┘           │ rappel n8n quotidien│
                                                   └─────────────────────┘
```

Chaque changement de statut déclenche une notification (workflow 1). Seul le prêteur fait avancer un prêt après la demande ; « en retard » n'est jamais enregistré, il se déduit des dates.

### Règles de fonctionnement

Les règles marquées « proposée » ne sont pas dans le sujet : ce sont des choix à valider puis à justifier dans le README.

| Sujet | Règle | Origine |
| --- | --- | --- |
| Disponibilité | Un outil est disponible s'il n'a aucun prêt accepté et non rendu couvrant la date du jour | Sujet (« availability ») ; définition proposée |
| Demande | Porte sur une période : date de début et date de fin ; fin ≥ début ; pas de date passée | Sujet ; contrôles proposés |
| Propre outil | Impossible d'emprunter son propre outil | Proposée |
| Chevauchement | Deux prêts acceptés ne peuvent pas se chevaucher sur le même outil ; une acceptation qui chevauche est refusée | Proposée |
| Plusieurs demandes | Plusieurs demandes en attente peuvent viser le même outil ; le prêteur choisit | Proposée |
| Annulation | L'emprunteur peut annuler sa demande tant qu'elle est en attente | Proposée |
| Réponse | Seul le prêteur accepte ou refuse une demande sur son outil | Sujet |
| Retour | Le prêteur marque le prêt comme rendu ; l'outil redevient disponible | Sujet ; acteur proposé |
| Retard | Un prêt est en retard s'il est accepté, non rendu, et que sa date de fin est dépassée ; ce statut est calculé, pas stocké | Sujet ; définition proposée |
| Rappel | Au plus un rappel par jour et par prêt en retard, envoyé dans la langue de l'emprunteur | Sujet (quotidien) ; limite proposée |
| Notifications | Chaque création de demande et chaque changement de statut prévient la personne concernée | Sujet |
| Suppression d'annonce | Impossible si un prêt accepté n'est pas rendu ; les demandes en attente sont alors refusées automatiquement | Proposée |
| Trusted Lender | Badge affiché sur les annonces du prêteur ; attribué ou retiré par un admin ; ne donne aucun droit | Sujet ; effet proposé |

### Parcours complet

Ce scénario parcourt toutes les fonctionnalités ; il sert de démo et de plan de test manuel. Personnages : Awa (prêteuse), Marc et Léa (emprunteurs), Sophie (admin).

1. **Visite publique** : Marc arrive sur LendLoop en anglais, passe en français avec le sélecteur, voit « Perceuse · Bricolage » sans aucune information sur la propriétaire, puis crée un compte.
2. **Annonce** : Awa publie une perceuse (Bricolage, bon état, « avec 2 batteries ») ; elle apparaît dans Mes annonces et sur la page publique.
3. **Demandes** : Marc filtre par Bricolage et demande la perceuse du 10 au 12 novembre ; Léa la demande du 11 au 13. Awa reçoit une notification pour chaque demande.
4. **Réponse** : Awa accepte Marc. La demande de Léa chevauche ce prêt : Awa la refuse. Marc et Léa sont notifiés ; leurs pages se mettent à jour sans rechargement.
5. **Tentative interdite** : Marc essaie de supprimer l'annonce d'Awa en appelant directement Convex ; l'action est refusée (FORBIDDEN).
6. **Retard** : le 13 novembre, la perceuse n'est pas rendue. Le rappel quotidien prévient Marc en français ; sa page affiche « Rappel envoyé aujourd'hui ».
7. **Incident** : le service d'email échoue ; n8n réessaie, puis le workflow d'erreur journalise l'échec. Au passage suivant, aucun rappel n'est enregistré en double.
8. **Retour** : Awa marque le prêt comme rendu ; la perceuse redevient disponible.
9. **Administration** : Sophie consulte tous les prêts, attribue le badge « Trusted Lender » à Awa et supprime une annonce de spam.

## Stack technique imposée

Les cinq briques sont obligatoires.

| Brique | Rôle |
| --- | --- |
| Next.js (App Router) | Application web, pages publiques et privées |
| Clerk | Connexion et gestion des comptes |
| Convex | Base de données et logique serveur (queries, mutations, actions, endpoints HTTP) |
| n8n | Automatisations ; auto-hébergé avec Docker ou n8n Cloud |
| TypeScript | Langage de tout le projet |

## Architecture globale

Convex est le seul endroit qui décide : Next.js affiche, Clerk identifie, n8n exécute. Le détail de chaque dossier est dans son propre cahier : Next.js pour l'instant, Convex et n8n viendront ensuite.

```
┌──────────────────────────────┐   connexion   ┌──────────────────────────────┐
│ Next.js (App Router)         │◄─────────────►│ Clerk                        │
│ pages, formulaires, 4 langues│               │ connexion, jeton JWT signé   │
│ aucune règle métier          │               │ aucun rôle stocké            │
└──────────────┬───────────────┘               └──────────────┬───────────────┘
               │ appels + jeton JWT                           │ vérification du JWT
┌──────────────▼──────────────────────────────────────────────▼───────────────┐
│ Convex : données, droits, règles                                            │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│ │ Fonctions    ├─►│ Tables       ├─►│ outbox.dispatch  │  │ http.ts       │ │
│ │ requireUser  │  │ users, tools │  │ signe, envoie,   │  │ vérifie HMAC, │ │
│ │ requireAdmin │  │ loans, outbox│  │ relance          │  │ horodatage,   │ │
│ │              │  │ automation…  │  │                  │  │ eventId       │ │
│ └──────────────┘  └──────────────┘  └────────┬─────────┘  └───────▲───────┘ │
└──────────────────────────────────────────────┼────────────────────┼─────────┘
                                webhook signé  │                    │ GET / POST signés
┌──────────────────┐   ┌───────────────────────┼────────────────────┼─────────┐
│ Canal de message │◄──┤ n8n (Docker)          ▼                    │         │
│ email, Slack,    │   │ ┌────────────────┐ ┌──────────────┐ ┌──────┴───────┐ │
│ Discord ou log   │   │ │ Workflow erreur│◄┤ Workflow 1   │ │ Workflow 2   │ │
└──────────────────┘   │ │ journalise     │ │ notification │ │ rappels      │ │
                       │ └────────────────┘ └──────────────┘ └──────────────┘ │
                       └──────────────────────────────────────────────────────┘
```

Next.js appelle Convex avec le jeton Clerk ; Convex écrit l'événement dans l'outbox, puis l'envoie signé à n8n. n8n ne parle à Convex que par les endpoints signés de http.ts.

### Rôle de chaque brique

| Brique | Fait | Ne fait pas |
| --- | --- | --- |
| Next.js (App Router) | Pages, formulaires, filtres, traductions, affichage temps réel | Aucune vérification de droits fiable, aucun accès direct aux données |
| Clerk | Identifier l'utilisateur, fournir un jeton JWT signé à Convex | Stocker le rôle ou les données métier |
| Convex | Données, droits, règles des prêts, calcul des retards, envoi et réception des webhooks | Envoyer des emails ou des messages |
| n8n (Docker) | Tâches planifiées, envoi des messages dans la langue du destinataire, retries, workflow d'erreur | Décider qui est en retard, modifier la base directement |

### Décisions d'architecture

| # | Décision | Pourquoi |
| --- | --- | --- |
| 1 | Le rôle est stocké dans `users` (Convex) ; le premier admin vient de `ADMIN_EMAILS` | La règle vit avec les données ; pas d'auto-promotion possible |
| 2 | L'utilisateur est créé dans Convex à son premier appel (`ensureUser`) | Plus simple qu'un webhook Clerk supplémentaire |
| 3 | Le **prêteur** marque le prêt comme rendu | C'est lui qui constate le retour |
| 4 | Dates en jours `AAAA-MM-JJ` ; « en retard » calculé dans Convex | Une seule définition du retard |
| 5 | Un secret HMAC par sens | Si l'un fuit, l'autre sens reste protégé |
| 6 | **Outbox** : la mutation écrit l'événement, une action planifiée l'envoie et relance | Une mutation ne peut pas appeler le réseau ; aucune notification perdue ; l'eventId sert de clé anti-doublon |
| 7 | Traductions avec next-intl côté Next.js ; Convex ne stocke que des clés et des codes d'erreur | Les données restent indépendantes de la langue |

### Organisation du dépôt

| Dossier | Contenu | Cahier |
| --- | --- | --- |
| `app/`, `features/`, `components/`, `hooks/`, `lib/`, `providers/`, `i18n/`, `messages/`, `proxy.ts` | Application Next.js | Cahier Next.js |
| `convex/` | Schéma, fonctions, endpoints HTTP, outbox | Cahier dédié à venir |
| `n8n/` | docker-compose et workflows exportés en JSON | Section Workflows n8n ci-dessous (cahier dédié à venir) |
| `doc/` | Cahiers des charges (français et anglais) | — |
| Racine | `README.md`, `.env.example`, `package.json` | — |

Arborescence complète du dépôt ; le rôle de chaque fichier Next.js est détaillé dans le cahier Next.js, celui des fichiers Convex et n8n le sera dans leurs cahiers.

```
LendLoop/
├─ app/                                   NEXT.JS — routage
│  ├─ globals.css
│  └─ [locale]/                           en | fr | zh | de
│     ├─ layout.tsx
│     ├─ page.tsx                         page publique
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
├─ features/                              NEXT.JS — métier par module
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
├─ components/                            NEXT.JS — partagé
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
│  ├─ shared/                             constants, validators, loan-rules (partagé avec Next.js)
│  ├─ lib/                                auth, errors, hmac
│  ├─ users.ts
│  ├─ tools.ts
│  ├─ loans.ts
│  ├─ admin.ts
│  ├─ outbox.ts
│  ├─ automation.ts
│  ├─ http.ts
│  └─ _generated/                         généré par Convex, non modifié
│
├─ n8n/                                   AUTOMATISATIONS
│  ├─ docker-compose.yml
│  ├─ .env.example
│  └─ workflows/
│     ├─ notification.json                workflow 1
│     ├─ overdue-reminder.json            workflow 2 (retard + veille)
│     └─ error-handler.json               workflow d'erreur
│
├─ doc/                                   cahiers des charges (fr, en)
├─ scripts/
│  └─ check-messages.ts                   vérifie que les 4 langues ont les mêmes clés
├─ public/                                logo, favicon
├─ .env.example                           variables Next.js et Convex, sans valeurs
├─ .gitignore
├─ components.json                        configuration shadcn
├─ next.config.ts
├─ tsconfig.json                          alias @/
├─ package.json
└─ README.md                              en anglais
```

### Sécurité par couche

| Couche | Protection |
| --- | --- |
| Next.js | Routes protégées par `proxy.ts`, AdminGuard, aucun secret côté client hors `NEXT_PUBLIC_*` |
| Clerk → Convex | Jeton JWT vérifié par Convex à chaque appel |
| Fonctions Convex | requireUser, requireOwner, requireAdmin ; validateurs `v` ; transitions de statut contrôlées |
| Page publique | Query `listPublic` limitée au nom et à la catégorie |
| Convex ↔ n8n | HMAC-SHA256, horodatage < 5 min, eventId unique, comparaison à temps constant, un secret par sens |
| Données envoyées à n8n | Minimales : eventId, prénom, email, langue, nom de l'outil, dates |
| Dépôt | `.env.example` sans valeurs, `.env*` ignorés par git |

### Variables d'environnement

| Variable | Où | Rôle |
| --- | --- | --- |
| `NEXT_PUBLIC_CONVEX_URL` | Next.js | Adresse du déploiement Convex |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Next.js | Clé publique Clerk |
| `CLERK_SECRET_KEY` | Next.js | Clé secrète Clerk |
| `CLERK_JWT_ISSUER_DOMAIN` | Convex | Vérification des jetons |
| `ADMIN_EMAILS` | Convex | Emails qui reçoivent le rôle admin |
| `N8N_NOTIFY_WEBHOOK_URL` | Convex | Webhook du workflow 1 |
| `HMAC_SECRET_CONVEX_TO_N8N` | Convex et n8n | Signe les messages vers n8n |
| `HMAC_SECRET_N8N_TO_CONVEX` | Convex et n8n | Signe les messages vers Convex |
| `CONVEX_SITE_URL` | n8n | Adresse des endpoints HTTP Convex |
| `N8N_ENCRYPTION_KEY` | n8n | Chiffre les credentials n8n |
| `GENERIC_TIMEZONE` | n8n | Fuseau du rappel quotidien |

**Point d'attention** : un Convex hébergé dans le cloud ne peut pas joindre un n8n sur `localhost`. En développement, on utilise un déploiement Convex local (`npx convex dev`, option locale) ; à défaut, un tunnel vers n8n (cloudflared ou ngrok).

## Page publique

La page d'accueil est accessible sans connexion et n'expose aucune donnée personnelle.

- Nom de l'entreprise fictive : **LendLoop**.
- Un court slogan, par exemple « Borrow what you need. Lend what you don't. »
- Une liste en lecture seule des outils disponibles, lue depuis Convex : **nom et catégorie uniquement**, aucune information sur le propriétaire.
- Un bouton « Sign in to lend or borrow » relié à Clerk.

La query Convex publique doit elle-même ne renvoyer que le nom et la catégorie : filtrer seulement dans l'interface ne suffit pas.

## Fonctionnalités pour l'utilisateur connecté

Un utilisateur connecté peut prêter et emprunter. Toutes les actions sur les données passent par Convex.

Actions :

- **Proposer un outil** : nom, catégorie, état, courte description.
- **Demander à emprunter** un outil sur une période (date de début et date de fin).
- **Accepter ou refuser** les demandes faites sur ses propres outils.
- **Marquer un prêt comme rendu**.

Vues :

| Vue | Contenu |
| --- | --- |
| Tous les outils | Liste avec la disponibilité, filtrable par catégorie |
| Mes annonces (My listings) | Mes outils, modification et suppression |
| Mes demandes (My requests) | Les emprunts que j'ai demandés et leur statut |
| Demandes reçues (Incoming requests) | Les demandes sur mes outils, avec accepter ou refuser |

L'interface doit être sobre et minimaliste (« nice, minimal layout »).

## Langues

La plateforme est en **anglais par défaut** et traduisible en **français, chinois (simplifié) et allemand**. Le sujet du test ne le demande pas : c'est une exigence produit ajoutée, à présenter comme telle dans le README.

| Exigence | Détail |
| --- | --- |
| Langues | `en` (défaut), `fr`, `zh` (chinois simplifié), `de` |
| Sélecteur | Visible sur toutes les pages, y compris la page publique ; le choix est mémorisé |
| Première visite | Langue du navigateur si elle est prise en charge, sinon anglais |
| URL | Toutes les langues préfixées (`/en/tools`, `/fr/tools`, `/zh/tools`, `/de/tools`) ; `/` redirige vers la langue du navigateur, sinon `/en` |
| Traduit | Tout le texte d'interface, écrans de connexion Clerk, catégories, états, statuts, messages d'erreur, formats de dates |
| Non traduit | Contenu saisi par les utilisateurs : nom et description des outils |
| Notifications | Emails et rappels n8n envoyés dans la langue du destinataire, enregistrée dans `users.locale` |

Catégories, états et statuts sont stockés dans Convex sous forme de clés (`garden`, `approved`) et traduits à l'affichage. Les erreurs Convex sont des codes (`FORBIDDEN`, `DATES_OVERLAP`) traduits côté Next.js.

## Rôles et contrôle d'accès

Les droits doivent être vérifiés **dans les fonctions Convex**, et pas seulement masqués dans l'interface. Chaque query ou mutation identifie l'utilisateur grâce au jeton Clerk, puis contrôle son rôle et sa propriété sur la donnée.

| Action | Utilisateur | Admin |
| --- | --- | --- |
| Créer une annonce | Oui | Oui |
| Modifier ou supprimer une annonce | Seulement les siennes | Supprimer n'importe laquelle |
| Demander un emprunt | Oui, pas sur ses propres outils | Oui |
| Accepter ou refuser une demande | Seulement sur ses outils | Non demandé |
| Marquer un prêt rendu | Seulement les prêts où il est concerné | Non demandé |
| Voir tous les prêts | Non, seulement les siens | Oui |
| Attribuer le badge « Trusted Lender » | Non | Oui |

Le sujet ne précise pas si c'est le prêteur ou l'emprunteur qui marque le prêt comme rendu. C'est un choix à justifier dans le README.

Interdire d'emprunter son propre outil est une règle de bon sens, non écrite dans le sujet.

## Modèle de données proposé

Le sujet n'impose pas de schéma. Ce modèle est une proposition qui couvre toutes les exigences avec quatre tables Convex.

| Table | Champs principaux | Notes |
| --- | --- | --- |
| users | clerkId, name, email, role (user ou admin), trustedLender, locale | Créé à la première connexion ; le rôle n'est jamais modifiable par l'utilisateur lui-même |
| tools | ownerId, name, category, condition, description, createdAt | Disponibilité déduite des prêts en cours |
| loans | toolId, borrowerId, ownerId, startDate, endDate, status, returnedAt | Statuts : pending, approved, declined, returned, cancelled (proposé) ; « en retard » = approved et endDate dépassée |
| automationEvents | loanId, type, idempotencyKey, status, createdAt | Journal des actions n8n ; index unique sur idempotencyKey ; sert au bonus « Reminder sent 2 days ago » |

Minimisation des données : n8n ne reçoit que ce qui est nécessaire à l'envoi d'un message (identifiants, nom de l'outil, dates, adresse du destinataire).

## Workflows n8n

Il faut au moins deux workflows, plus un workflow d'erreur. Tous les échanges entre Convex et n8n sont signés.

```
Convex (mutation : demande créée ou statut modifié)
   │ webhook HMAC
   ▼
Workflow 1 : notification ──────────────► Destinataire (email, Slack, Discord ou log)
   vérifie la signature, envoie, retry

Convex HTTP ◄──── GET signé : prêts en retard ──── Workflow 2 : retards (chaque jour) ───► Emprunteur
            ◄──── POST idempotent : résultat ────     rappelle, écrit le résultat

Workflow 1 et 2 ── en cas d'échec après retries ──► Workflow d'erreur (journalise)
```

1. **Notification de demande** : déclenché par un webhook que Convex appelle quand une demande est créée ou change de statut. Le message part par email, Slack ou Discord ; un log simulé est accepté.
2. **Rappel des retards** : planifié une fois par jour. Il lit les prêts en retard via un endpoint HTTP Convex, envoie un rappel à chaque emprunteur, puis écrit le statut du rappel dans Convex. Il prévient aussi, la veille, les emprunteurs dont le prêt se termine le lendemain (proposé).
3. **Workflow d'erreur** : capte les échecs après les nouvelles tentatives et les signale ou les journalise.

Côté Convex, une mutation ne peut pas faire d'appel réseau : elle planifie une action (ctx.scheduler) qui envoie le webhook. Les workflows sont à exporter en JSON dans le dépôt.

## Exigences de sécurité et de fiabilité

Le sujet impose cinq exigences et en propose une en bonus.

| Exigence | Ce qu'on attend concrètement |
| --- | --- |
| Webhooks signés HMAC | Chaque message entre Convex et n8n est signé (HMAC-SHA256 du corps + horodatage) et vérifié à la réception ; rejet si la signature ou l'horodatage est invalide |
| Secrets hors du code | Variables d'environnement côté Next.js et Convex ; credentials n8n côté n8n ; un `.env.example` sans valeurs |
| Écritures en retour idempotentes | Une même écriture envoyée deux fois par n8n ne crée qu'un seul effet (clé d'idempotence) |
| Nouvelles tentatives | Retry configuré sur les nœuds n8n qui appellent l'extérieur |
| Workflow d'erreur | Un workflow n8n dédié qui capte les échecs et les signale ou les journalise |
| Bonus : historique | Afficher l'activité récente des automatisations par prêt, par exemple « Reminder sent 2 days ago » |

Le contrôle d'accès côté Convex (section Rôles) et l'absence de données personnelles sur la page publique font aussi partie de l'évaluation sécurité.

## Pistes pour la production

Ces pistes ne sont pas réalisées dans le projet ; elles vont dans la note « passage en production » du README.

| Amélioration | Bénéfice |
| --- | --- |
| Journal des actions admin | Savoir qui a supprimé ou modifié quoi, et quand |
| Suppression réversible des annonces | Restaurer une annonce supprimée par erreur |
| Limite de demandes par utilisateur | Freiner le spam |
| Rotation régulière des secrets HMAC, avec une période où l'ancien et le nouveau sont acceptés | Limiter l'impact d'une fuite sans coupure |
| Surveillance avec Sentry et Datadog | Détecter les erreurs et lenteurs |
| Avis entre voisins, photos des outils, filtre par quartier | Confiance et pertinence des annonces |

## Livrables

- [ ] **Dépôt GitHub** avec tout le code de l'application.
- [ ] **Workflows n8n exportés** en JSON, dans le dépôt.
- [ ] **README** (en anglais) qui couvre :
  - l'installation locale, avec un docker-compose pour n8n ;
  - la liste des variables d'environnement ;
  - l'architecture ;
  - les choix de sécurité et de minimisation des données.
- [ ] **Courte note** sur ce qu'il faudrait changer pour passer en production.

## Critères d'évaluation

1. Structure et clarté du code.
2. Prise en compte de la sécurité.
3. Expérience utilisateur et côté pratique.
4. Intégration n8n : conception, fiabilité, gestion des erreurs.
5. Documentation et justification des choix.
