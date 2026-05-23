import { useEffect, useState } from "react";
import Head from "next/head";

import { AnalyzerGeneral } from "@/components/AnalyzerGeneral";
import { AnalyzerPeriode } from "@/components/AnalyzerPeriode";
import { AnalyzerSport } from "@/components/AnalyzerSport";
import { Header } from "@/components/Header";
import { Skeleton } from "@/components/Skeleton";
import { StatsHero } from "@/components/StatsHero";
import { fetchHistory } from "@/lib/dataSource";
import { useI18n } from "@/lib/i18n";
import { History, HistoryStats } from "@/lib/types";

type TFn = (key: string, vars?: Record<string, string | number>) => string;
type Tab = "overview" | "general" | "periode" | "sport";

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

function buildSections(stats: HistoryStats, t: TFn): { title: string; rows: StatRow[] }[] {
  // Note v4: les KPI affichés dans <StatsHero> (bankroll, win rate, ROI, profit,
  // drawdown, won/lost/pending) sont volontairement absents de ces sections
  // pour éviter la redondance. Idem capital départ/actuel (dans le Hero).
  return [
    {
      title: t("statsPage.section.performances"),
      rows: [
        { label: t("statsPage.bets"), value: `${stats.total_picks}`, tone: "blue" },
        {
          label: t("statsPage.progression"),
          value: `${fmtSigned(stats.progression_percent, "%")}`,
          tone: signTone(stats.progression_percent),
        },
      ],
    },
    {
      title: t("statsPage.section.bilan"),
      rows: [
        { label: t("statsPage.bestStreak"), value: `${stats.best_streak}`, tone: "green" },
        {
          label: t("statsPage.worstStreak"),
          value: `${Math.abs(stats.worst_streak)}`,
          tone: stats.worst_streak < 0 ? "red" : "neutral",
        },
        {
          label: t("statsPage.currentStreak"),
          value: stats.current_streak >= 0 ? `+${stats.current_streak}` : `${stats.current_streak}`,
          tone: signTone(stats.current_streak),
        },
      ],
    },
    {
      title: t("statsPage.section.mises"),
      rows: [
        { label: t("statsPage.stakePlayed"), value: `${stats.total_stake_played.toFixed(2)} €` },
        { label: t("statsPage.stakePending"), value: `${stats.pending_stake.toFixed(2)} €` },
        { label: t("statsPage.stakeAvg"), value: `${stats.avg_stake.toFixed(2)} €` },
        { label: t("statsPage.stakeMax"), value: `${stats.max_stake.toFixed(2)} €` },
      ],
    },
    {
      title: t("statsPage.section.cotes"),
      rows: [
        { label: t("statsPage.oddsAvg"), value: stats.average_odds.toFixed(3) },
        {
          label: t("statsPage.oddsMaxWon"),
          value: stats.max_odds_won > 0 ? stats.max_odds_won.toFixed(2) : "—",
          tone: "green",
        },
        {
          label: t("statsPage.profitMaxSingle"),
          value: `${fmtSigned(stats.max_profit_single)} €`,
          tone: "green",
        },
        {
          label: t("statsPage.lossMaxSingle"),
          value: `${stats.max_loss_single.toFixed(2)} €`,
          tone: stats.max_loss_single < 0 ? "red" : "neutral",
        },
      ],
    },
  ];
}

export default function StatsPage() {
  const { t } = useI18n();
  const [history, setHistory] = useState<History | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");

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
  const picks = history?.picks ?? [];
  const sections = stats ? buildSections(stats, t) : [];

  const TABS: { id: Tab; label: string }[] = [
    { id: "overview", label: t("stats.tab.overview") },
    { id: "general", label: t("analyzer.tab.general") },
    { id: "periode", label: t("analyzer.tab.period") },
    { id: "sport", label: t("analyzer.tab.sport") },
  ];

  return (
    <>
      <Head>
        <title>{t("statsPage.titleTab")}</title>
      </Head>

      <main className="max-w-md md:max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-10">
        <Header title={t("statsPage.title")} stats={stats} />

        {/* Sous-tabs */}
        <div className="flex gap-2 mb-5 overflow-x-auto -mx-1 px-1">
          {TABS.map((tabDef) => (
            <button
              key={tabDef.id}
              onClick={() => setTab(tabDef.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition border ${
                tab === tabDef.id
                  ? "bg-accent-green/15 border-accent-green/40 text-accent-green"
                  : "bg-bg-card border-white/[0.06] text-white/60 hover:text-white"
              }`}
            >
              {tabDef.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="space-y-5 animate-fade-in">
            {Array.from({ length: 5 }).map((_, sec) => (
              <div key={sec}>
                <Skeleton className="h-3 w-24 mb-2" />
                <div className="grid grid-cols-2 gap-2">
                  <Skeleton className="h-12 rounded-xl" />
                  <Skeleton className="h-12 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && stats && history && (
          <div>
            {tab === "overview" && (
              <>
                <StatsHero picks={history.picks} stats={stats} />
                {sections.map((s) => (
                  <StatsSection key={s.title} title={s.title} rows={s.rows} />
                ))}
              </>
            )}
            {tab === "general" && <AnalyzerGeneral picks={picks} />}
            {tab === "periode" && <AnalyzerPeriode picks={picks} />}
            {tab === "sport" && <AnalyzerSport picks={picks} />}
          </div>
        )}
      </main>
    </>
  );
}
