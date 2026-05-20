import { useEffect, useState } from "react";
import Head from "next/head";

import { Header } from "@/components/Header";
import { fetchHistory } from "@/lib/dataSource";
import { History, HistoryStats } from "@/lib/types";

function fmtSigned(n: number, suffix = "") {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}${suffix}`;
}

interface StatRow {
  label: string;
  value: string;
  tone?: "green" | "red" | "blue" | "neutral";
}

const toneClass: Record<NonNullable<StatRow["tone"]>, string> = {
  green: "text-accent-green",
  red: "text-accent-red",
  blue: "text-accent-blue",
  neutral: "text-white",
};

function signTone(n: number): StatRow["tone"] {
  if (n > 0) return "green";
  if (n < 0) return "red";
  return "neutral";
}

function StatTile({ label, value, tone = "neutral" }: StatRow) {
  return (
    <div className="bg-bg-card border border-white/[0.06] rounded-xl p-3.5 flex items-center justify-between gap-3">
      <span className="text-[11px] md:text-xs text-white/50">{label}</span>
      <span
        className={`text-sm md:text-base font-bold tabular-nums whitespace-nowrap ${toneClass[tone]}`}
      >
        {value}
      </span>
    </div>
  );
}

function StatsSection({ title, rows }: { title: string; rows: StatRow[] }) {
  return (
    <section className="mb-5">
      <h3 className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-white/40 font-semibold mb-2 px-1">
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-2 md:gap-3">
        {rows.map((r) => (
          <StatTile key={r.label} {...r} />
        ))}
      </div>
    </section>
  );
}

function buildSections(stats: HistoryStats): { title: string; rows: StatRow[] }[] {
  return [
    {
      title: "Performances",
      rows: [
        { label: "Paris", value: `${stats.total_picks}`, tone: "blue" },
        { label: "Bénéfice", value: `${fmtSigned(stats.profit)} €`, tone: signTone(stats.profit) },
        { label: "ROI", value: `${fmtSigned(stats.roi_percent, "%")}`, tone: signTone(stats.roi_percent) },
        {
          label: "Progression",
          value: `${fmtSigned(stats.progression_percent, "%")}`,
          tone: signTone(stats.progression_percent),
        },
        { label: "Réussite %", value: `${stats.win_rate.toFixed(2)}%`, tone: "green" },
        {
          label: "Drawdown max",
          value: `${stats.drawdown_max.toFixed(2)} €`,
          tone: stats.drawdown_max > 0 ? "red" : "neutral",
        },
      ],
    },
    {
      title: "Capital",
      rows: [
        { label: "Capital de départ", value: `${stats.starting_bankroll.toFixed(2)} €` },
        {
          label: "Capital actuel",
          value: `${stats.current_bankroll.toFixed(2)} €`,
          tone: signTone(stats.current_bankroll - stats.starting_bankroll),
        },
      ],
    },
    {
      title: "Bilan paris",
      rows: [
        { label: "Paris gagnants", value: `${stats.won}`, tone: "green" },
        { label: "Paris perdants", value: `${stats.lost}`, tone: stats.lost > 0 ? "red" : "neutral" },
        { label: "Paris en cours", value: `${stats.pending}`, tone: "blue" },
        { label: "Série victoires max", value: `${stats.best_streak}`, tone: "green" },
        {
          label: "Série défaites max",
          value: `${Math.abs(stats.worst_streak)}`,
          tone: stats.worst_streak < 0 ? "red" : "neutral",
        },
        {
          label: "Série en cours",
          value: stats.current_streak >= 0 ? `+${stats.current_streak}` : `${stats.current_streak}`,
          tone: signTone(stats.current_streak),
        },
      ],
    },
    {
      title: "Mises",
      rows: [
        { label: "Mises jouées", value: `${stats.total_stake_played.toFixed(2)} €` },
        { label: "Mises en cours", value: `${stats.pending_stake.toFixed(2)} €` },
        { label: "Mise moyenne", value: `${stats.avg_stake.toFixed(2)} €` },
        { label: "Mise max", value: `${stats.max_stake.toFixed(2)} €` },
      ],
    },
    {
      title: "Cotes & extrêmes",
      rows: [
        { label: "Cote moyenne", value: stats.average_odds.toFixed(3) },
        {
          label: "Plus grosse cote gagnée",
          value: stats.max_odds_won > 0 ? stats.max_odds_won.toFixed(2) : "—",
          tone: "green",
        },
        {
          label: "Plus gros bénéfice",
          value: `${fmtSigned(stats.max_profit_single)} €`,
          tone: "green",
        },
        {
          label: "Plus grosse perte",
          value: `${stats.max_loss_single.toFixed(2)} €`,
          tone: stats.max_loss_single < 0 ? "red" : "neutral",
        },
      ],
    },
  ];
}

export default function StatsPage() {
  const [history, setHistory] = useState<History | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchHistory().then((h) => {
      if (cancelled) return;
      setHistory(h);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = history?.stats;
  const sections = stats ? buildSections(stats) : [];

  return (
    <>
      <Head>
        <title>Statistiques — PRONOSTICS</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-10">
        <Header title="Statistiques" stats={stats} />

        {loading && <div className="text-white/50 text-sm py-12 text-center">Chargement…</div>}

        {!loading && stats && (
          <div>
            {sections.map((s) => (
              <StatsSection key={s.title} title={s.title} rows={s.rows} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
