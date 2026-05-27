import { useEffect, useState } from "react";
import Head from "next/head";

import { AnalyzerGeneral } from "@/components/AnalyzerGeneral";
import { AnalyzerPeriode } from "@/components/AnalyzerPeriode";
import { AnalyzerSport } from "@/components/AnalyzerSport";
import { Header } from "@/components/Header";
import { Skeleton } from "@/components/Skeleton";
import { fetchHistory } from "@/lib/dataSource";
import { useI18n } from "@/lib/i18n";
import { History, HistoryPick, HistoryStats } from "@/lib/types";

type TFn = (key: string, vars?: Record<string, string | number>) => string;
type Tab = "overview" | "general" | "periode" | "sport";

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
      <span className="text-[11px] md:text-xs text-white font-semibold uppercase tracking-wider">{label}</span>
      <span
        className={`text-sm md:text-base font-bold tabular-nums whitespace-nowrap ${toneClass[tone]}`}
      >
        {value}
      </span>
    </div>
  );
}

// TWR (Time-Weighted Return) ignore les flux de capital. En l'absence de
// depot/retrait, c'est exactement progression_percent. TRI = TWR annualise
// (cap a 1000% pour eviter les valeurs absurdes sur petit historique).
function computeExtras(picks: HistoryPick[], stats: HistoryStats) {
  const twr = stats.progression_percent;
  const resolved = picks.filter(
    (p) => p.outcome === "win" || p.outcome === "loss" || p.outcome === "void",
  );
  let tri = 0;
  if (resolved.length > 0 && twr !== 0) {
    const firstDate = new Date(resolved[0].date).getTime();
    const now = Date.now();
    const days = Math.max(1, (now - firstDate) / (1000 * 60 * 60 * 24));
    const annualized = (Math.pow(1 + twr / 100, 365 / days) - 1) * 100;
    tri = Math.min(annualized, 1000);
  }
  const refunded = picks.filter((p) => p.outcome === "void").length;
  return { twr, tri, refunded };
}

function buildOverviewTiles(
  stats: HistoryStats,
  extras: { twr: number; tri: number; refunded: number },
  t: TFn,
): StatRow[] {
  return [
    { label: t("statsPage.bets"), value: `${stats.total_picks}`, tone: "blue" },
    { label: t("statsPage.profit"), value: `${stats.profit.toFixed(2)}€`, tone: signTone(stats.profit) },
    { label: t("statsPage.roi"), value: `${stats.roi_percent.toFixed(2)}%`, tone: signTone(stats.roi_percent) },
    { label: t("statsPage.progression"), value: `${stats.progression_percent.toFixed(2)}%`, tone: signTone(stats.progression_percent) },
    { label: t("statsPage.twr"), value: `${extras.twr.toFixed(2)}%`, tone: signTone(extras.twr) },
    { label: t("statsPage.tri"), value: `${extras.tri.toFixed(2)}%`, tone: signTone(extras.tri) },
    { label: t("statsPage.successRate"), value: `${stats.win_rate.toFixed(2)}%`, tone: "green" },
    { label: t("statsPage.drawdownMax"), value: `${stats.drawdown_max.toFixed(2)}€`, tone: stats.drawdown_max > 0 ? "red" : "neutral" },
    { label: t("statsPage.capitalStart"), value: `${stats.starting_bankroll.toFixed(2)}€` },
    { label: t("statsPage.capitalCurrent"), value: `${stats.current_bankroll.toFixed(2)}€`, tone: signTone(stats.current_bankroll - stats.starting_bankroll) },
    { label: t("statsPage.betsWon"), value: `${stats.won}`, tone: "green" },
    { label: t("statsPage.betsLost"), value: `${stats.lost}`, tone: stats.lost > 0 ? "red" : "neutral" },
    { label: t("statsPage.refunded"), value: `${extras.refunded}`, tone: "blue" },
    { label: t("statsPage.betsPending"), value: `${stats.pending}` },
    { label: t("statsPage.stakePlayed"), value: `${stats.total_stake_played.toFixed(2)}€` },
    { label: t("statsPage.stakePending"), value: `${stats.pending_stake.toFixed(2)}€` },
    { label: t("statsPage.deposit"), value: "0.00€" },
    { label: t("statsPage.withdrawal"), value: "0.00€" },
    { label: t("statsPage.bestStreak"), value: `${stats.best_streak}`, tone: "green" },
    { label: t("statsPage.worstStreak"), value: `${stats.worst_streak}`, tone: stats.worst_streak < 0 ? "red" : "neutral" },
    { label: t("statsPage.stakeAvg"), value: `${stats.avg_stake.toFixed(2)}€` },
    { label: t("statsPage.stakeMax"), value: `${stats.max_stake.toFixed(2)}€` },
    { label: t("statsPage.oddsAvg"), value: stats.average_odds.toFixed(3) },
    { label: t("statsPage.oddsMaxWon"), value: stats.max_odds_won > 0 ? stats.max_odds_won.toFixed(2) : "—" },
    { label: t("statsPage.profitMaxSingle"), value: `${stats.max_profit_single.toFixed(2)}€`, tone: "green" },
    { label: t("statsPage.lossMaxSingle"), value: `${stats.max_loss_single.toFixed(2)}€`, tone: stats.max_loss_single < 0 ? "red" : "neutral" },
    { label: t("statsPage.commissions"), value: "0.00€" },
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

      <main className="w-full max-w-md md:max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-10">
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
            <Skeleton className="h-40 rounded-2xl" />
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-xl" />
              ))}
            </div>
          </div>
        )}

        {!loading && stats && history && (
          <div>
            {tab === "overview" && (
              <>
                {/* StatsHero retiré v6.6 — le graphique est sur la home, et
                    bankroll/win rate sont désormais dans les stat tiles de
                    la home. Pas de duplication ici. */}

                {/* Grille flat — tous les KPI cumules */}
                <div className="grid grid-cols-2 gap-2 md:gap-3 mb-6">
                  {buildOverviewTiles(stats, computeExtras(picks, stats), t).map((r) => (
                    <StatTile key={r.label} {...r} />
                  ))}
                </div>
                {/* Section CLV retirée v6.7 — sera réintroduite quand le
                    pipeline collectera closing_odds par pick. */}
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
