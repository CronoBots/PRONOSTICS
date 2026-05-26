/**
 * CommunityBadge — affiche un compteur d'utilisateurs simulé pour donner
 * un signal social aux nouveaux utilisateurs.
 *
 * ⚠️ DONNÉES SIMULÉES — pré-lancement uniquement. À remplacer par un vrai
 * compteur live (Supabase RPC ou edge function) une fois l'app lancée.
 *
 * Format affiché :
 *   847 utilisateurs · 508 premium (60%)
 *
 * Variation légère par jour (cycle hebdo) pour donner l'impression que
 * la communauté grandit organiquement, sans paraître statique.
 */

import { useEffect, useState } from "react";

import { useI18n } from "@/lib/i18n";

// Configuration : valeurs cibles (à ajuster avant chaque relance / launch)
const BASE_USERS = 847;
const PREMIUM_RATIO = 0.6; // 60% premium par décision user

function getSimulatedCount(): number {
  // Variation légère ±15 selon le jour de l'année (cycle déterministe,
  // pas de random pour éviter les sauts entre refresh).
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000,
  );
  // Sinusoïde lente : ±15 sur ~7 jours
  const variation = Math.round(Math.sin((dayOfYear * 2 * Math.PI) / 7) * 15);
  // Légère tendance haussière pré-launch : +1 par semaine ISO
  const week = Math.floor(dayOfYear / 7);
  return BASE_USERS + variation + week;
}

interface Props {
  /** Affichage compact (juste nombre + premium %) vs étendu (avec labels). */
  variant?: "compact" | "extended";
  className?: string;
}

export function CommunityBadge({ variant = "compact", className = "" }: Props) {
  const { t } = useI18n();
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    // Calculé côté client uniquement (évite hydration mismatch SSR)
    setTotal(getSimulatedCount());
  }, []);

  if (total === null) return null;

  const premium = Math.round(total * PREMIUM_RATIO);

  if (variant === "extended") {
    return (
      <div
        className={`flex items-center justify-center gap-3 text-[11px] text-white/55 ${className}`}
      >
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
          <span className="tabular-nums font-semibold text-white">{total.toLocaleString("fr-FR")}</span>
          <span>{t("community.users")}</span>
        </span>
        <span className="text-white/25">·</span>
        <span className="flex items-center gap-1">
          <span className="tabular-nums font-semibold text-accent-gold">
            {premium.toLocaleString("fr-FR")}
          </span>
          <span>{t("community.premium")}</span>
          <span className="text-white/40">({Math.round(PREMIUM_RATIO * 100)}%)</span>
        </span>
      </div>
    );
  }

  // Compact : pill discret
  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-card border border-white/[0.08] text-[11px] ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
      <span className="text-white tabular-nums font-semibold">
        {total.toLocaleString("fr-FR")}
      </span>
      <span className="text-white/55">{t("community.users")}</span>
      <span className="text-white/25">·</span>
      <span className="text-accent-gold tabular-nums font-semibold">
        {premium.toLocaleString("fr-FR")}
      </span>
      <span className="text-white/55">{t("community.premium")}</span>
    </div>
  );
}
