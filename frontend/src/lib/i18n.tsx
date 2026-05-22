/**
 * i18n minimaliste — Phase 1 (FR + EN).
 *
 * Pas de lib externe : juste un dictionnaire + Context.
 * Stocké en localStorage pour persister entre sessions.
 */

import { createContext, ReactNode, useContext, useEffect, useState } from "react";

export type Lang = "fr" | "en";

export const LANG_LABELS: Record<Lang, { name: string; flag: string }> = {
  fr: { name: "Français", flag: "🇫🇷" },
  en: { name: "English", flag: "🇬🇧" },
};

const STORAGE_KEY = "pronostics.lang";

type Dict = Record<string, string>;

const fr: Dict = {
  // Navigation
  "nav.home": "Home",
  "nav.paris": "Paris",
  "nav.stats": "Statistiques",
  "nav.account": "Compte",
  // Header
  "header.bankroll": "Bankroll",
  "header.tagline": "1 value bet par jour · cote ≥ 2.00",
  // Home
  "home.todayPick": "Pick safe du jour",
  "home.bankrollEvolution": "Évolution de la bankroll",
  "home.startingFrom": "Départ {amount} €",
  "home.analyzer": "Analyzer",
  "home.calendar": "Calendrier",
  // TodayPick
  "pick.toBet": "⚡ Pari à placer",
  "pick.winner": "VAINQUEUR",
  "pick.cote": "Cote",
  "pick.edge": "Edge (EV)",
  "pick.stake": "Mise",
  "pick.ifWon": "Si gagné",
  "pick.ifLost": "Si perdu",
  "pick.return": "retour",
  "pick.fullAnalysis": "Analyse complète ({n} points)",
  "pick.sources": "Sources ({n})",
  "pick.noValueBet": "Aucun value bet aujourd'hui",
  "pick.modelEstimates": "Notre modèle estime",
  "pick.bookEstimates": "alors que le bookmaker estime",
  "pick.valueBet": "value bet",
  // Premium gating
  "premium.locked": "Pick masqué — Premium requis",
  "premium.lockedHint": "L'historique reste accessible. Pour voir le pick du jour et l'analyse complète, passe en Premium.",
  "premium.unlock": "Débloquer Premium",
  "premium.from": "À partir de",
  "premium.month": "/mois",
  "premium.year": "/an",
  // Auth
  "auth.login": "Connexion",
  "auth.register": "Inscription",
  "auth.logout": "Se déconnecter",
  "auth.email": "Email",
  "auth.password": "Mot de passe",
  "auth.passwordConfirm": "Confirmation mot de passe",
  "auth.pseudo": "Pseudo",
  "auth.forgotPassword": "Mot de passe oublié ?",
  "auth.noAccount": "Je n'ai pas de compte",
  "auth.hasAccount": "J'ai déjà un compte",
  "auth.acceptCgu": "J'accepte les Conditions Générales d'Utilisation",
  // Account
  "account.title": "Mon compte",
  "account.free": "Gratuit",
  "account.premium": "Premium",
  "account.goPremium": "Passer en Premium",
  "account.subscription": "Abonnement",
  "account.language": "Langue",
  "account.theme": "Thème",
  "account.themeLight": "Clair",
  "account.themeDark": "Sombre",
  "account.themeSystem": "Système",
  "account.help": "Centre d'aide",
  "account.delete": "Supprimer mon compte",
  "account.section.profile": "Profil",
  "account.section.preferences": "Préférences",
  "account.section.notifications": "Notifications",
  "account.section.support": "Support",
  "account.avatar": "Avatar",
  "account.changePassword": "Mot de passe",
  "account.oddsFormat": "Format des cotes",
  "account.oddsDecimal": "Décimale (1.50)",
  "account.oddsFractional": "Fractionnaire (1/2)",
  "account.oddsAmerican": "Américaine (+150)",
  "account.currency": "Devise",
  "account.betDisplay": "Affichage des paris",
  "account.betDisplayCompact": "Compact",
  "account.betDisplayDetailed": "Détaillé",
  "account.emailNotif": "Notifications email",
  "account.news": "Nouveautés",
  "account.contact": "Nous contacter",
  "account.tutorials": "Tutoriels vidéo",
  "account.legal": "Mentions légales",
  "account.about": "À propos",
  "account.deleteConfirm": "Supprimer définitivement ton compte ? Cette action est irréversible et toutes tes données seront effacées.",
  "account.deleteSoon": "Suppression de compte bientôt disponible. Contacte-nous en attendant.",
  // Pricing
  "pricing.title": "Passer en Premium",
  "pricing.subtitle": "Débloque le pick safe du jour et toutes les analyses",
  "pricing.monthly": "Mensuel",
  "pricing.yearly": "Annuel",
  "pricing.save": "Économise 20%",
  "pricing.cta": "Choisir ce plan",
  "pricing.featurePick": "Accès au pick safe du jour (équipes + analyse)",
  "pricing.featureAnalysis": "45-60 points d'analyse expliqués",
  "pricing.featureSources": "Sources web vérifiées (3+ par pick)",
  "pricing.featureNotif": "Notification dès le pick du jour publié",
  "pricing.featureHistory": "Historique complet avec stats avancées",
  "pricing.featureCancel": "Sans engagement, résiliable à tout moment",
  // Common
  "common.loading": "Chargement…",
  "common.back": "Retour",
};

const en: Dict = {
  // Navigation
  "nav.home": "Home",
  "nav.paris": "Bets",
  "nav.stats": "Stats",
  "nav.account": "Account",
  // Header
  "header.bankroll": "Bankroll",
  "header.tagline": "1 value bet a day · odds ≥ 2.00",
  // Home
  "home.todayPick": "Today's safe pick",
  "home.bankrollEvolution": "Bankroll evolution",
  "home.startingFrom": "Start {amount} €",
  "home.analyzer": "Analyzer",
  "home.calendar": "Calendar",
  // TodayPick
  "pick.toBet": "⚡ Place this bet",
  "pick.winner": "TO WIN",
  "pick.cote": "Odds",
  "pick.edge": "Edge (EV)",
  "pick.stake": "Stake",
  "pick.ifWon": "If won",
  "pick.ifLost": "If lost",
  "pick.return": "return",
  "pick.fullAnalysis": "Full analysis ({n} points)",
  "pick.sources": "Sources ({n})",
  "pick.noValueBet": "No value bet today",
  "pick.modelEstimates": "Our model estimates",
  "pick.bookEstimates": "while the bookmaker estimates",
  "pick.valueBet": "value bet",
  // Premium gating
  "premium.locked": "Pick hidden — Premium required",
  "premium.lockedHint": "History stays free. To see today's pick and the full analysis, upgrade to Premium.",
  "premium.unlock": "Unlock Premium",
  "premium.from": "From",
  "premium.month": "/month",
  "premium.year": "/year",
  // Auth
  "auth.login": "Sign in",
  "auth.register": "Sign up",
  "auth.logout": "Sign out",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.passwordConfirm": "Confirm password",
  "auth.pseudo": "Username",
  "auth.forgotPassword": "Forgot password?",
  "auth.noAccount": "I don't have an account",
  "auth.hasAccount": "I already have an account",
  "auth.acceptCgu": "I accept the Terms of Service",
  // Account
  "account.title": "My account",
  "account.free": "Free",
  "account.premium": "Premium",
  "account.goPremium": "Go Premium",
  "account.subscription": "Subscription",
  "account.language": "Language",
  "account.theme": "Theme",
  "account.themeLight": "Light",
  "account.themeDark": "Dark",
  "account.themeSystem": "System",
  "account.help": "Help center",
  "account.delete": "Delete my account",
  "account.section.profile": "Profile",
  "account.section.preferences": "Preferences",
  "account.section.notifications": "Notifications",
  "account.section.support": "Support",
  "account.avatar": "Avatar",
  "account.changePassword": "Password",
  "account.oddsFormat": "Odds format",
  "account.oddsDecimal": "Decimal (1.50)",
  "account.oddsFractional": "Fractional (1/2)",
  "account.oddsAmerican": "American (+150)",
  "account.currency": "Currency",
  "account.betDisplay": "Bet display",
  "account.betDisplayCompact": "Compact",
  "account.betDisplayDetailed": "Detailed",
  "account.emailNotif": "Email notifications",
  "account.news": "What's new",
  "account.contact": "Contact us",
  "account.tutorials": "Video tutorials",
  "account.legal": "Legal",
  "account.about": "About",
  "account.deleteConfirm": "Permanently delete your account? This action is irreversible and all your data will be wiped.",
  "account.deleteSoon": "Account deletion coming soon. Contact us in the meantime.",
  // Pricing
  "pricing.title": "Upgrade to Premium",
  "pricing.subtitle": "Unlock today's safe pick and all analyses",
  "pricing.monthly": "Monthly",
  "pricing.yearly": "Yearly",
  "pricing.save": "Save 20%",
  "pricing.cta": "Choose this plan",
  "pricing.featurePick": "Today's safe pick (teams + analysis)",
  "pricing.featureAnalysis": "45-60 analysis points explained",
  "pricing.featureSources": "Verified web sources (3+ per pick)",
  "pricing.featureNotif": "Notification when today's pick is published",
  "pricing.featureHistory": "Full history with advanced stats",
  "pricing.featureCancel": "No commitment, cancel anytime",
  // Common
  "common.loading": "Loading…",
  "common.back": "Back",
};

const DICTS: Record<Lang, Dict> = { fr, en };

interface I18nContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("fr");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
      if (stored && (stored === "fr" || stored === "en")) {
        setLangState(stored);
        return;
      }
      // Détection navigateur
      const nav =
        typeof navigator !== "undefined"
          ? navigator.language.toLowerCase().slice(0, 2)
          : "fr";
      setLangState(nav === "fr" ? "fr" : "en");
    } catch {
      /* ignore */
    }
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }

  function t(key: string, vars?: Record<string, string | number>) {
    const dict = DICTS[lang];
    let s = dict[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        s = s.replace(`{${k}}`, String(v));
      }
    }
    return s;
  }

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be inside I18nProvider");
  return ctx;
}
