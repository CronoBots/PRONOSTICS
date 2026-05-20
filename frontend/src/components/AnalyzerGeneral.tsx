import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import {
  breakdownByState,
  computeProfitFactor,
  computeStakeRatio,
  statsByStakeBucket,
} from "@/lib/stats";
import { HistoryPick } from "@/lib/types";

interface Props {
  picks: HistoryPick[];
}

function fmtSigned(n: number, suffix = " €") {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}${suffix}`;
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
  const states = breakdownByState(picks);
  const total = states.reduce((s, x) => s + x.count, 0);
  const data = states.filter((s) => s.count > 0);
  const pf = computeProfitFactor(picks);
  const sr = computeStakeRatio(picks);
  const buckets = statsByStakeBucket(picks);

  return (
    <div className="space-y-5">
      {/* Donut Répartition des états */}
      <section className="bg-bg-card border border-white/[0.06] rounded-2xl p-5 shadow-card">
        <h3 className="text-center text-sm font-semibold text-white/80 mb-3">
          Répartition des états
        </h3>
        <div className="h-56 w-full">
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
              >
                {data.map((entry) => (
                  <Cell key={entry.state} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#14172c",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value: number, name: string) => [`${value} pari${value > 1 ? "s" : ""}`, name]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap justify-center gap-3 mt-3">
          {states.map((s) => (
            <div key={s.state} className="flex items-center gap-2 text-xs">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ background: s.color }} />
              <span className="text-white/60">{s.label}</span>
              <span className="text-white/40">({s.count})</span>
            </div>
          ))}
        </div>
        <div className="text-center text-[11px] text-white/40 mt-3">
          {total} pari{total > 1 ? "s" : ""} au total
        </div>
      </section>

      {/* Profit Factor */}
      <BigStatCard
        title="Profit Factor"
        value={
          pf.factor === Infinity
            ? "∞"
            : pf.factor === 0
              ? "—"
              : pf.factor.toFixed(2)
        }
        tone={pf.factor >= 1.2 ? "green" : pf.factor > 0 && pf.factor < 1 ? "red" : "neutral"}
        rows={[
          { label: "Bénéfice total", value: `${pf.totalGains.toFixed(2)} €`, tone: "green" },
          { label: "Perte total", value: `${pf.totalLosses.toFixed(2)} €`, tone: "red" },
        ]}
      />

      {/* Ratio Mise / Profit */}
      <BigStatCard
        title="Ratio Mise/Profit"
        value={sr.ratio === 0 ? "—" : sr.ratio.toFixed(2)}
        tone={sr.profit >= 0 ? "neutral" : "red"}
        rows={[
          {
            label: "Mise totale",
            value: `${sr.totalStake.toFixed(2)} €`,
            tone: "neutral",
          },
          {
            label: "Bénéfice",
            value: fmtSigned(sr.profit),
            tone: sr.profit >= 0 ? "green" : "red",
          },
        ]}
      />

      {/* Mise totale + moyenne par état */}
      <section className="bg-bg-card border border-white/[0.06] rounded-2xl overflow-hidden shadow-card">
        <h3 className="text-center text-sm font-semibold text-white/80 py-3 border-b border-white/5">
          Mise totale et moyenne par état
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-white/40 border-b border-white/5">
              <th className="px-3 py-2 text-left font-medium">État</th>
              <th className="px-3 py-2 text-right font-medium">Mise totale</th>
              <th className="px-3 py-2 text-right font-medium">Mise moyenne</th>
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
          Statistiques par tranche de mise
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-white/40 border-b border-white/5">
              <th className="px-2 py-2 text-left font-medium">Tranche</th>
              <th className="px-2 py-2 text-center font-medium">Paris</th>
              <th className="px-2 py-2 text-right font-medium">Mise totale</th>
              <th className="px-2 py-2 text-right font-medium">Bénéf.</th>
            </tr>
          </thead>
          <tbody>
            {buckets.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center text-white/40 py-4">
                  Aucun pari
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
          États par tranche de mise
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-white/40 border-b border-white/5">
              <th className="px-2 py-2 text-left font-medium">Tranche</th>
              <th className="px-2 py-2 text-center font-medium">⋯</th>
              <th className="px-2 py-2 text-center font-medium text-accent-green">V</th>
              <th className="px-2 py-2 text-center font-medium text-accent-red">D</th>
            </tr>
          </thead>
          <tbody>
            {buckets.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center text-white/40 py-4">
                  Aucun pari
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
