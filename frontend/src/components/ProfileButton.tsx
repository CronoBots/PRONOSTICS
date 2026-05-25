/**
 * ProfileButton — bouton circulaire en haut à gauche du header,
 * affichant l'avatar de l'utilisateur connecté (ou un placeholder si
 * non connecté). Click → /compte (compte + préférences).
 *
 * Pattern UX standard (Twitter/X, Instagram, Snapchat) : profil à
 * gauche, actions/menu à droite.
 *
 * Badge Premium discret si abonnement actif (point doré coin haut-droit).
 */

import Link from "next/link";

import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

interface Props {
  /** Taille en px du bouton (carré). Défaut 36. */
  size?: number;
}

export function ProfileButton({ size = 36 }: Props) {
  const { user } = useAuth();
  const { t } = useI18n();

  // Pas loggué → bouton "Se connecter" minimal
  if (!user) {
    return (
      <Link
        href="/login"
        aria-label={t("auth.login")}
        className="flex items-center justify-center rounded-full bg-bg-card border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition"
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13 13 0 0112 15c2.5 0 4.847.7 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </Link>
    );
  }

  return (
    <Link href="/compte" aria-label={t("nav.account")} className="relative inline-flex">
      <Avatar initial={user.pseudo.slice(0, 1)} size={size} />
      {user.isPremium && (
        <span
          aria-hidden
          className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-accent-gold ring-2 ring-bg-base"
          title="Premium"
        />
      )}
    </Link>
  );
}
