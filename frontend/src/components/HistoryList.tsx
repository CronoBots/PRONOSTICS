import { useMemo, useState } from "react";

import { HistoryPick, SPORT_EMOJIS, SPORT_LABELS } from "@/lib/types";

interface Props {
  picks: HistoryPick[];
}

const MONTH_FORMAT = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });

function groupByMonth(picks: HistoryPick[]): Map<string, HistoryPick[]> {
  const out = new Map<string, HistoryPick[]>();
  for (const p of picks) {
    const month = MONTH_FORMAT.format(new Date(p.date));
    const key = month.charAt(0).toUpperCase() + month.slice(1);
    if (!out.has(key)) out.set(key, []);
    out.get(key)!.push(p);
  }
  return out;
}

function monthProfit(picks: HistoryPick[]): number {
  return picks.reduce(
    (acc, p) => acc + (p.outcome === "win" || p.outcome === "loss" ? p.profit : 0),
    0,
  );
}

function outcomeBadge(outcome: HistoryPick["outcome"]) {
  if (outcome === "win") {
    return (
      <span className="inline-flex items-center justify-center text-[10px] font-bold w-6 h-6 rounded-full bg-accent-green/20 text-accent-green">
        ✓
      </span>
    );
  }
  if (outcome === "loss") {
    return (
      <span className="inline-flex items-center justify-center text-[10px] font-bold w-6 h-6 rounded-full bg-accent-red/20 text-accent-red">
        ✕
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center text-[10px] w-6 h-6 rounded-full bg-white/10 text-white/50">
      …
    </span>
  );
}

function fmtSigned(n: number) {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)} €`;
}

function ProfitBadge({ profit, outcome }: { profit: number; outcome: HistoryPick["outcome"] }) {
  if (outcome === "pending") return <span className="text-white/40 text-sm">—</span>;
  const cls =
    profit > 0 ? "text-accent-green" : profit < 0 ? "text-accent-red" : "text-white/40";
  return <span className={`text-sm font-medium ${cls}`}>{fmtSigned(profit)}</span>;
}

export function HistoryList({ picks }: Props) {
  const grouped = useMemo(
    () => groupByMonth([...picks].sort((a, b) => b.date.localeCompare(a.date))),
    [picks],
  );
  const months = Array.from(grouped.keys());
  const [openMonth, setOpenMonth] = useState<string | null>(months[0] ?? null);

  return (
    <div className="space-y-3">
      {months.map((m) => {
        const monthPicks = grouped.get(m)!;
        const profit = monthProfit(monthPicks);
        const open = openMonth === m;
        return (
          <div key={m} className="bg-bg-card border border-white/5 rounded-2xl overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-4 md:px-5 py-3 text-left hover:bg-white/[0.02] transition"
              onClick={() => setOpenMonth(open ? null : m)}
            >
              <div className="flex items-center gap-3">
                <span className="text-white/40 text-xs">{open ? "▾" : "▸"}</span>
                <span className="font-medium">{m}</span>
                <span className="text-xs text-white/40">
                  {monthPicks.length} paris
                </span>
              </div>
              <span
                className={`text-sm font-semibold ${
                  profit > 0
                    ? "text-accent-green"
                    : profit < 0
                      ? "text-accent-red"
                      : "text-white/40"
                }`}
              >
                {fmtSigned(profit)}
              </span>
            </button>

            {open && (
              <div className="border-t border-white/5">
                {monthPicks.map((p) => (
                  <div
                    key={p.date}
                    className="flex items-center gap-3 px-4 md:px-5 py-3 border-b border-white/5 last:border-b-0 hover:bg-white/[0.02]"
                  >
                    {outcomeBadge(p.outcome)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-xs text-white/40">
                        <span>{SPORT_EMOJIS[p.match.sport] || ""}</span>
                        <span>{SPORT_LABELS[p.match.sport] || p.match.sport}</span>
                        <span className="text-white/20">·</span>
                        <span className="truncate">{p.match.league}</span>
                        <span className="text-white/20">·</span>
                        <span>{new Date(p.date).toLocaleDateString("fr-FR")}</span>
                      </div>
                      <div className="text-sm truncate">
                        {p.match.home_team}{" "}
                        <span className="text-white/30">vs</span> {p.match.away_team}
                      </div>
                      <div className="text-xs text-white/50 mt-0.5">
                        Pick : <span className="text-white/80">{p.pick}</span>
                        <span className="text-white/30"> · </span>
                        Cote {p.odds.toFixed(2)}
                        <span className="text-white/30"> · </span>
                        Mise {p.stake.toFixed(0)} €
                      </div>
                    </div>
                    <div className="text-right">
                      <ProfitBadge profit={p.profit} outcome={p.outcome} />
                      <div className="text-[10px] text-white/30 mt-0.5">
                        Bankroll {p.bankroll_after.toFixed(0)} €
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
