import { AnimatedNumber } from "@/components/AnimatedNumber";
import { useI18n } from "@/lib/i18n";
import { PersonalStats } from "@/lib/personalBets";

interface Props {
  stats: PersonalStats;
}

export function PersonalStatsBar({ stats }: Props) {
  const { t } = useI18n();
  const hasData = stats.total > 0;
  if (!hasData) return null;

  const profitColor =
    stats.total_profit > 0
      ? "text-accent-green"
      : stats.total_profit < 0
        ? "text-accent-red"
        : "text-white/60";
  const roiColor =
    stats.roi_percent > 0
      ? "text-accent-green"
      : stats.roi_percent < 0
        ? "text-accent-red"
        : "text-white/60";

  return (
    <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-4 mb-4">
      {/* Headline : profit total */}
      <div className="text-center mb-3">
        <div className="text-[11px] uppercase tracking-wider text-white/40 font-semibold mb-1">
          {t("perso.statsHeadline")}
        </div>
        <div className={`text-3xl font-bold tabular-nums ${profitColor}`}>
          {stats.total_profit > 0 ? "+" : ""}
          <AnimatedNumber value={stats.total_profit} decimals={2} />
          <span className="text-lg ml-1">€</span>
        </div>
        <div className="text-xs text-white/50 mt-1">
          {t("perso.statsOver", { n: stats.settled })}
        </div>
      </div>

      {/* 4 KPIs */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <Kpi
          label={t("perso.kpiRoi")}
          value={`${stats.roi_percent > 0 ? "+" : ""}${stats.roi_percent.toFixed(1)}%`}
          color={roiColor}
        />
        <Kpi
          label={t("perso.kpiWinrate")}
          value={`${stats.win_rate.toFixed(0)}%`}
          color="text-white/80"
        />
        <Kpi
          label={t("perso.kpiAvgOdds")}
          value={stats.avg_odds > 0 ? stats.avg_odds.toFixed(2) : "—"}
          color="text-white/80"
        />
        <Kpi
          label={t("perso.kpiStreak")}
          value={
            stats.current_streak === 0
              ? "—"
              : stats.current_streak > 0
                ? `🔥 +${stats.current_streak}`
                : `🥶 ${stats.current_streak}`
          }
          color={
            stats.current_streak > 0
              ? "text-accent-green"
              : stats.current_streak < 0
                ? "text-accent-red"
                : "text-white/60"
          }
        />
      </div>

      {/* Details row */}
      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/5 text-[10px] text-white/45 text-center">
        <span>
          {t("perso.statsStaked")}:{" "}
          <span className="text-white/70 tabular-nums">{stats.total_staked.toFixed(2)} €</span>
        </span>
        <span>
          <span className="text-accent-green">{stats.won}W</span>{" "}
          <span className="text-accent-red">{stats.lost}L</span>{" "}
          {stats.void > 0 && <span className="text-accent-blue">{stats.void}V</span>}
        </span>
        {stats.pending > 0 ? (
          <span>
            ⏳{" "}
            <span className="text-yellow-400 tabular-nums">
              {stats.pending} · {stats.pending_stake.toFixed(2)} €
            </span>
          </span>
        ) : (
          <span>—</span>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-white/40 font-semibold mb-0.5">
        {label}
      </div>
      <div className={`text-sm font-bold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
