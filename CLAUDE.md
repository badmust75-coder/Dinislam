# CLAUDE.md

Ce fichier fournit des instructions à Claude Code (claude.ai/code) pour travailler sur ce dépôt.

## Présentation du projet

Dinislam est une application web d'éducation islamique (en français) construite avec React + TypeScript + Vite, utilisant Supabase comme backend. Elle couvre les sourates du Coran (114 + Ayat Al-Kursi), les invocations, la méthode Nourania, l'apprentissage de la prière, les activités du Ramadan, l'alphabet arabe, les noms d'Allah, la grammaire/conjugaison, le vocabulaire, les hadiths, et plus encore. Elle dispose de rôles admin/élève avec un workflow d'approbation (accepter/refuser), un suivi de présence, des devoirs, une messagerie, des notifications push, un classement et un chat mascotte (via Supabase Edge Function).

## Commandes

- `npm run dev` — Lancer le serveur de développement (port 8080)
- `npm run build` — Build de production
- `npm run build:dev` — Build de développement
- `npm run lint` — ESLint
- `npm run test` — Lancer tous les tests (vitest)
- `npm run test:watch` — Tests en mode watch
- Test unique : `npx vitest run src/chemin/vers/fichier.test.ts`

## Architecture

**Stack frontend :** React 18, TypeScript, Vite (plugin SWC), Tailwind CSS, shadcn/ui (primitives Radix), React Router v6, TanStack React Query.

**Alias de chemin :** `@` pointe vers `./src` (configuré dans vite, vitest et tsconfig).

**Répertoires principaux :**
- `src/pages/` — Composants de pages (routes). La plupart des routes sont protégées via `ProtectedRoute` dans App.tsx (vérification auth + statut admin/approbation).
- `src/components/` — Composants regroupés par fonctionnalité : `admin/`, `audio/`, `auth/`, `cards/`, `homework/`, `layout/`, `mascot/`, `messaging/`, `nourania/`, `prayer/`, `push/`, `ramadan/`, `settings/`, `sourates/`, `ui/` (shadcn).
- `src/contexts/AuthContext.tsx` — Contexte d'authentification unique fournissant `user`, `session`, `isAdmin`, `isApproved`, ainsi que les méthodes d'auth. Utilise Supabase Auth avec une table `user_roles` pour les vérifications admin et `profiles.is_approved` pour le contrôle d'approbation.
- `src/hooks/` — Hooks personnalisés pour les horaires de prière, versets du Coran (dont Ayat Al-Kursi via numéro spécial 1000), notifications push, heartbeat de présence, messages non lus, progression utilisateur, confetti, compteurs admin, etc.
- `src/integrations/supabase/` — `client.ts` (instance du client Supabase) et `types.ts` (types DB auto-générés). Le fichier types est la source de vérité pour le schéma de la base de données.
- `src/lib/` — Fonctions utilitaires (inclut le helper `cn()` de shadcn dans `utils.ts`).

**Backend (Supabase) :**
- `supabase/functions/` — Edge Functions : `admin-assistant`, `delete-user`, `get-vapid-key`, `mascot-chat`, `process-scheduled-notifications`, `send-push-notification`.
- `supabase/migrations/` — Fichiers de migration SQL.
- La base de données compte 50+ tables couvrant les profils, modules d'apprentissage, devoirs, présence, notifications, contenu Ramadan, contenu prière, quiz, et plus.

**Routage :** Toutes les routes sauf `/auth` et `*` (404) sont enveloppées dans `ProtectedRoute`. Les routes de modules dynamiques utilisent `/module/:moduleId` avec `GenericModulePage`, et plusieurs chemins de modules spécifiques utilisent `GenericTimelinePage`.

**Gestion d'état :** État serveur via TanStack React Query ; état d'auth via React Context ; pas de bibliothèque d'état global supplémentaire.

**Tests :** Vitest avec environnement jsdom, React Testing Library. Fichier de setup dans `src/test/setup.ts`. Les fichiers de test suivent le pattern `*.test.ts` ou `*.spec.ts` dans `src/`.

**Composants UI :** shadcn/ui (style default, couleur de base slate, variables CSS activées). Ajouter de nouveaux composants avec `npx shadcn-ui@latest add <composant>`.

## Sourates — Spécificités

- **Ayat Al-Kursi** (numéro spécial `1000`) est insérée entre Al-Ikhlas (112) et Al-Masad (111) dans `SOURATES_ORDERED`. L'API Quran charge le verset 255 de Al-Baqara via `useQuranVerses`. Affiche "111b" dans l'étoile. Étoile dorée ambre (`hsl(38, 90%, 50%)`) avec halo animé pulsant (classe `.star-ayat-kursi`) pour la distinguer des autres.
- **Icônes 🎁** sur les étoiles toutes les 5 sourates à partir d'Al-Fil (105) : `GIFT_SOURATE_NUMBERS` = {105, 100, 95, …, 5}. Validation d'une sourate 🎁 → feux d'artifice (`fireConfetti`) + toast de félicitation.
- **Accessibilité séquentielle** : basée sur l'index dans `SOURATES_ORDERED` (pas number+1), pour gérer Ayat Al-Kursi.
- **Contenu ciblé** : `sourate_content.target_user_id` (nullable) pour envoyer du contenu à un élève spécifique. `viewed_at` pour le suivi de lecture admin.

## Système de validation admin

Toutes les validations (inscriptions, sourates, nourania, invocations) disposent de boutons **Accepter** et **Refuser** :
- **Inscriptions** (`AdminRegistrationValidations`) : accepter = `is_approved=true` + rôle `student` ; refuser = suppression profil.
- **Sourates** (`AdminSourateValidations`) : accepter = `status='approved'` + progression ; refuser = `status='refused'` + notification push + suppression demande pour retenter.
- **Nourania** (`AdminNouraniaValidations`) : idem sourates.
- **Invocations** (`AdminInvocationValidations`) : idem avec recalcul des points.
- Côté élève : réception realtime du refus + toast + possibilité de resoumettre.

## Contenu ciblé par élève

- Tables `sourate_content` et `nourania_lesson_content` ont des colonnes `target_user_id` (UUID nullable) et `viewed_at` (timestamptz).
- `target_user_id = NULL` → contenu global visible par tous.
- `target_user_id` défini → visible uniquement par cet élève.
- Admin voit le statut Vu/Non vu sous chaque contenu ciblé.
- Marquage automatique `viewed_at` quand l'élève ouvre la sourate/leçon.

## Parcours sourates — Layout

- Étoiles de 72px (`STAR_SIZE`), largeur parcours 370px (`TOTAL_WIDTH`), espacement 130px (`ROW_HEIGHT`).
- Numéros affichés dans **toutes** les étoiles (y compris verrouillées, en gris). Seules les validées affichent ✓.
- Personnages 56px dans les virages du serpentin.

## Cartes admin-only

Les cartes `students`, `messages`, `attendance`, `homework` dans `ADMIN_ONLY_CARDS` n'affichent jamais le toggle de visibilité élèves (pas d'icône œil).

## Déploiement

- **Lovable** est connecté au repo GitHub `badmust75-coder/dinislam-5e689abf` (branche `main`).
- Le repo original `badmust75-coder/Dinislam` est aussi maintenu à jour (remote `origin`).
- Pousser vers les deux remotes : `git push origin main && git push lovable main`.
