import { HistoryStats } from "@/lib/types";

interface Props {
  stats: HistoryStats;
}

interface Tile {
  label: string;
  value: string;
  hint?: string;
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
  const tiles: Tile[] = [
    {
      label: "Paris",
      value: `${stats.total_picks}`,
      hint: `${stats.won}V · ${stats.lost}D · ${stats.pending} en cours`,
      tone: "blue",
    },
    {
      label: "Bénéfice",
      value: `${fmtSigned(stats.profit)} €`,
      hint: `Avg cote ${stats.average_odds.toFixed(2)}`,
      tone: tone(stats.profit),
    },
    {
      label: "ROI",
      value: `${fmtSigned(stats.roi_percent, "%")}`,
      hint: `Win rate ${stats.win_rate.toFixed(1)}%`,
      tone: tone(stats.roi_percent),
    },
    {
      label: "Progression",
      value: `${fmtSigned(stats.progression_percent, "%")}`,
      hint: `Bankroll ${stats.current_bankroll.toFixed(2)} €`,
      tone: tone(stats.progression_percent),
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      {tiles.map((t) => (
        <div
          key={t.label}
          className="bg-bg-card border border-white/5 rounded-2xl p-4 md:p-5 shadow-card"
        >
          <div className="text-xs uppercase tracking-wider text-white/40">{t.label}</div>
          <div className={`text-2xl md:text-3xl font-semibold mt-2 ${toneClass[t.tone]}`}>
            {t.value}
          </div>
          {t.hint && <div className="text-xs text-white/40 mt-1">{t.hint}</div>}
        </div>
      ))}
    </div>
  );
}
