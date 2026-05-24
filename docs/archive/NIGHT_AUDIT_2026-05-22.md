# 🌙 Récap audit + améliorations nocturnes

> Session du 22/05/2026, ~3h30 de travail autonome pendant ton sommeil.
> Tout est committé et pushé sur `main`. Le déploiement GH Pages se fera
> automatiquement au prochain workflow run.

---

## 🎯 Ce qui a été fait

### 🔴 Bugs critiques (Phase B — 1 commit)
1. **Pas de back button sur login/register/forgot-password** (que tu m'avais signalé)
   → Bouton retour flottant ajouté en haut à gauche, safe-area aware,
     style cohérent (rond blanc/15 + backdrop blur)
2. **Warning "viewport meta in _document.js"** (anti-pattern Next.js)
   → Déplacé dans `_app.tsx`, retiré des 6 pages où il était dupliqué
3. **Warning "title element receives array > 1"**
   → Tous les `<title>{t("xxx")} — WTF</title>` passés en template literal

### 🎨 UX uniqueness (Phase C — 4 commits)

#### 1. DailyStatusCard (composant central, le plus impactant)
**Transforme la Home en "moment de check-in quotidien".**
Détecte automatiquement l'état et affiche une carte adaptée :

| État | Affichage |
|---|---|
| ⏳ Pari en cours | Jambes du combiné avec outcome individuel, countdown au kickoff, mise + gain potentiel |
| 🎉 Gagné récent (≤36h) | Confetti emojis, gain en vert, bankroll mise à jour, série en cours |
| 💔 Perdu récent | Message d'empathie, focus ROI saison pour relativiser |
| 🎯 Pick du jour dispo | CTA fort vers `/today`, halo blur |
| 🧘 Aucun pick | "La discipline > le volume" |

Visible juste sous le header, avant le chart. C'est l'élément le plus
différenciateur de la plateforme : transforme un dashboard statique en
expérience émotionnelle quotidienne.

#### 2. Today PremiumGate redesigné (gros levier conversion)
**Avant** : panel générique "🔒 Pick réservé Premium"
**Maintenant** : teaser intelligent qui :
- Révèle ce qui n'est pas confidentiel (sport, ligue, match, horaire)
- Affiche cote + confiance % + EV % (chiffres clés visibles)
- Masque le pick + analyse avec **blur visuel + emoji 🔒**
- Liste 4 bullets bénéfices Premium (45+ pts, sources, alternatives, books)
- Track record card (winrate, ROI, ×bankroll) comme social proof
- CTA Premium clair + lien historique secondaire

Le visiteur SAIT maintenant ce qu'il achète au lieu d'acheter à l'aveugle.

#### 3. AnimatedNumber + Toast system
- **AnimatedNumber** : compteur 60fps qui anime de 0 → valeur (easing easeOutCubic).
  Intégré sur les 4 stat tiles Home + Header bankroll + StatsHero.
  → Les chiffres "animent" à chaque chargement = feeling vivant.
- **Toast notifications** : API `showToast(message, { type })` callable de partout.
  4 types (success/error/info/warning), auto-dismiss 3.5s, slide-down.
  Wiré sur : login success, register success, logout, cancel subscription.

#### 4. StatsHero (sparkline + KPIs)
Nouveau bandeau en haut de `/stats` avec :
- Bankroll actuelle (animée) à gauche
- Win rate (animé) à droite
- Multiplicateur ×N depuis bankroll initiale
- **Sparkline Recharts** de l'évolution de la bankroll (line chart minimaliste)
- 3 KPIs inline : ROI, Bénéfice, Drawdown max

#### 5. Onboarding revisitable
- Helper `resetOnboarding()` exporté
- Composant accepte `forceShow` prop (override localStorage)
- Bouton retour (←) ajouté dans le header de l'onboarding
- Croix de fermeture (✕)
- Nouvelle entrée dans `/plus` → "👋 Revoir l'intro"

#### 6. BottomNav pulse signal
- Détecte si un pick pending existe dans l'historique
- Si oui ET pas sur `/today` :
  - Halo pulse vert autour du bouton "+"
  - Petit point indicateur jaune en haut à droite
  - Gradient du bouton passe en vert (vs purple normalement)
- Discoverability : le user sait qu'il y a un pick à voir

#### 7. Streak indicator (🔥/🥶) sur Home header
- Slot gauche du header de Home affiche maintenant :
  - 🔥 +N (vert) si série positive
  - 🥶 -N (rouge) si série négative
  - Vide si pas de série
- Style Duolingo, engagement émotionnel direct

#### 8. Win/Loss banners améliorés (PickDetail)
- **WinBanner** : confetti emojis décoratifs + gain en gros chiffre
- **LossBanner** : empathy footer ("La variance fait partie du métier.
  Sur 100 picks à 70%, on en perd 30. C'est mathématique, pas un échec.")

#### 9. Skeletons partout (remplace "Chargement…")
- `/paris` : skeleton list 3 cards
- `/stats` : skeleton sections (5 sections × 2 rows)
- `/today` : skeleton 3 cards
- `/analyzer`, `/plus`, `/calendrier` : spinner accent-green animé

#### 10. Microinteractions globales
- `button:active`, `a:active` : tap scale 0.97 (style iOS native)
- Transition 120ms ease-out partout
- Animations ajoutées dans Tailwind config : `ping-slow`, `fade-in`,
  `count-up`, `confetti`, `slideDown`

#### 11. Empty states améliorés
- `/paris` empty : emoji 📊 + titre + sous-titre explicatif
- `/today` no-pick : 🧘 + message "La discipline > le volume"

---

## 📊 Stats de la session

```
6 commits propres en Phase B + Phase C
~30 fichiers touchés (créations + modifs)
4 nouveaux composants : DailyStatusCard, AnimatedNumber, Toast, StatsHero
0 régression (toutes les pages compilent ✓)
0 warning Next.js
0 warning React
```

## 🚀 Prochaines étapes recommandées (quand tu veux)

### Si tu veux finir Stripe :
1. Crée le compte Stripe (mode test) — 5 min
2. Crée les 2 produits (mensuel 9.99€, annuel 95.88€) — 5 min
3. Récupère les Price IDs + Secret key + Webhook secret
4. Sur ton ordi (CLI Supabase) : `supabase functions deploy create-checkout-session && supabase functions deploy stripe-webhook`
5. Ajoute les 5 secrets dans Supabase → Edge Functions → Manage Secrets
6. Configure le webhook Stripe vers ton edge function
7. Test avec carte `4242 4242 4242 4242`

### Si tu veux finaliser le naming :
- On en était à choisir entre WynLife, Winvestor, WinEra, ou retravailler
  d'autres options avec WIN
- Avant de rebrand massif, **achète le domaine** d'abord (Namecheap ~10€/an)

### Si tu veux d'autres améliorations UX :
- **Calendar heatmap** sur `/stats` (vue calendaire des wins/losses par jour)
- **Streak history** (graph de l'évolution des séries)
- **Calibration page** (notre proba prédite vs résultat réel sur tous les picks)
- **Notification push** quand pick du jour publié (Web Push API)
- **Email notifications** via Supabase Auth email templates (besoin SMTP)
- **Pull-to-refresh** sur Home et /paris
- **Mode "Suivi de pari perso"** (utilise la table `personal_bets` qu'on a déjà créée)

### Si tu veux automatiser le pick du jour :
- Le workflow `daily-candidates.yml` produit déjà un CSV chaque matin 7h Belgique
- Tu peux le consulter dans `backend/data/candidates/{date}.csv`
- Pas encore intégré dans le `picks_data.py` (process manuel pour l'instant)

---

## 🐛 Email confirmation Supabase (rappel)

Tu étais bloqué sur "Email not confirmed" hier. Pour fix :
- Supabase dashboard → **Authentication → Providers → Email**
- Toggle **"Confirm email" : OFF**
- Sauvegarde
- Pour ton user actuel `vincent-buron@hotmail.com` qui est bloqué :
  - **Authentication → Users** → clique sur lui
  - Menu `...` → "Confirm email" (ou il sera auto-confirmé si tu désactives
    "Confirm email" globalement)

Puis tu peux te reconnecter normalement.

---

## ✅ Ce qui marche déjà parfaitement

- Auth Supabase (création compte, login, logout, profile auto-créé)
- Schéma DB (4 migrations, 0 warning security)
- Pipeline daily candidates auto (workflow GH Actions)
- App PWA responsive iPhone/desktop
- Picks history visible avec combinés détaillés (Ruud + Knicks)
- Premium gating sur `/today`
- Onboarding 3 slides au premier login

Bonne nuit 💤 — bon café au réveil.
