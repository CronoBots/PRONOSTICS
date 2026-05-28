import { useI18n } from "@/lib/i18n";
import { HistoryPick, HistoryStats } from "@/lib/types";

interface Narrative {
  icon: string;
  title: string;
  subtitle: string;
  tone: "green" | "yellow" | "blue" | "neutral";
}

/**
 * Choisit UNE histoire à raconter en haut de /stats — priorité décroissante :
 *   1. Série victorieuse en cours (≥ 2) → momentum
 *   2. Grosse cote remportée (≥ 3.0)   → "le pick safe sait surprendre"
 *   3. Gros gain unique (≥ 5€)         → effet wow chiffré
 *   4. Meilleure série historique (≥ 3) → record
 *   5. Au moins une victoire → premier jalon
 *   6. Volume seulement (≥ 5 picks) → discipline
 *   7. Fallback "warmup"
 */
function pickNarrative(
  stats: HistoryStats,
  picks: HistoryPick[],
  t: (key: string, vars?: Record<string, string | number>) => string,
): Narrative {
  if (stats.current_streak >= 2) {
    return {
      icon: "🔥",
      title: t("stats.narrative.streakHot", { n: stats.current_streak }),
      subtitle: t("stats.narrative.streakHotSub"),
      tone: "green",
    };
  }
  if (stats.max_odds_won >= 3.0) {
    return {
      icon: "💎",
      title: t("stats.narrative.bigOdds", {
        odds: stats.max_odds_won.toFixed(2),
      }),
      subtitle: t("stats.narrative.bigOddsSub"),
      tone: "yellow",
    };
  }
  if (stats.max_profit_single >= 5) {
    // Retrouve la cote du pari à plus gros gain pour enrichir le sub
    const big = picks
      .filter((p) => p.outcome === "win" && p.profit > 0)
      .sort((a, b) => b.profit - a.profit)[0];
    return {
      icon: "💰",
      title: t("stats.narrative.bigProfit", {
        amount: stats.max_profit_single.toFixed(2),
      }),
      subtitle: t("stats.narrative.bigProfitSub", {
        odds: big ? big.odds.toFixed(2) : "—",
      }),
      tone: "green",
    };
  }
  if (stats.best_streak >= 3) {
    return {
      icon: "🏆",
      title: t("stats.narrative.bestStreak", { n: stats.best_streak }),
      subtitle: t("stats.narrative.bestStreakSub"),
      tone: "yellow",
    };
  }
  if (stats.won >= 1) {
    return {
      icon: "✅",
      title: t("stats.narrative.firstWin"),
      subtitle: t("stats.narrative.firstWinSub"),
      tone: "green",
    };
  }
  if (stats.total_picks >= 5) {
    return {
      icon: "📊",
      title: t("stats.narrative.cleanStart", { n: stats.total_picks }),
      subtitle: t("stats.narrative.cleanStartSub"),
      tone: "blue",
    };
  }
  return {
    icon: "⏳",
    title: t("stats.narrative.warmup"),
    subtitle: t("stats.narrative.warmupSub"),
    tone: "neutral",
  };
}

const TONE_RING: Record<Narrative["tone"], string> = {
  green: "from-accent-green/15 to-accent-green/0 border-accent-green/30",
  yellow: "from-yellow-400/15 to-yellow-400/0 border-yellow-400/30",
  blue: "from-accent-blue/15 to-accent-blue/0 border-accent-blue/30",
  neutral: "from-white/[0.04] to-white/0 border-white/10",
};

const TONE_TEXT: Record<Narrative["tone"], string> = {
  green: "text-accent-green",
  yellow: "text-yellow-300",
  blue: "text-accent-blue",
  neutral: "text-white",
};

export function StatsNarrative({
  stats,
  picks,
}: {
  stats: HistoryStats;
  picks: HistoryPick[];
}) {
  const { t } = useI18n();
  const story = pickNarrative(stats, picks, t);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${TONE_RING[story.tone]} px-4 py-3 mb-4 flex items-center gap-3`}
    >
      <div className="text-2xl shrink-0">{story.icon}</div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-bold leading-tight ${TONE_TEXT[story.tone]}`}>
          {story.title}
        </div>
        <div className="text-[11px] text-white/55 mt-0.5 leading-snug">
          {story.subtitle}
        </div>
      </div>
    </div>
  );
}
