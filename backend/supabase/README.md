# 🗃 Setup Supabase pour WTF

Ce dossier contient les migrations SQL et la doc de setup du backend
Supabase (auth + DB) qui remplace le mock localStorage de la Phase 1.

---

## 🚀 Setup initial (à faire UNE FOIS, ~15 min)

### 1. Créer le projet Supabase

1. Va sur [supabase.com](https://supabase.com) et crée un compte (gratuit, pas de carte requise)
2. **New project** :
   - Name : `wtf-pronostics`
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

### 4. Configurer Authentication

Dans **Authentication → Providers** :
- ✅ **Email** : activer (déjà ON par défaut)
- ✅ **Email Confirmation** : OFF pour démarrer (sinon il faut configurer SMTP)
  - Plus tard : activer + utiliser Resend ou SMTP custom
- ⬜ **Google** : optionnel, à activer plus tard si tu veux OAuth

Dans **Authentication → URL Configuration** :
- **Site URL** : `https://cronobots.github.io/PRONOSTICS/`
- **Redirect URLs** : ajouter
  - `https://cronobots.github.io/PRONOSTICS/**`
  - `http://localhost:3000/**` (pour dev local)

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
personal_bets
    - pick_date
    - stake
    - outcome
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

## 🆘 Troubleshooting

### "Email signups disabled" à la signup
→ Authentication → Providers → Email : vérifier que c'est activé

### Le user est créé mais profile vide
→ Vérifier que le trigger `on_auth_user_created` existe (SQL Editor → run le 0001
   migration encore une fois, le `create or replace` est idempotent)

### RLS error "new row violates row-level security policy"
→ Normal pour la table `subscriptions` (volontaire — seul le webhook peut écrire)
→ Pour `profiles`/`personal_bets`, vérifier que l'utilisateur est bien authentifié
   (`auth.uid()` doit retourner son uuid, pas null)
