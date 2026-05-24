import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { formatSignedAmount as fmtSigned } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import {
  breakdownByState,
  computeProfitFactor,
  statsByStakeBucket,
} from "@/lib/stats";
import { HistoryPick } from "@/lib/types";

interface Props {
  picks: HistoryPick[];
}

function BigStatCard({
  title,
  value,
  tone,
  rows,
}: {
  title: string;
  value: string;
  tone: "green" | "red" | "neutral";
  rows: { label: string; value: string; tone: "green" | "red" | "neutral" }[];
}) {
  const toneClass =
    tone === "green" ? "text-accent-green" : tone === "red" ? "text-accent-red" : "text-white";
  return (
    <section className="bg-bg-card border border-white/[0.06] rounded-2xl overflow-hidden shadow-card">
      <h3 className="text-center text-sm font-semibold text-white/80 py-3">{title}</h3>
      <div className="bg-bg-elevated/30 py-6 mx-3 rounded-xl">
        <div className={`text-6xl font-extrabold text-center tabular-nums ${toneClass}`}>
          {value}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 p-3">
        {rows.map((r) => (
          <div key={r.label} className="bg-bg-elevated/40 rounded-lg p-2.5">
            <div className="text-[11px] text-white/50">{r.label}</div>
            <div
              className={`text-sm font-bold mt-0.5 tabular-nums ${
                r.tone === "green"
                  ? "text-accent-green"
                  : r.tone === "red"
                    ? "text-accent-red"
                    : "text-white"
              }`}
            >
              {r.value}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function AnalyzerGeneral({ picks }: Props) {
  const { t } = useI18n();
  // breakdownByState renvoie `label` = clé i18n ; on résout ici pour le rendu.
  const states = breakdownByState(picks).map((s) => ({ ...s, label: t(s.label) }));
  const total = states.reduce((s, x) => s + x.count, 0);
  const data = states.filter((s) => s.count > 0);
  const pf = computeProfitFactor(picks);
  const buckets = statsByStakeBucket(picks);

  return (
    <div className="space-y-5">
      {/* Donut Répartition des états */}
      <section className="bg-bg-card border border-white/[0.06] rounded-2xl p-5 shadow-card">
        <h3 className="text-center text-sm font-semibold text-white/80 mb-3">
          {t("analyzer.section.statesBreakdown")}
        </h3>
        <div className="h-56 w-full [&_*:focus]:outline-none">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="label"
                innerRadius={56}
                outerRadius={92}
                stroke="none"
                paddingAngle={2}
                isAnimationActive
              >
                {data.map((entry) => (
                  <Cell key={entry.state} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "rgba(20, 23, 44, 0.95)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 10,
                  padding: "8px 12px",
                  fontSize: 12,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                }}
                wrapperStyle={{ outline: "none" }}
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const item = payload[0];
                  const value = item.value as number;
                  const name = item.name as string;
                  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";
                  const color = item.payload?.color || "#ffffff";
                  return (
                    <div
                      style={{
                        background: "rgba(20, 23, 44, 0.95)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 10,
                        padding: "8px 12px",
                        fontSize: 12,
                        color: "#fff",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                      }}
                    >
                      <div style={{ fontWeight: 700, marginBottom: 2 }}>{name}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span
                          style={{
                            display: "inline-block",
                            width: 10,
                            height: 10,
                            background: color,
                            borderRadius: 2,
                          }}
                        />
                        <span>
                          {name}: {value} ({pct}%)
                        </span>
                      </div>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-3">
          {states.map((s) => {
            const pct = total > 0 ? ((s.count / total) * 100).toFixed(0) : "0";
            return (
              <div key={s.state} className="flex items-center gap-1.5 text-xs">
                <span
                  className="inline-block w-5 h-2.5 rounded-sm"
                  style={{ background: s.color }}
                />
                <span className="text-white/80 font-medium">{s.label}</span>
                <span className="text-white/45 tabular-nums">
                  ({s.count}
                  {total > 0 ? ` · ${pct}%` : ""})
                </span>
              </div>
            );
          })}
        </div>
        <div className="text-center text-[11px] text-white/40 mt-3">
          {t(total > 1 ? "analyzer.totalBets.many" : "analyzer.totalBets.one", { n: total })}
        </div>
      </section>

      {/* Profit Factor */}
      <BigStatCard
        title={t("analyzer.profitFactor")}
        value={
          pf.factor === Infinity
            ? "∞"
            : pf.factor === 0
              ? "—"
              : pf.factor.toFixed(2)
        }
        tone={pf.factor >= 1.2 ? "green" : pf.factor > 0 && pf.factor < 1 ? "red" : "neutral"}
        rows={[
          { label: t("analyzer.profitTotal"), value: `${pf.totalGains.toFixed(2)} €`, tone: "green" },
          { label: t("analyzer.lossTotal"), value: `${pf.totalLosses.toFixed(2)} €`, tone: "red" },
        ]}
      />

      {/* Mise totale + moyenne par état */}
      <section className="bg-bg-card border border-white/[0.06] rounded-2xl overflow-hidden shadow-card">
        <h3 className="text-center text-sm font-semibold text-white/80 py-3 border-b border-white/5">
          {t("analyzer.section.stakeByState")}
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-white/40 border-b border-white/5">
              <th className="px-3 py-2 text-left font-medium">{t("analyzer.col.state")}</th>
              <th className="px-3 py-2 text-right font-medium">{t("analyzer.col.stakeTotal")}</th>
              <th className="px-3 py-2 text-right font-medium">{t("analyzer.col.stakeAvg")}</th>
            </tr>
          </thead>
          <tbody>
            {states.map((s) => (
              <tr key={s.state} className="border-b border-white/5 last:border-b-0">
                <td className="px-3 py-2.5">
                  <span style={{ color: s.color }}>{s.label}</span>
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {s.total_stake.toFixed(2)} €
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {s.avg_stake.toFixed(2)} €
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Statistiques par tranche de mise */}
      <section className="bg-bg-card border border-white/[0.06] rounded-2xl overflow-hidden shadow-card">
        <h3 className="text-center text-sm font-semibold text-white/80 py-3 border-b border-white/5">
          {t("analyzer.section.byStakeBucket")}
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-white/40 border-b border-white/5">
              <th className="px-2 py-2 text-left font-medium">{t("analyzer.col.bucket")}</th>
              <th className="px-2 py-2 text-center font-medium">{t("analyzer.col.bets")}</th>
              <th className="px-2 py-2 text-right font-medium">{t("analyzer.col.stakeTotal")}</th>
              <th className="px-2 py-2 text-right font-medium">{t("analyzer.col.profit")}</th>
            </tr>
          </thead>
          <tbody>
            {buckets.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center text-white/40 py-4">
                  {t("analyzer.empty")}
                </td>
              </tr>
            ) : (
              buckets.map((b) => (
                <tr key={b.label} className="border-b border-white/5 last:border-b-0">
                  <td className="px-2 py-2 text-xs">{b.label}</td>
                  <td className="px-2 py-2 text-center tabular-nums text-accent-blue">
                    {b.count}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {b.totalStake.toFixed(2)} €
                  </td>
                  <td
                    className={`px-2 py-2 text-right tabular-nums font-semibold ${
                      b.profit > 0
                        ? "text-accent-green"
                        : b.profit < 0
                          ? "text-accent-red"
                          : "text-white/40"
                    }`}
                  >
                    {fmtSigned(b.profit)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {/* États par tranche de mise */}
      <section className="bg-bg-card border border-white/[0.06] rounded-2xl overflow-hidden shadow-card">
        <h3 className="text-center text-sm font-semibold text-white/80 py-3 border-b border-white/5">
          {t("analyzer.section.statesByBucket")}
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-white/40 border-b border-white/5">
              <th className="px-2 py-2 text-left font-medium">{t("analyzer.col.bucket")}</th>
              <th className="px-2 py-2 text-center font-medium">⋯</th>
              <th className="px-2 py-2 text-center font-medium text-accent-green">V</th>
              <th className="px-2 py-2 text-center font-medium text-accent-red">D</th>
            </tr>
          </thead>
          <tbody>
            {buckets.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center text-white/40 py-4">
                  {t("analyzer.empty")}
                </td>
              </tr>
            ) : (
              buckets.map((b) => (
                <tr key={b.label} className="border-b border-white/5 last:border-b-0">
                  <td className="px-2 py-2 text-xs">{b.label}</td>
                  <td className="px-2 py-2 text-center tabular-nums text-white/50">
                    {b.pending}
                  </td>
                  <td className="px-2 py-2 text-center tabular-nums text-accent-green">
                    {b.won}
                  </td>
                  <td className="px-2 py-2 text-center tabular-nums text-accent-red">
                    {b.lost}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
