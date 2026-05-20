import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { breakdownByState } from "@/lib/stats";
import { HistoryPick } from "@/lib/types";

interface Props {
  picks: HistoryPick[];
}

export function AnalyzerGeneral({ picks }: Props) {
  const states = breakdownByState(picks);
  const total = states.reduce((s, x) => s + x.count, 0);
  const data = states.filter((s) => s.count > 0);

  return (
    <div className="space-y-5">
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
                  background: "#111827",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value: number, name: string) => [
                  `${value} pari${value > 1 ? "s" : ""}`,
                  name,
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap justify-center gap-3 mt-3">
          {states.map((s) => (
            <div key={s.state} className="flex items-center gap-2 text-xs">
              <span
                className="inline-block w-3 h-3 rounded-sm"
                style={{ background: s.color }}
              />
              <span className="text-white/60">{s.label}</span>
              <span className="text-white/40">({s.count})</span>
            </div>
          ))}
        </div>
        <div className="text-center text-[11px] text-white/40 mt-3">
          {total} pari{total > 1 ? "s" : ""} au total
        </div>
      </section>

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
    </div>
  );
}
