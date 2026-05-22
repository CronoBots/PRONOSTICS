import { useI18n } from "@/lib/i18n";
import { HistoryStats } from "@/lib/types";

interface Props {
  stats: HistoryStats;
}

interface Tile {
  label: string;
  value: string;
  hint: string;
  tone: "neutral" | "green" | "red" | "blue";
}

function fmtSigned(n: number, suffix = "") {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}${suffix}`;
}

function tone(value: number): "green" | "red" | "neutral" {
  if (value > 0) return "green";
  if (value < 0) return "red";
  return "neutral";
}

const toneClass: Record<Tile["tone"], string> = {
  green: "text-accent-green",
  red: "text-accent-red",
  blue: "text-accent-blue",
  neutral: "text-white",
};

export function StatsGrid({ stats }: Props) {
  const { t } = useI18n();
  const tiles: Tile[] = [
    {
      label: t("statsGrid.bets"),
      value: `${stats.total_picks}`,
      hint: t("statsGrid.betsHint", {
        won: stats.won,
        lost: stats.lost,
        pending: stats.pending,
      }),
      tone: "blue",
    },
    {
      label: t("statsGrid.profit"),
      value: `${fmtSigned(stats.profit)} €`,
      hint: t("statsGrid.profitHint", { odds: stats.average_odds.toFixed(2) }),
      tone: tone(stats.profit),
    },
    {
      label: t("statsGrid.roi"),
      value: `${fmtSigned(stats.roi_percent, "%")}`,
      hint: t("statsGrid.roiHint", { winRate: stats.win_rate.toFixed(1) }),
      tone: tone(stats.roi_percent),
    },
    {
      label: t("statsGrid.progression"),
      value: `${fmtSigned(stats.progression_percent, "%")}`,
      hint: t("statsGrid.progressionHint", {
        bankroll: stats.current_bankroll.toFixed(0),
      }),
      tone: tone(stats.progression_percent),
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      {tiles.map((t) => (
        <div
          key={t.label}
          className="bg-bg-card border border-white/[0.06] rounded-2xl p-4 md:p-5 shadow-card relative overflow-hidden group hover:border-white/10 transition"
        >
          <div className="text-[10px] md:text-xs uppercase tracking-[0.15em] text-white/40 font-medium">
            {t.label}
          </div>
          <div
            className={`text-2xl md:text-4xl font-bold mt-2 md:mt-3 tabular-nums ${toneClass[t.tone]}`}
          >
            {t.value}
          </div>
          <div className="text-[11px] text-white/40 mt-1.5 md:mt-2">{t.hint}</div>
        </div>
      ))}
    </div>
  );
}
