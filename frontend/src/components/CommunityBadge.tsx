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
 * Croissance : +0.2%/jour (composé) à partir du baseline 2026-05-26.
 * Variation déterministe ±5 sur cycle hebdo pour donner impression
 * de fluctuation organique sans saut entre refresh.
 */

import { useEffect, useState } from "react";

import { useI18n } from "@/lib/i18n";

// Configuration : valeurs cibles (à ajuster avant chaque relance / launch)
const BASELINE_DATE = new Date("2026-05-26T00:00:00Z").getTime();
const BASELINE_USERS = 847;
const PREMIUM_RATIO = 0.6; // 60% premium par décision user
const DAILY_GROWTH = 0.002; // +0.2%/jour (composé)

function getSimulatedCount(): number {
  const now = Date.now();
  const daysSince = Math.max(0, Math.floor((now - BASELINE_DATE) / 86_400_000));

  // Croissance composée : base × (1.002)^daysSince
  const grown = BASELINE_USERS * Math.pow(1 + DAILY_GROWTH, daysSince);

  // Variation déterministe ±5 (sinusoïde basée sur dayOfYear pour
  // donner impression "live" sans random instable entre refresh).
  const dayOfYear = Math.floor(
    (now - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000,
  );
  const variation = Math.round(Math.sin((dayOfYear * 2 * Math.PI) / 7) * 5);

  return Math.round(grown + variation);
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
