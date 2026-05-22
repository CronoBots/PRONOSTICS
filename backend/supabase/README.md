# 🗃 Setup Supabase pour NΞXBΞT

Ce dossier contient les migrations SQL et la doc de setup du backend
Supabase (auth + DB) qui remplace le mock localStorage de la Phase 1.

---

## 🚀 Setup initial (à faire UNE FOIS, ~15 min)

### 1. Créer le projet Supabase

1. Va sur [supabase.com](https://supabase.com) et crée un compte (gratuit, pas de carte requise)
2. **New project** :
   - Name : `nexbet-pronostics`
   - Database password : **génère-en un fort et garde-le quelque part** (utile pour pgAdmin si tu en as besoin un jour)
   - Region : **West EU (Ireland) eu-west-1** (le plus proche de la Belgique)
   - Plan : **Free**
3. Attends ~2 min que le projet provisionne

### 2. Récupérer les clés

Une fois le projet créé, va dans **Settings → API**. Tu auras :

| Clé | Visibilité | Usage |
|---|---|---|
| `Project URL` | public | Front + back |
| `anon public key` | public | Front (NEXT_PUBLIC_SUPABASE_ANON_KEY) |
| `service_role secret key` | **🔒 SECRET** | Webhook Stripe Edge Function uniquement, jamais dans le front |

### 3. Appliquer le schéma SQL

1. Dans le dashboard Supabase, va dans **SQL Editor → New query**
2. Copie-colle le contenu de `migrations/0001_initial_schema.sql`
3. Clique **Run**
4. Vérifie qu'il n'y a pas d'erreur. Tu devrais voir "Success. No rows returned."

Tu peux vérifier dans **Table Editor** que ces tables existent :
- `public.profiles`
- `public.subscriptions`
- `public.personal_bets`

### 3 bis. Appliquer les migrations suivantes (dans l'ordre)

Applique chaque fichier `migrations/000X_*.sql` dans l'ordre, via **SQL Editor → New query** :

| Migration | Quoi | Pourquoi |
|---|---|---|
| `0002_security_advisor_fixes.sql` | RLS init plan, function search_path, security definer views | Faire passer Supabase Advisor à 0 critical / 0 high |
| `0003_advisor_final.sql` | Derniers warnings résiduels | Idem |
| `0004_is_premium_invoker.sql` | `is_premium()` repassée en `SECURITY INVOKER` | Sécurité — INVOKER suffit avec la RLS |
| `0005_personal_bets_extended.sql` | Colonnes sport / label / odds / profit sur `personal_bets` | Mode tracker perso côté UI (`/mes-paris`) |

À chaque migration : copie-colle le SQL, clique **Run**, vérifie "Success. No rows returned."

Vérifie ensuite dans **Advisors → Security** qu'il y a 0 critical / 0 high.

### 4. Configurer Authentication

Dans **Authentication → Providers** :
- ✅ **Email** : activer (déjà ON par défaut)
- ⚠️ **Email Confirmation** : voir section **"Configuration de l'email de confirmation"** ci-dessous
- ⬜ **Google** : optionnel, à activer plus tard si tu veux OAuth

Dans **Authentication → URL Configuration** :
- **Site URL** : `https://cronobots.github.io/PRONOSTICS/`
- **Redirect URLs** : ajouter
  - `https://cronobots.github.io/PRONOSTICS/**`
  - `http://localhost:3000/**` (pour dev local)
  - `https://cronobots.github.io/PRONOSTICS/login` (cible du callback après clic sur le mail)

### 5. Ajouter les secrets dans GitHub Actions

Va sur ton repo GitHub → **Settings → Secrets and variables → Actions → New repository secret**.

Ajoute ces deux secrets :

| Nom | Valeur |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL depuis Supabase (ex: `https://abcdefgh.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key depuis Supabase |

⚠️ **Important** : le préfixe `NEXT_PUBLIC_` est volontaire — ces valeurs sont
exposées côté client (c'est sûr, c'est leur design). La sécurité vient des **RLS
policies** appliquées côté Postgres.

Ne **JAMAIS** committer `service_role` ou `database password` ! Le service_role
ne sera utilisé que dans une Edge Function Supabase (pas dans le repo).

### 6. Update du workflow GitHub Pages

Le workflow `.github/workflows/deploy-pages.yml` doit passer ces variables au
build Next.js. Voir section "Workflow" plus bas.

---

## 🧪 Test local (optionnel)

1. Crée un fichier `frontend/.env.local` (gitignored) :
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxxx...
   ```
2. `npm run dev` → ouvre http://localhost:3000
3. Va sur `/register`, crée un compte avec un email valide
4. Dans le dashboard Supabase → **Authentication → Users** : tu dois voir le user
5. Dans **Table Editor → profiles** : tu dois voir une ligne avec son pseudo

Si tout fonctionne, l'auth Supabase est OK.

---

## 📊 Schéma de données (résumé)

```
auth.users (géré par Supabase)
    ↓ 1:1
profiles
    - id (= auth.users.id)
    - pseudo
    
auth.users
    ↓ 1:N
subscriptions
    - status (active/cancelled/expired/past_due)
    - plan (monthly/yearly)
    - stripe_customer_id
    - stripe_subscription_id
    - current_period_end
    
auth.users
    ↓ 1:N
personal_bets       (étendue en migration 0005)
    - pick_date
    - sport           (football, basketball, tennis, …)
    - label           (libellé du pick, ex. "Ruud vainqueur")
    - match_label     (équipes ou joueurs)
    - odds            (cote décimale)
    - stake
    - outcome         (pending / win / loss / void)
    - profit          (calculé côté client, persisté)
    - notes
```

### Sécurité (RLS)
- Un user lit/modifie **uniquement** son propre profil
- Un user voit **uniquement** ses propres subscriptions (en lecture)
- Les subscriptions ne peuvent être créées/modifiées **que par le webhook Stripe** (service_role)
- Un user a un CRUD complet sur ses propres `personal_bets`

### Helper `is_premium(user_id)`
Fonction SQL qui retourne `true` si l'utilisateur a une subscription active.
Utilisable depuis le client via :
```sql
select is_premium(auth.uid())
```

---

## 🔄 Workflow CI/CD

Pour que les builds GH Pages aient accès aux variables Supabase, ajouter
dans `.github/workflows/deploy-pages.yml` au step de build Next.js :

```yaml
env:
  NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
  NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
```

(Sera fait automatiquement dans la Phase 1B.)

---

## 📧 Configuration de l'email de confirmation

Supabase a deux modes pour la confirmation d'email à la signup :

| Mode | Quand l'utiliser | UX |
|---|---|---|
| **OFF** | Phase de dev / démo, pas de spam à se soucier | Le user est connecté immédiatement après signup |
| **ON** | Production, pour valider que l'email existe et appartient bien au user | Le user reçoit un mail, doit cliquer le lien, puis se reconnecter |

### Option A — Désactiver la confirmation (recommandé en dev)

Le plus simple si tu démarres :

1. Dashboard Supabase → **Authentication → Sign In / Up → Auth Providers → Email**
2. Toggle **Confirm email** → **OFF**
3. Sauvegarde

Tout user déjà bloqué peut être débloqué manuellement :
- **Authentication → Users** → clique sur le user → menu `⋯` → **Send confirmation email** ou **Confirm user**

### Option B — Activer la confirmation (production)

Le serveur SMTP par défaut de Supabase est **fortement rate-limité** (3 emails/h) et
**non recommandé en prod** : passe par un provider SMTP custom. Resend est le
plus simple (plan gratuit 3000 emails/mois).

#### B.1 — Setup Resend

1. Crée un compte sur [resend.com](https://resend.com) (gratuit)
2. **Domains** → **Add Domain** → entre ton domaine (ex. `cronobots.com`)
3. Configure les enregistrements DNS chez ton registrar (SPF + DKIM)
4. Une fois vérifié, **API Keys** → **Create API Key** → copie la `re_xxx...`
5. Note l'adresse expéditeur (ex. `no-reply@cronobots.com`)

> 💡 Si tu n'as pas de domaine propre, Resend permet d'envoyer depuis
> `onboarding@resend.dev` sans config DNS, mais c'est marqué "via Resend" dans
> les boîtes Gmail. À éviter en prod.

#### B.2 — Brancher Resend sur Supabase

1. Dashboard Supabase → **Project Settings → Authentication → SMTP Settings**
2. Toggle **Enable Custom SMTP**
3. Remplis :

| Champ | Valeur |
|---|---|
| Sender email | `no-reply@ton-domaine.com` |
| Sender name | `NΞXBΞT` |
| Host | `smtp.resend.com` |
| Port | `465` (SSL/TLS) |
| Username | `resend` |
| Password | ta clé API `re_xxxxxxxx` |

4. **Save**
5. **Email Templates → Confirm signup** : personnalise si tu veux (le template par défaut est utilisable)
6. Reviens **Authentication → Providers → Email** : toggle **Confirm email** → **ON**

#### B.3 — Vérifier que le frontend gère bien le flow

Le code frontend gère déjà les 3 cas :
- ✅ **Signup avec confirmation OFF** : user connecté immédiatement, redirigé vers `/`
- ✅ **Signup avec confirmation ON** : redirigé vers `/verify-email?email=xxx` avec instructions claires et bouton "Renvoyer"
- ✅ **Login pendant confirmation pending** : message + bouton "Renvoyer le mail" sur la page login

Tu peux tester avec un compte jetable (mailinator, +alias gmail) sans toucher
à ton compte principal.

### Mot de passe oublié

Le flow `/forgot-password` utilise `supabase.auth.resetPasswordForEmail()` et
nécessite la même config SMTP. Sans SMTP custom, tu seras limité à 3 mails/h.
La cible de redirection après clic sur le lien est `${origin}/login`.

---

## 🆘 Troubleshooting

### "Email signups disabled" à la signup
→ Authentication → Providers → Email : vérifier que c'est activé

### Le user est créé mais profile vide
→ Vérifier que le trigger `on_auth_user_created` existe (SQL Editor → run le 0001
   migration encore une fois, le `create or replace` est idempotent)

### "Email not confirmed" au login
→ Voir la section **Configuration de l'email de confirmation** ci-dessus.
   Si confirmation requise : ouvre l'app sur `/verify-email`, clique "Renvoyer".
   Sinon : désactive le toggle "Confirm email" dans Supabase.

### Le mail de confirmation n'arrive pas
→ Le serveur SMTP par défaut de Supabase est rate-limité (3 emails/h) et finit
   souvent en spam. **Configure un SMTP custom (Resend) pour la prod.**
→ Vérifie que `Site URL` et `Redirect URLs` dans Authentication → URL Configuration
   contiennent bien le domaine de prod et `localhost:3000` pour dev.
→ Vérifie que `emailRedirectTo` côté code (`lib/auth.tsx`) pointe vers `/login`,
   pas vers une URL inaccessible.

### Le lien dans le mail expire trop vite
→ Par défaut 24h. Modifiable dans Authentication → Settings → Email link expiry.

### RLS error "new row violates row-level security policy"
→ Normal pour la table `subscriptions` (volontaire — seul le webhook peut écrire)
→ Pour `profiles`/`personal_bets`, vérifier que l'utilisateur est bien authentifié
   (`auth.uid()` doit retourner son uuid, pas null)
