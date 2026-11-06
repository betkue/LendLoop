# Cahier des charges — LendLoop

> Version française. English version: [cahier-des-charges.en.md](cahier-des-charges.en.md)

Un seul document : une partie générale, puis une partie par dossier du dépôt.

## Sommaire

1. [Général](#1-général) — tout le projet
   - [1.1 Présentation du projet](#11-présentation-du-projet)
   - [1.2 Fonctionnalités attendues](#12-fonctionnalités-attendues)
   - [1.3 Améliorations ajoutées](#13-améliorations-ajoutées)
   - [1.4 Fonctionnement de la plateforme](#14-fonctionnement-de-la-plateforme) : [cycle de vie](#14-fonctionnement-de-la-plateforme), [règles](#règles-de-fonctionnement), [rôles](#rôles), [parcours complet](#parcours-complet)
   - [1.5 Langues](#15-langues)
   - [1.6 Stack technique](#16-stack-technique)
   - [1.7 Architecture](#17-architecture) : [décisions](#décisions-darchitecture)
   - [1.8 Arborescence du dépôt](#18-arborescence-du-dépôt)
   - [1.9 Sécurité par couche](#19-sécurité-par-couche)
   - [1.10 Variables d'environnement](#110-variables-denvironnement)
2. [Pages et routes](#2-pages-et-routes--app) — `app/`
   - [2.1 Routes](#21-routes)
   - [2.2 Comportement des écrans](#22-comportement-des-écrans)
   - [2.3 Protection des routes](#23-protection-des-routes)
   - [2.4 Arborescence](#24-arborescence)
3. [Code front](#3-code-front--features-components-hooks-lib-providers-i18n-messages) — `features/`, `components/`, `hooks/`, `lib/`, `providers/`, `i18n/`, `messages/`, `proxy.ts`
   - [3.1 Arborescence](#31-arborescence)
   - [3.2 Modules et règles de dépendance](#32-modules-et-règles-de-dépendance)
   - [3.3 Internationalisation](#33-internationalisation)
   - [3.4 Conventions](#34-conventions)
4. [Back-end](#4-back-end--convex) — `convex/`
   - [4.1 Arborescence](#41-arborescence)
   - [4.2 Modèle de données](#42-modèle-de-données)
   - [4.3 Droits](#43-droits)
   - [4.4 Codes d'erreur](#44-codes-derreur)
   - [4.5 Échanges avec n8n](#45-échanges-avec-n8n)
5. [Automatisations](#5-automatisations--n8n) — `n8n/`
   - [5.1 Arborescence](#51-arborescence)
   - [5.2 Workflows](#52-workflows)
   - [5.3 Exigences de sécurité et de fiabilité](#53-exigences-de-sécurité-et-de-fiabilité)
6. [Documentation](#6-documentation--doc) — `doc/`
7. [Livraison](#7-livraison) — racine (`README.md`, `.env.example`)
   - [7.1 Livrables](#71-livrables)
   - [7.2 Pistes pour la production](#72-pistes-pour-la-production)
   - [7.3 Critères d'évaluation](#73-critères-dévaluation)

---

## 1. Général

### 1.1 Présentation du projet

LendLoop est une plateforme de prêt d'outils entre voisins : chacun prête ce qu'il n'utilise pas et emprunte ce dont il a besoin, au lieu de l'acheter. Slogan : « Borrow what you need. Lend what you don't. »

La plateforme est en anglais par défaut, et disponible en français, chinois et allemand.

### 1.2 Fonctionnalités attendues

Ce que le sujet demande ; le détail est dans les parties suivantes.

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

### 1.3 Améliorations ajoutées

Ce que le projet ajoute au sujet ; chaque ajout est justifié dans le README.

- **4 langues** : anglais par défaut, français, chinois et allemand ; notifications dans la langue du destinataire.
- **Pas de chevauchement** : un outil ne peut pas être prêté deux fois sur la même période.
- **Contrôles de demande** : impossible d'emprunter son propre outil ; dates cohérentes et non passées.
- **Annulation** d'une demande en attente par l'emprunteur.
- **Rappel la veille** de la date de fin, en plus du rappel de retard.
- **Protection contre le rejeu** des webhooks : horodatage signé refusé au-delà de 5 minutes, identifiant unique par message (doublons ignorés), signatures comparées à temps constant, dans les deux sens.
- **File d'envoi (outbox)** : aucune notification perdue si n8n est arrêté.
- **Suppression d'annonce bloquée** tant qu'un prêt accepté n'est pas rendu.
- **Interface soignée** : pages vides explicites, affichage adapté au mobile.

### 1.4 Fonctionnement de la plateforme

Un prêt passe par quatre statuts (plus « annulée », proposé), décidés par l'emprunteur puis par le prêteur ; le retard est calculé automatiquement et déclenche un rappel quotidien.

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

Chaque changement de statut déclenche une notification. Seul le prêteur fait avancer un prêt après la demande ; « en retard » n'est jamais enregistré, il se déduit des dates.

#### Règles de fonctionnement

Les règles marquées « proposée » ne sont pas dans le sujet : ce sont des choix justifiés dans le README.

| Sujet | Règle | Origine |
| --- | --- | --- |
| Disponibilité | Un outil est disponible s'il n'a aucun prêt accepté et non rendu couvrant la date du jour | Sujet ; définition proposée |
| Demande | Porte sur une période : date de début et date de fin ; fin ≥ début ; pas de date passée | Sujet ; contrôles proposés |
| Propre outil | Impossible d'emprunter son propre outil | Proposée |
| Chevauchement | Deux prêts acceptés ne peuvent pas se chevaucher sur le même outil ; une acceptation qui chevauche est refusée | Proposée |
| Plusieurs demandes | Plusieurs demandes en attente peuvent viser le même outil ; le prêteur choisit | Proposée |
| Annulation | L'emprunteur peut annuler sa demande tant qu'elle est en attente | Proposée |
| Réponse | Seul le prêteur accepte ou refuse une demande sur son outil | Sujet |
| Retour | Le prêteur marque le prêt comme rendu ; l'outil redevient disponible | Sujet ; acteur proposé |
| Retard | Un prêt est en retard s'il est accepté, non rendu, et que sa date de fin est dépassée ; calculé, pas stocké | Sujet ; définition proposée |
| Rappel | Au plus un rappel par jour et par prêt en retard, dans la langue de l'emprunteur | Sujet ; limite proposée |
| Notifications | Chaque création de demande et chaque changement de statut prévient la personne concernée | Sujet |
| Suppression d'annonce | Impossible si un prêt accepté n'est pas rendu ; les demandes en attente sont alors refusées automatiquement | Proposée |
| Trusted Lender | Badge affiché sur les annonces du prêteur ; attribué ou retiré par un admin ; ne donne aucun droit | Sujet ; effet proposé |

#### Rôles

| Action | Visiteur | Utilisateur | Admin |
| --- | --- | --- | --- |
| Voir la page publique | Oui | Oui | Oui |
| Créer une annonce | Non | Oui | Oui |
| Modifier ou supprimer une annonce | Non | Seulement les siennes | Supprimer n'importe laquelle |
| Demander un emprunt | Non | Oui, pas sur ses propres outils | Oui |
| Accepter, refuser, marquer rendu | Non | Seulement sur ses outils | Non demandé |
| Voir tous les prêts | Non | Non, seulement les siens | Oui |
| Attribuer le badge « Trusted Lender » | Non | Non | Oui |

#### Parcours complet

Ce scénario parcourt toutes les fonctionnalités ; il sert de démo et de plan de test manuel. Personnages : Awa (prêteuse), Marc et Léa (emprunteurs), Sophie (admin).

1. **Visite publique** : Marc arrive sur LendLoop en anglais, passe en français, voit « Perceuse · Bricolage » sans information sur la propriétaire, puis crée un compte.
2. **Annonce** : Awa publie une perceuse (Bricolage, bon état, « avec 2 batteries ») ; elle apparaît dans Mes annonces et sur la page publique.
3. **Demandes** : Marc demande la perceuse du 10 au 12 novembre ; Léa du 11 au 13. Awa reçoit une notification pour chaque demande.
4. **Réponse** : Awa accepte Marc. La demande de Léa chevauche ce prêt : Awa la refuse. Les pages de Marc et Léa se mettent à jour sans rechargement.
5. **Tentative interdite** : Marc essaie de supprimer l'annonce d'Awa en appelant directement Convex ; l'action est refusée (FORBIDDEN).
6. **Retard** : le 13 novembre, la perceuse n'est pas rendue. Le rappel quotidien prévient Marc en français ; sa page affiche « Rappel envoyé aujourd'hui ».
7. **Incident** : le service d'email échoue ; n8n réessaie, puis le workflow d'erreur journalise l'échec. Aucun rappel n'est enregistré en double.
8. **Retour** : Awa marque le prêt comme rendu ; la perceuse redevient disponible.
9. **Administration** : Sophie consulte tous les prêts, attribue le badge « Trusted Lender » à Awa et supprime une annonce de spam.

### 1.5 Langues

| Exigence | Détail |
| --- | --- |
| Langues | `en` (défaut), `fr`, `zh` (chinois simplifié), `de` |
| Sélecteur | Visible sur toutes les pages, y compris la page publique ; le choix est mémorisé |
| Première visite | Langue du navigateur si elle est prise en charge, sinon anglais |
| URL | Toutes les langues préfixées (`/en/tools`, `/fr/tools`, `/zh/tools`, `/de/tools`) ; `/` redirige vers la langue du navigateur, sinon `/en` |
| Traduit | Tout le texte d'interface, écrans Clerk, catégories, états, statuts, erreurs, formats de dates |
| Non traduit | Contenu saisi par les utilisateurs : nom et description des outils |
| Notifications | Envoyées dans la langue du destinataire, enregistrée dans `users.locale` |

Le sujet ne demande pas de traduction : c'est une exigence produit ajoutée.

### 1.6 Stack technique

| Brique | Rôle | Imposée |
| --- | --- | --- |
| Next.js 16 (App Router) | Application web | Oui |
| Clerk | Connexion et gestion des comptes | Oui |
| Convex | Base de données et logique serveur | Oui |
| n8n | Automatisations, auto-hébergé avec Docker | Oui |
| TypeScript | Langage de tout le projet | Oui |
| next-intl | Traductions et routage par langue | Non |
| Tailwind + shadcn/ui | Interface | Non |
| react-hook-form + zod | Formulaires et validation | Non |
| date-fns | Dates relatives | Non |

### 1.7 Architecture

Convex est le seul endroit qui décide : Next.js affiche, Clerk identifie, n8n exécute.

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

| Brique | Fait | Ne fait pas |
| --- | --- | --- |
| Next.js | Pages, formulaires, filtres, traductions, affichage temps réel | Aucune vérification de droits fiable, aucun accès direct aux données |
| Clerk | Identifier l'utilisateur, fournir un jeton JWT signé | Stocker le rôle ou les données métier |
| Convex | Données, droits, règles des prêts, calcul des retards, webhooks | Envoyer des emails ou des messages |
| n8n | Tâches planifiées, envoi des messages, retries, workflow d'erreur | Décider qui est en retard, modifier la base directement |

#### Décisions d'architecture

| # | Décision | Pourquoi |
| --- | --- | --- |
| 1 | Un seul projet Next.js à la racine ; `convex/` dans le même projet (même `package.json`) | Un seul `npm install`, types Convex partagés directement avec le front |
| 2 | Le rôle est stocké dans `users` (Convex) ; le premier admin vient de `ADMIN_EMAILS` | La règle vit avec les données ; pas d'auto-promotion possible |
| 3 | L'utilisateur est créé dans Convex à son premier appel (`ensureUser`) | Plus simple qu'un webhook Clerk supplémentaire |
| 4 | Le **prêteur** marque le prêt comme rendu | C'est lui qui constate le retour |
| 5 | Dates en jours `AAAA-MM-JJ` ; « en retard » calculé dans Convex | Une seule définition du retard |
| 6 | Un secret HMAC par sens | Si l'un fuit, l'autre sens reste protégé |
| 7 | **Outbox** : la mutation écrit l'événement, une action planifiée l'envoie et relance | Une mutation ne peut pas appeler le réseau ; aucune notification perdue ; l'eventId sert de clé anti-doublon |
| 8 | Traductions côté Next.js ; Convex ne stocke que des clés et des codes d'erreur | Les données restent indépendantes de la langue |

### 1.8 Arborescence du dépôt

Un seul projet : le dossier `LendLoop/` est le projet Next.js. Chaque bloc est détaillé dans sa partie.

```
LendLoop/                                 projet Next.js unique (package.json)
├─ app/                                   PARTIE 2 — pages et routes
├─ features/                              PARTIE 3 — code front, métier par module
├─ components/                            PARTIE 3 — composants partagés
├─ hooks/                                 PARTIE 3 — hooks transverses
├─ lib/                                   PARTIE 3 — utilitaires
├─ providers/                             PARTIE 3 — providers globaux
├─ i18n/                                  PARTIE 3 — configuration des langues
├─ messages/                              PARTIE 3 — traductions
├─ proxy.ts                               PARTIE 3 — protection des routes + langue
├─ convex/                                PARTIE 4 — back-end
├─ n8n/                                   PARTIE 5 — automatisations (pas un projet Node)
├─ doc/                                   PARTIE 6 — cahier des charges
├─ scripts/check-messages.ts              PARTIE 3 — vérifie les clés des 4 langues
├─ public/                                logo, favicon
├─ .env.example  .gitignore  components.json  next.config.ts  tsconfig.json  package.json
└─ README.md                              PARTIE 7 — en anglais
```

### 1.9 Sécurité par couche

| Couche | Protection | Partie |
| --- | --- | --- |
| Next.js | Routes protégées par `proxy.ts`, AdminGuard, aucun secret côté client hors `NEXT_PUBLIC_*` | 2, 3 |
| Clerk → Convex | Jeton JWT vérifié par Convex à chaque appel | 4 |
| Fonctions Convex | requireUser, requireOwner, requireAdmin ; validateurs ; transitions de statut contrôlées | 4 |
| Page publique | Query `listPublic` limitée au nom et à la catégorie | 4 |
| Convex ↔ n8n | HMAC-SHA256, horodatage < 5 min, eventId unique, comparaison à temps constant, un secret par sens | 4, 5 |
| Données envoyées à n8n | Minimales : eventId, prénom, email, langue, nom de l'outil, dates | 4, 5 |
| Dépôt | `.env.example` sans valeurs, `.env*` ignorés par git | 7 |

### 1.10 Variables d'environnement

| Variable | Où | Rôle |
| --- | --- | --- |
| `NEXT_PUBLIC_CONVEX_URL` | Next.js | Adresse du déploiement Convex |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Next.js | Clé publique Clerk |
| `CLERK_SECRET_KEY` | Next.js | Clé secrète Clerk, côté serveur |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Next.js | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Next.js | `/sign-up` |
| `CLERK_JWT_ISSUER_DOMAIN` | Convex | Vérification des jetons |
| `ADMIN_EMAILS` | Convex | Emails qui reçoivent le rôle admin |
| `N8N_NOTIFY_WEBHOOK_URL` | Convex | Webhook du workflow 1 |
| `HMAC_SECRET_CONVEX_TO_N8N` | Convex et n8n | Signe les messages vers n8n |
| `HMAC_SECRET_N8N_TO_CONVEX` | Convex et n8n | Signe les messages vers Convex |
| `CONVEX_SITE_URL` | n8n | Adresse des endpoints HTTP Convex |
| `N8N_ENCRYPTION_KEY` | n8n | Chiffre les credentials n8n |
| `GENERIC_TIMEZONE` | n8n | Fuseau du rappel quotidien |

**Point d'attention** : un Convex hébergé dans le cloud ne peut pas joindre un n8n sur `localhost`. En développement, on utilise un déploiement Convex local (`npx convex dev`, option locale) ; à défaut, un tunnel vers n8n (cloudflared ou ngrok).

---

## 2. Pages et routes — `app/`

Les pages sont fines : chacune monte un composant de module (partie 3) et ne contient aucune logique.

### 2.1 Routes

Toutes les routes sont préfixées par la langue (`/en`, `/fr`, `/zh`, `/de`) ; les chemins ci-dessous s'entendent après ce préfixe.

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

### 2.2 Comportement des écrans

Chaque écran affiche les règles avant que Convex ne les impose : l'utilisateur comprend pourquoi une action est impossible au lieu de recevoir une erreur.

| Écran | Ce qu'on y fait | Règles visibles |
| --- | --- | --- |
| Page publique | Voir les outils disponibles, changer de langue, se connecter | Nom et catégorie seulement |
| Tous les outils | Parcourir, filtrer par catégorie | Badge Disponible / Indisponible ; badge Trusted Lender |
| Fiche outil | Lire la fiche, demander un emprunt | Calendrier qui grise les périodes déjà acceptées ; formulaire masqué sur son propre outil ; dates invalides bloquées |
| Proposer / modifier | Saisir nom, catégorie, état, description | Catégories, états et erreurs traduits |
| Mes annonces | Modifier, supprimer | Suppression désactivée avec explication si un prêt accepté n'est pas rendu ; la confirmation prévient que les demandes en attente seront refusées |
| Mes demandes | Suivre ses demandes, annuler | Annuler seulement si en attente ; historique des rappels (« Rappel envoyé hier ») |
| Demandes reçues | Accepter, refuser, marquer rendu | Accepter désactivé avec avertissement en cas de chevauchement ; Marquer rendu seulement sur un prêt accepté |
| Admin | Voir tous les prêts, supprimer une annonce, gérer le badge | Filtre par statut, dont « En retard » |

### 2.3 Protection des routes

1. `proxy.ts` (Clerk + next-intl) redirige un visiteur non connecté vers `/sign-in` dans sa langue.
2. `AdminGuard` affiche « Accès refusé » à un non-admin.
3. **Les fonctions Convex refusent l'action** : seule vraie barrière, les deux premiers niveaux servent au confort.

### 2.4 Arborescence

```
app/
├─ globals.css                           Tailwind
└─ [locale]/                             en | fr | zh | de
   ├─ layout.tsx                         <html lang>, police (+ Noto Sans SC), <AppProviders>
   ├─ page.tsx                           serveur : preloadQuery(listPublic) → <PublicLanding>
   ├─ not-found.tsx
   ├─ error.tsx
   ├─ sign-in/[[...sign-in]]/page.tsx    <SignIn />
   ├─ sign-up/[[...sign-up]]/page.tsx    <SignUp />
   ├─ (app)/                             pages connectées
   │  ├─ layout.tsx                      <AppShell userMenu={<UserMenu/>}> + useEnsureUser
   │  ├─ loading.tsx
   │  ├─ tools/page.tsx                  <ToolsBrowser />
   │  ├─ tools/new/page.tsx              <ToolForm mode="create" />
   │  ├─ tools/[id]/page.tsx             <ToolDetail /> + <RequestForm />  (compose tools + loans)
   │  ├─ tools/[id]/edit/page.tsx        <ToolForm mode="edit" />
   │  ├─ my-listings/page.tsx            <MyListings />
   │  ├─ my-requests/page.tsx            <MyRequests />
   │  └─ incoming/page.tsx               <IncomingRequests />
   └─ (admin)/admin/                     pages admin
      ├─ layout.tsx                      <AdminGuard> + <AppShell>
      ├─ page.tsx                        <AllLoans />
      └─ users/page.tsx                  <UsersAdmin />
```

---

## 3. Code front — `features/`, `components/`, `hooks/`, `lib/`, `providers/`, `i18n/`, `messages/`

### 3.1 Arborescence

```
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

hooks/                                   use-search-param, use-safe-mutation
lib/                                     dates, errors (code Convex → clé de traduction), routes, cn
providers/                               app-providers (NextIntl > Clerk localisé > Convex), convex-client-provider
i18n/
├─ routing.ts                            locales, defaultLocale "en", localePrefix "always"
├─ request.ts                            charge messages/<locale>.json
└─ navigation.ts                         Link, useRouter, redirect localisés
messages/                                en.json (référence), fr.json, zh.json, de.json
proxy.ts                                 clerkMiddleware + next-intl
```

### 3.2 Modules et règles de dépendance

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

### 3.3 Internationalisation

next-intl gère les quatre langues ; `messages/en.json` est la référence et les trois autres fichiers ont exactement les mêmes clés.

| Sujet | Mise en œuvre |
| --- | --- |
| Langues | Déclarées dans `i18n/routing.ts` |
| Détection | Langue du navigateur au premier passage, puis cookie `NEXT_LOCALE` |
| Sélecteur | `language-switcher` dans l'en-tête et sur la page publique ; appelle aussi `users.setLocale` si connecté |
| Clés | Groupées par module : `tools.form.title`, `loans.status.approved`, `errors.DATES_OVERLAP` |
| Contrôle | Typage des clés à partir de `en.json` + `scripts/check-messages.ts` |
| Données Convex | Catégories, états, statuts et erreurs arrivent en clés ou codes, traduits à l'affichage |
| Clerk | `localization` = enUS, frFR, zhCN ou deDE selon la langue active |
| Formulaires | Schémas zod créés avec `t()` pour des messages d'erreur traduits |
| Dates | `useFormatter` de next-intl et date-fns avec la locale active |
| Mise en page | Police avec glyphes chinois (Noto Sans SC) ; boutons assez larges pour l'allemand |

### 3.4 Conventions

- Code, commentaires et commits en anglais.
- Fichiers en kebab-case, composants en PascalCase, hooks préfixés `use-`.
- `'use client'` au plus bas : seuls les composants interactifs sont client ; la page publique reste serveur.
- Aucun texte en dur dans les composants : tout passe par `t()`.
- Chaque liste a un état vide explicite et traduit (`EmptyState`).
- Mise en page adaptée au mobile : grilles en une colonne et tableaux remplacés par des cartes sur petit écran.

---

## 4. Back-end — `convex/`

Convex détient les données, les droits et les règles. Le détail des fonctions sera complété avant le développement du back-end.

### 4.1 Arborescence

```
convex/
├─ schema.ts                users, tools, loans, outbox, automationEvents
├─ auth.config.ts           lien avec Clerk
├─ shared/                  importé par Convex ET par le front
│  ├─ constants.ts          catégories, états, statuts, rôles, langues, codes d'erreur
│  ├─ validators.ts         validateurs réutilisés
│  └─ loan-rules.ts         transitions de statut autorisées
├─ lib/                     auth (requireUser, requireOwner, requireAdmin), errors, hmac
├─ users.ts  tools.ts  loans.ts  admin.ts
├─ outbox.ts                envoi des webhooks + relances
├─ automation.ts            résultats n8n idempotents
├─ http.ts                  endpoints appelés par n8n
└─ _generated/              généré par Convex, non modifié
```

### 4.2 Modèle de données

| Table | Champs principaux | Notes |
| --- | --- | --- |
| users | clerkId, name, email, role, trustedLender, locale | Créé à la première connexion ; le rôle n'est jamais modifiable par l'utilisateur |
| tools | ownerId, name, category, condition, description, createdAt | Disponibilité déduite des prêts en cours |
| loans | toolId, borrowerId, ownerId, startDate, endDate, status, returnedAt | Statuts : pending, approved, declined, returned, cancelled ; « en retard » calculé |
| outbox | eventId, type, payload, status, attempts, nextAttemptAt | Événements à envoyer à n8n |
| automationEvents | eventId, loanId, type, status, createdAt | Journal des actions n8n ; eventId unique ; sert au bonus « Reminder sent 2 days ago » |

`category`, `condition` et `status` sont stockés sous forme de clés (`garden`, `good`, `approved`), traduites côté front.

### 4.3 Droits

Chaque query ou mutation identifie l'utilisateur grâce au jeton Clerk, puis contrôle son rôle et sa propriété sur la donnée (tableau des rôles en 1.4). Les droits ne sont jamais seulement masqués dans l'interface.

### 4.4 Codes d'erreur

Les fonctions renvoient un code, jamais un message en clair ; le front le traduit.

| Code | Cas |
| --- | --- |
| `UNAUTHENTICATED` | Aucun jeton valide |
| `FORBIDDEN` | Rôle ou propriété insuffisants |
| `NOT_FOUND` | Outil ou prêt introuvable |
| `INVALID_DATES` | Fin avant début, ou date passée |
| `DATES_OVERLAP` | Période déjà prise par un prêt accepté |
| `OWN_TOOL` | Demande sur son propre outil |
| `TOOL_HAS_ACTIVE_LOAN` | Suppression d'un outil dont un prêt accepté n'est pas rendu |
| `INVALID_TRANSITION` | Changement de statut interdit |

### 4.5 Échanges avec n8n

- Une mutation ne peut pas appeler le réseau : elle écrit l'événement dans `outbox` ; une action planifiée l'envoie signé à n8n et relance en cas d'échec.
- n8n appelle des endpoints HTTP signés (`http.ts`) pour lire les prêts en retard et écrire le résultat des rappels.
- Chaque message porte un horodatage signé et un eventId unique ; les doublons sont ignorés.
- Données minimales envoyées : eventId, prénom, email, langue, nom de l'outil, dates.

---

## 5. Automatisations — `n8n/`

n8n tourne dans Docker. Le dossier contient sa configuration et les workflows exportés, pas de code Node.

### 5.1 Arborescence

```
n8n/
├─ docker-compose.yml
├─ .env.example
└─ workflows/
   ├─ notification.json                  workflow 1
   ├─ overdue-reminder.json              workflow 2 (retard + veille)
   └─ error-handler.json                 workflow d'erreur
```

### 5.2 Workflows

```
Convex (demande créée ou statut modifié)
   │ webhook HMAC
   ▼
Workflow 1 : notification ──────────────► Destinataire (email, Slack, Discord ou log)

Convex HTTP ◄──── GET signé : prêts en retard ──── Workflow 2 : retards (chaque jour) ───► Emprunteur
            ◄──── POST idempotent : résultat ────

Workflow 1 et 2 ── en cas d'échec après retries ──► Workflow d'erreur (journalise)
```

1. **Notification** : déclenché par le webhook de Convex à chaque demande ou changement de statut ; message par email, Slack, Discord ou log simulé, dans la langue du destinataire.
2. **Rappel** : planifié chaque jour ; lit les prêts en retard, rappelle chaque emprunteur, écrit le résultat dans Convex ; prévient aussi la veille de la date de fin.
3. **Erreur** : capte les échecs après les nouvelles tentatives et les journalise.

### 5.3 Exigences de sécurité et de fiabilité

| Exigence | Ce qu'on attend concrètement |
| --- | --- |
| Webhooks signés HMAC | Chaque message est signé (HMAC-SHA256 du corps + horodatage) et vérifié à la réception |
| Secrets hors du code | Credentials n8n et variables d'environnement ; `.env.example` sans valeurs |
| Écritures idempotentes | Une même écriture envoyée deux fois n'a qu'un seul effet |
| Nouvelles tentatives | Retry configuré sur les nœuds qui appellent l'extérieur |
| Workflow d'erreur | Capte les échecs et les journalise |
| Bonus : historique | Activité récente des automatisations visible par prêt |

---

## 6. Documentation — `doc/`

| Fichier | Contenu |
| --- | --- |
| `cahier-des-charges.fr.md` | Ce document, en français |
| `cahier-des-charges.en.md` | Le même document, en anglais |

Les deux versions sont tenues à jour ensemble ; toute décision prise pendant le développement y est reportée.

---

## 7. Livraison

### 7.1 Livrables

- [ ] **Dépôt GitHub** avec tout le code de l'application.
- [ ] **Workflows n8n exportés** en JSON, dans `n8n/workflows/`.
- [ ] **README** en anglais : installation locale (avec le docker-compose de n8n), variables d'environnement, architecture, choix de sécurité et de minimisation des données.
- [ ] **Note** sur ce qu'il faudrait changer pour passer en production.

### 7.2 Pistes pour la production

| Amélioration | Bénéfice |
| --- | --- |
| Journal des actions admin | Savoir qui a supprimé ou modifié quoi, et quand |
| Suppression réversible des annonces | Restaurer une annonce supprimée par erreur |
| Limite de demandes par utilisateur | Freiner le spam |
| Rotation régulière des secrets HMAC | Limiter l'impact d'une fuite sans coupure |
| Surveillance avec Sentry et Datadog | Détecter les erreurs et lenteurs |
| Avis entre voisins, photos des outils, filtre par quartier | Confiance et pertinence des annonces |

### 7.3 Critères d'évaluation

1. Structure et clarté du code.
2. Prise en compte de la sécurité.
3. Expérience utilisateur et côté pratique.
4. Intégration n8n : conception, fiabilité, gestion des erreurs.
5. Documentation et justification des choix.
