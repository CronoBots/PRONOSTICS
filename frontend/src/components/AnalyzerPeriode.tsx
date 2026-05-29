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

import { useI18n } from "@/lib/i18n";
import { statsByDayOfWeek } from "@/lib/stats";
import { HistoryPick } from "@/lib/types";

interface Props {
  picks: HistoryPick[];
}

const tooltipStyle = {
  background: "#111827",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 8,
  fontSize: 12,
};

export function AnalyzerPeriode({ picks }: Props) {
  const { t } = useI18n();
  const rows = statsByDayOfWeek(picks);

  return (
    <div className="space-y-5">
      <section className="bg-bg-card border border-white/[0.06] rounded-2xl p-4 md:p-5 shadow-card">
        <h3 className="text-center text-sm font-semibold text-white/80 mb-3">
          Bénéfice par jour de la semaine
        </h3>
        <div className="h-56 w-full">
          <ResponsiveContainer>
            <BarChart data={rows} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="day"
                stroke="rgba(255,255,255,0.35)"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                angle={-25}
                textAnchor="end"
                height={50}
              />
              <YAxis
                stroke="rgba(255,255,255,0.35)"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}€`}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number) => [`${v.toFixed(2)} €`, t("chart.profit")]}
              />
              <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
                {rows.map((r) => (
                  <Cell
                    key={r.day}
                    fill={r.profit >= 0 ? "#26e0a4" : "#ff5470"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="bg-bg-card border border-white/[0.06] rounded-2xl p-4 md:p-5 shadow-card">
        <h3 className="text-center text-sm font-semibold text-white/80 mb-3">
          ROI et Réussite par jour
        </h3>
        <div className="h-56 w-full">
          <ResponsiveContainer>
            <BarChart data={rows} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="day"
                stroke="rgba(255,255,255,0.35)"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                angle={-25}
                textAnchor="end"
                height={50}
              />
              <YAxis
                stroke="rgba(255,255,255,0.35)"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number, name: string) => [`${v.toFixed(1)}%`, name]}
              />
              <Bar dataKey="roi" fill="#5b8def" radius={[4, 4, 0, 0]} name="ROI" />
              <Bar dataKey="win_rate" fill="#ff9d3d" radius={[4, 4, 0, 0]} name={t("chart.winRatePct")} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-4 text-xs text-white/60 mt-2">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-accent-blue" /> ROI
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: "#ff9d3d" }} />
            Réussite %
          </div>
        </div>
      </section>

      <section className="bg-bg-card border border-white/[0.06] rounded-2xl overflow-hidden shadow-card">
        <h3 className="text-center text-sm font-semibold text-white/80 py-3 border-b border-white/5">
          Statistiques par jour
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-white/40 border-b border-white/5">
              <th className="px-3 py-2 text-left font-medium">Jour</th>
              <th className="px-3 py-2 text-center font-medium">Paris</th>
              <th className="px-3 py-2 text-center font-medium text-accent-green">Gagné</th>
              <th className="px-3 py-2 text-center font-medium text-accent-red">Perdu</th>
              <th className="px-3 py-2 text-right font-medium">Bénéf.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.day} className="border-b border-white/5 last:border-b-0">
                <td className="px-3 py-2 text-white/80">{r.day}</td>
                <td className="px-3 py-2 text-center text-accent-blue tabular-nums">
                  {r.paris}
                </td>
                <td className="px-3 py-2 text-center text-accent-green tabular-nums">
                  {r.won}
                </td>
                <td className="px-3 py-2 text-center text-accent-red tabular-nums">
                  {r.lost}
                </td>
                <td
                  className={`px-3 py-2 text-right tabular-nums font-medium ${
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
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
