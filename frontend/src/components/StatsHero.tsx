/**
 * StatsHero — bandeau visuel en haut de la page /stats.
 * Affiche bankroll actuelle + sparkline d'évolution + win rate prominent.
 */

import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";

import { AnimatedNumber } from "@/components/AnimatedNumber";
import { CHART_COLORS } from "@/lib/chartColors";
import { useI18n } from "@/lib/i18n";
import { HistoryPick, HistoryStats } from "@/lib/types";

interface Props {
  picks: HistoryPick[];
  stats: HistoryStats;
}

export function StatsHero({ picks, stats }: Props) {
  const { t } = useI18n();
  // Construit la série bankroll-over-time pour la sparkline
  const series = [{ idx: 0, value: stats.starting_bankroll }];
  for (const p of picks) {
    if (p.outcome === "win" || p.outcome === "loss") {
      series.push({ idx: series.length, value: p.bankroll_after });
    }
  }

  const bankrollIsPositive = stats.current_bankroll >= stats.starting_bankroll;
  const trendColor = bankrollIsPositive ? CHART_COLORS.positive : CHART_COLORS.negative;
  const multiplier = stats.current_bankroll / stats.starting_bankroll;

  return (
    <div className="bg-gradient-to-br from-bg-card to-bg-elevated rounded-3xl p-5 mb-6 border border-white/[0.06] shadow-card overflow-hidden relative">
      <div className="grid grid-cols-2 gap-4 mb-3">
        {/* Bankroll actuelle */}
        <div>
          <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">
            {t("stats.currentBankroll")}
          </div>
          <div
            className={`text-3xl md:text-4xl font-extrabold tabular-nums ${
              bankrollIsPositive ? "text-accent-green" : "text-accent-red"
            }`}
          >
            <AnimatedNumber value={stats.current_bankroll} decimals={2} suffix="€" />
          </div>
          <div className="text-[11px] text-white/50 mt-0.5">
            {t("stats.bankrollSince", { amount: stats.starting_bankroll.toFixed(2) })}{" "}
            <span className={bankrollIsPositive ? "text-accent-green" : "text-accent-red"}>
              ×{multiplier.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Win rate */}
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">
            {t("stats.winRate")}
          </div>
          <div className="text-3xl md:text-4xl font-extrabold tabular-nums text-accent-green">
            <AnimatedNumber value={stats.win_rate} decimals={0} suffix="%" />
          </div>
          <div className="text-[11px] text-white/50 mt-0.5">
            {stats.won}V · {stats.lost}D
            {stats.pending > 0 && ` · ${stats.pending}⏳`}
          </div>
        </div>
      </div>

      {/* Sparkline */}
      {series.length >= 2 && (
        <div className="h-16 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
              <YAxis hide domain={["dataMin", "dataMax"]} />
              <Line
                type="monotone"
                dataKey="value"
                stroke={trendColor}
                strokeWidth={2.5}
                dot={false}
                isAnimationActive={true}
                animationDuration={1200}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Footer : 3 KPIs secondaires */}
      <div className="grid grid-cols-3 gap-3 pt-3 mt-2 border-t border-white/5">
        <KpiInline
          label={t("stats.roi")}
          value={stats.roi_percent}
          decimals={1}
          suffix="%"
          tone={stats.roi_percent >= 0 ? "green" : "red"}
        />
        <KpiInline
          label={t("stats.profit")}
          value={stats.profit}
          decimals={2}
          suffix="€"
          tone={stats.profit >= 0 ? "green" : "red"}
        />
        <KpiInline
          label={t("stats.drawdown")}
          value={stats.drawdown_max}
          decimals={2}
          suffix="€"
          tone="neutral"
        />
      </div>
    </div>
  );
}

function KpiInline({
  label,
  value,
  decimals,
  suffix,
  tone,
}: {
  label: string;
  value: number;
  decimals: number;
  suffix: string;
  tone: "green" | "red" | "neutral";
}) {
  const colorClass =
    tone === "green"
      ? "text-accent-green"
      : tone === "red"
        ? "text-accent-red"
        : "text-white/80";
  const sign = value > 0 && tone !== "neutral" ? "+" : "";
  return (
    <div className="text-center">
      <div className="text-[9px] uppercase tracking-wider text-white/40">{label}</div>
      <div className={`text-sm font-bold tabular-nums ${colorClass}`}>
        {sign}
        <AnimatedNumber value={value} decimals={decimals} suffix={suffix} />
      </div>
    </div>
  );
}
