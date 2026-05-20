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

function monthRecord(picks: HistoryPick[]): { w: number; l: number } {
  return picks.reduce(
    (acc, p) => {
      if (p.outcome === "win") acc.w++;
      else if (p.outcome === "loss") acc.l++;
      return acc;
    },
    { w: 0, l: 0 },
  );
}

function outcomeBadge(outcome: HistoryPick["outcome"]) {
  if (outcome === "win") {
    return (
      <span className="inline-flex items-center justify-center text-xs font-bold w-7 h-7 rounded-lg bg-accent-green/20 text-accent-green ring-1 ring-accent-green/30 shrink-0">
        V
      </span>
    );
  }
  if (outcome === "loss") {
    return (
      <span className="inline-flex items-center justify-center text-xs font-bold w-7 h-7 rounded-lg bg-accent-red/20 text-accent-red ring-1 ring-accent-red/30 shrink-0">
        D
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center text-xs font-medium w-7 h-7 rounded-lg bg-white/10 text-white/50 ring-1 ring-white/10 shrink-0">
      ⋯
    </span>
  );
}

function fmtSigned(n: number) {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)} €`;
}

function ProfitBadge({ profit, outcome }: { profit: number; outcome: HistoryPick["outcome"] }) {
  if (outcome === "pending")
    return <span className="text-white/40 text-sm font-medium">À venir</span>;
  const cls =
    profit > 0 ? "text-accent-green" : profit < 0 ? "text-accent-red" : "text-white/40";
  return <span className={`text-sm font-semibold tabular-nums ${cls}`}>{fmtSigned(profit)}</span>;
}

export function HistoryList({ picks }: Props) {
  const grouped = useMemo(
    () => groupByMonth([...picks].sort((a, b) => b.date.localeCompare(a.date))),
    [picks],
  );
  const months = Array.from(grouped.keys());
  // Auto-déplie tous les mois par défaut
  const [openMonths, setOpenMonths] = useState<Set<string>>(new Set(months));

  function toggle(m: string) {
    setOpenMonths((prev) => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m);
      else next.add(m);
      return next;
    });
  }

  return (
    <div className="space-y-3">
      {months.map((m) => {
        const monthPicks = grouped.get(m)!;
        const profit = monthProfit(monthPicks);
        const record = monthRecord(monthPicks);
        const open = openMonths.has(m);
        const profitClass =
          profit > 0
            ? "text-accent-green"
            : profit < 0
              ? "text-accent-red"
              : "text-white/40";

        return (
          <div
            key={m}
            className="bg-bg-card border border-white/[0.06] rounded-2xl overflow-hidden shadow-card"
          >
            <button
              className="w-full flex items-center justify-between px-4 md:px-5 py-3.5 text-left hover:bg-white/[0.02] transition"
              onClick={() => toggle(m)}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-white/40 text-xs">{open ? "▾" : "▸"}</span>
                <span className="font-semibold capitalize">{m}</span>
                <span className="text-xs text-white/40 hidden sm:inline">
                  {monthPicks.length} paris · {record.w}V {record.l}D
                </span>
              </div>
              <span className={`text-sm font-bold tabular-nums ${profitClass}`}>
                {fmtSigned(profit)}
              </span>
            </button>

            {open && (
              <div className="border-t border-white/5">
                {monthPicks.map((p) => (
                  <div
                    key={p.date}
                    className="flex items-center gap-3 px-4 md:px-5 py-3.5 border-b border-white/5 last:border-b-0 hover:bg-white/[0.02]"
                  >
                    {outcomeBadge(p.outcome)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-[11px] text-white/40 mb-0.5">
                        <span className="text-sm">{SPORT_EMOJIS[p.match.sport] || ""}</span>
                        <span className="font-medium">
                          {SPORT_LABELS[p.match.sport] || p.match.sport}
                        </span>
                        <span className="text-white/20">·</span>
                        <span className="truncate">{p.match.league}</span>
                        <span className="text-white/20">·</span>
                        <span>
                          {new Date(p.date).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </div>
                      <div className="text-sm truncate font-medium">
                        {p.match.home_team}{" "}
                        <span className="text-white/30 font-normal">vs</span>{" "}
                        {p.match.away_team}
                      </div>
                      <div className="text-[11px] text-white/50 mt-0.5">
                        Pick{" "}
                        <span className="text-white/80 font-medium">{p.pick}</span>
                        <span className="text-white/30"> · </span>
                        Cote {p.odds.toFixed(2)}
                        <span className="text-white/30"> · </span>
                        Mise {p.stake.toFixed(0)} €
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <ProfitBadge profit={p.profit} outcome={p.outcome} />
                      <div className="text-[10px] text-white/30 mt-0.5 tabular-nums">
                        {p.bankroll_after.toFixed(0)} €
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
