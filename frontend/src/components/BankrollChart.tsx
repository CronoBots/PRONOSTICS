import { useMemo } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { HistoryPick } from "@/lib/types";

interface Props {
  picks: HistoryPick[];
  startingBankroll: number;
  variant?: "default" | "hero";
}

interface Point {
  date: string;
  label: string;
  bankroll: number;
}

function buildSeries(picks: HistoryPick[], starting: number): Point[] {
  const settled = picks
    .filter((p) => p.outcome === "win" || p.outcome === "loss")
    .sort((a, b) => a.date.localeCompare(b.date));

  const series: Point[] = [];
  if (settled.length === 0) {
    return [{ date: "start", label: "Départ", bankroll: starting }];
  }
  const firstDate = new Date(settled[0].date);
  firstDate.setDate(firstDate.getDate() - 1);
  series.push({
    date: firstDate.toISOString().slice(0, 10),
    label: "",
    bankroll: starting,
  });

  for (const p of settled) {
    series.push({
      date: p.date,
      label: new Date(p.date).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
      }),
      bankroll: p.bankroll_after,
    });
  }
  return series;
}

export function BankrollChart({ picks, startingBankroll, variant = "default" }: Props) {
  const data = useMemo(() => buildSeries(picks, startingBankroll), [picks, startingBankroll]);

  if (variant === "hero") {
    // Style bet-analytix : fond vert plein, ligne blanche, axes blanches
    return (
      <div className="h-72 md:h-80 w-full rounded-3xl overflow-hidden bg-accent-green relative">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 18, right: 12, left: 8, bottom: 8 }}>
            <XAxis dataKey="label" hide />
            <YAxis
              stroke="rgba(255,255,255,0.85)"
              tick={{ fontSize: 12, fill: "#ffffff" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v} €`}
              domain={["dataMin - 5", "dataMax + 5"]}
              width={44}
            />
            <Tooltip
              contentStyle={{
                background: "rgba(10,15,26,0.95)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 8,
                fontSize: 12,
                color: "#fff",
              }}
              labelStyle={{ color: "rgba(255,255,255,0.7)" }}
              formatter={(v: number) => [`${v.toFixed(2)} €`, "Bankroll"]}
            />
            <Area
              type="monotone"
              dataKey="bankroll"
              stroke="#ffffff"
              strokeWidth={3}
              fill="transparent"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Default: theme sombre
  const positive = data.length > 0 && data[data.length - 1].bankroll >= startingBankroll;
  const color = positive ? "#26e0a4" : "#ff5470";

  return (
    <div className="h-64 md:h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="bankrollFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.32} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="label"
            stroke="rgba(255,255,255,0.35)"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={32}
          />
          <YAxis
            stroke="rgba(255,255,255,0.35)"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v} €`}
            domain={["dataMin - 20", "dataMax + 20"]}
            width={56}
          />
          <Tooltip
            contentStyle={{
              background: "#111827",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "rgba(255,255,255,0.6)" }}
            formatter={(v: number) => [`${v.toFixed(2)} €`, "Bankroll"]}
          />
          <Area
            type="monotone"
            dataKey="bankroll"
            stroke={color}
            strokeWidth={2}
            fill="url(#bankrollFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
