# 🌐 Supabase Edge Functions — NΞXBΞT

Functions Deno qui gèrent l'intégration Stripe côté serveur. Le frontend
(static export GitHub Pages) ne peut pas exposer la `STRIPE_SECRET_KEY`,
donc tout ce qui touche à Stripe passe par ces edge functions.

## 📂 Functions disponibles

### `create-checkout-session`
- **Appelée par** : frontend quand user clique "Choisir mensuel/annuel"
- **Crée** : une Stripe Checkout Session pour l'abonnement
- **Retourne** : URL hosted Stripe vers laquelle rediriger
- **Auth** : JWT Supabase de l'utilisateur (Authorization: Bearer ...)

### `stripe-webhook`
- **Appelée par** : Stripe via webhook
- **Reçoit** : événements `checkout.session.completed`, `customer.subscription.*`,
  `invoice.payment_failed`
- **Synchronise** : table `subscriptions` (insert/update avec service_role)
- **Vérifie** : signature `Stripe-Signature` pour authentifier l'appel

---

## 🚀 Déploiement

### 1. Installer la CLI Supabase (1ère fois)

Sur ton Mac/PC local (pas nécessaire sur l'iPhone) :

```bash
brew install supabase/tap/supabase
# ou via npm
npm install -g supabase
```

### 2. Login + link au projet

```bash
supabase login
# Ouvre un browser pour t'authentifier

cd /chemin/vers/PRONOSTICS
supabase link --project-ref <ton-project-ref>
# project-ref est dans l'URL du dashboard : https://supabase.com/dashboard/project/<ref>
```

### 3. Configurer les secrets des edge functions

Dans le dashboard Supabase → **Edge Functions → Manage Secrets**, ajoute :

| Secret | Valeur | Où la trouver |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_xxx` ou `sk_live_xxx` | Stripe dashboard → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | `whsec_xxx` | Stripe dashboard → Developers → Webhooks → ton endpoint → Signing secret |
| `STRIPE_PRICE_MONTHLY` | `price_xxx` | Stripe dashboard → Products → Pricing |
| `STRIPE_PRICE_YEARLY` | `price_xxx` | Stripe dashboard → Products → Pricing |
| `PUBLIC_SITE_URL` | `https://cronobots.github.io/PRONOSTICS` | URL de ton site |

⚠️ `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` sont
**injectés automatiquement** par Supabase dans les edge functions, pas
besoin de les ajouter.

### 4. Deploy les functions

```bash
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook
```

### 5. Configurer le webhook Stripe

Dans Stripe dashboard :

1. **Developers → Webhooks → + Add endpoint**
2. **Endpoint URL** : `https://<ton-project-ref>.supabase.co/functions/v1/stripe-webhook`
3. **Events to send** (sélectionne uniquement) :
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. **Add endpoint** → Stripe te donne un **Signing secret** `whsec_xxx`
5. Copie ce secret dans Supabase → Edge Functions → Manage Secrets → `STRIPE_WEBHOOK_SECRET`

### 6. Créer les Products + Prices dans Stripe

Dans Stripe dashboard → **Products → + Add product** :

**Product 1** : NΞXBΞT Premium Mensuel
- Name : `NΞXBΞT Premium Mensuel`
- Pricing : `9,99 EUR / mois` (recurring monthly)
- Description : `Accès au pick safe du jour avec analyse complète (45+ points), sources web vérifiées, historique complet.`

**Product 2** : NΞXBΞT Premium Annuel
- Name : `NΞXBΞT Premium Annuel`
- Pricing : `95,88 EUR / an` (recurring yearly)
- Description : `Accès Premium annuel avec −20% vs mensuel. Économie de 23,88 €/an.`

Récupère le **Price ID** de chaque produit (`price_xxx`) et mets-les dans les
secrets Supabase (`STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`).

---

## 🧪 Test local

Pour tester en local avant deploy :

```bash
# Démarrer Supabase local (Docker requis)
supabase start

# Lancer une edge function en local avec hot-reload
supabase functions serve create-checkout-session --env-file ./supabase/.env.local

# Dans un autre terminal, tester avec curl
curl -X POST http://localhost:54321/functions/v1/create-checkout-session \
  -H "Authorization: Bearer <user_jwt_local>" \
  -H "Content-Type: application/json" \
  -d '{"plan": "monthly"}'
```

Pour tester le webhook en local :

```bash
# Stripe CLI forward webhooks vers localhost
stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook

# Dans un autre terminal, déclencher un event test
stripe trigger checkout.session.completed
```

---

## 🆘 Troubleshooting

### `Missing env var: STRIPE_SECRET_KEY`
→ Vérifier dans **Edge Functions → Manage Secrets** que les 5 secrets sont bien
ajoutés. Re-deploy la function pour rafraîchir les env vars.

### Webhook 400 "Invalid signature"
→ Le `STRIPE_WEBHOOK_SECRET` configuré dans Supabase ne correspond pas à celui
de l'endpoint Stripe. Re-copier depuis Stripe → Webhooks → Signing secret.

### "Customer not found"
→ Premier achat d'un user : la function crée automatiquement le customer Stripe.
   Vérifier que `user.email` est bien défini dans Supabase Auth.

### Subscription créée mais pas visible dans la DB
→ Vérifier les logs de la function `stripe-webhook` dans
   **Edge Functions → Logs**. Erreur RLS = le service_role n'est pas utilisé.
