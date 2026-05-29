import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { CHART_COLORS } from "@/lib/chartColors";
import { useI18n } from "@/lib/i18n";
import { statsBySport } from "@/lib/stats";
import { HistoryPick } from "@/lib/types";

interface Props {
  picks: HistoryPick[];
}

const TOOLTIP_STYLE = {
  background: CHART_COLORS.bg,
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 8,
  fontSize: 12,
};

export function AnalyzerSport({ picks }: Props) {
  const { t } = useI18n();
  const rows = statsBySport(picks);
  const successRows = rows.map((r) => ({
    ...r,
    success_rate: r.won + r.lost > 0 ? Math.round((r.won / (r.won + r.lost)) * 100) : 0,
  }));

  return (
    <div className="space-y-5">
      <section className="bg-bg-card border border-white/[0.06] rounded-2xl overflow-hidden shadow-card">
        <h3 className="text-center text-sm font-semibold text-white/80 py-3 border-b border-white/5">
          Bilan par sport
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-white/40 border-b border-white/5">
              <th className="px-3 py-2 text-left font-medium">Sport</th>
              <th className="px-3 py-2 text-center font-medium">Paris</th>
              <th className="px-3 py-2 text-center font-medium text-accent-green">V</th>
              <th className="px-3 py-2 text-center font-medium text-accent-red">D</th>
              <th className="px-3 py-2 text-right font-medium">Bénéf.</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-white/40">
                  Aucun pari encore enregistré
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.sport} className="border-b border-white/5 last:border-b-0">
                  <td className="px-3 py-2.5 flex items-center gap-2">
                    <span>{r.emoji}</span>
                    <span>{r.label}</span>
                  </td>
                  <td className="px-3 py-2.5 text-center text-accent-blue tabular-nums">
                    {r.paris}
                  </td>
                  <td className="px-3 py-2.5 text-center text-accent-green tabular-nums">
                    {r.won}
                  </td>
                  <td className="px-3 py-2.5 text-center text-accent-red tabular-nums">
                    {r.lost}
                  </td>
                  <td
                    className={`px-3 py-2.5 text-right tabular-nums font-medium ${
                      r.profit > 0
                        ? "text-accent-green"
                        : r.profit < 0
                          ? "text-accent-red"
                          : "text-white/40"
                    }`}
                  >
                    {r.profit > 0 ? "+" : ""}
                    {r.profit.toFixed(2)} €
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className="bg-bg-card border border-white/[0.06] rounded-2xl p-4 md:p-5 shadow-card">
        <h3 className="text-center text-sm font-semibold text-white/80 mb-3">
          Bénéfice par sport
        </h3>
        <div className="h-56 w-full">
          <ResponsiveContainer>
            <BarChart data={rows} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="label"
                stroke="rgba(255,255,255,0.35)"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="rgba(255,255,255,0.35)"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}€`}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v: number) => [`${v.toFixed(2)} €`, t("chart.profit")]}
              />
              <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
                {rows.map((r) => (
                  <Cell key={r.sport} fill={r.profit >= 0 ? CHART_COLORS.positive : CHART_COLORS.negative} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* NEW: Taux de réussite par sport */}
      <section className="bg-bg-card border border-white/[0.06] rounded-2xl p-4 md:p-5 shadow-card">
        <h3 className="text-center text-sm font-semibold text-white/80 mb-3">
          Taux de réussite par sport
        </h3>
        <div className="h-56 w-full">
          <ResponsiveContainer>
            <BarChart data={successRows} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="label"
                stroke="rgba(255,255,255,0.35)"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="rgba(255,255,255,0.35)"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v: number) => [`${v}%`, t("chart.winRate")]}
              />
              <Bar dataKey="success_rate" radius={[4, 4, 0, 0]}>
                {successRows.map((r) => {
                  let color: string = CHART_COLORS.positive;
                  if (r.success_rate < 50) color = CHART_COLORS.negative;
                  else if (r.success_rate < 70) color = "#fcd34d";
                  return <Cell key={r.sport} fill={color} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
