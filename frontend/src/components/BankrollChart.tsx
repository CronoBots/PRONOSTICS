import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
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
  bankroll: number | null;
  ifWin?: number | null;
  ifLoss?: number | null;
}

function buildSeries(picks: HistoryPick[], starting: number): Point[] {
  const sorted = [...picks].sort((a, b) => a.date.localeCompare(b.date));
  const settled = sorted.filter((p) => p.outcome === "win" || p.outcome === "loss");
  const pendings = sorted.filter((p) => p.outcome === "pending");

  const series: Point[] = [];

  // Point de départ
  if (settled.length > 0) {
    const firstDate = new Date(settled[0].date);
    firstDate.setDate(firstDate.getDate() - 1);
    series.push({
      date: firstDate.toISOString().slice(0, 10),
      label: "",
      bankroll: starting,
    });
  } else {
    series.push({ date: "start", label: "Départ", bankroll: starting });
  }

  // Picks réglés
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

  // Projection si pari en cours
  if (pendings.length > 0 && series.length > 0) {
    const lastBankroll = series[series.length - 1].bankroll ?? starting;
    // Dernier pari pending = projection
    const p = pendings[pendings.length - 1];
    const ifWin = Math.round((lastBankroll + p.stake * (p.odds - 1)) * 100) / 100;
    const ifLoss = Math.round((lastBankroll - p.stake) * 100) / 100;

    // Ancrage : dernier point réglé = mêmes valeurs ifWin/ifLoss pour que les lignes
    // partent du même endroit que la courbe principale
    series[series.length - 1] = {
      ...series[series.length - 1],
      ifWin: lastBankroll,
      ifLoss: lastBankroll,
    };

    // Point de projection (au-delà du dernier pari réglé)
    series.push({
      date: p.date,
      label: new Date(p.date).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
      }),
      bankroll: null,
      ifWin,
      ifLoss,
    });
  }

  return series;
}

export function BankrollChart({ picks, startingBankroll, variant = "default" }: Props) {
  const data = useMemo(() => buildSeries(picks, startingBankroll), [picks, startingBankroll]);
  const hasProjection = data.some((d) => d.ifWin !== undefined && d.ifWin !== null);

  if (variant === "hero") {
    return (
      <div className="h-72 md:h-80 w-full rounded-3xl overflow-hidden bg-accent-green relative">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 18, right: 14, left: 8, bottom: 8 }}>
            <CartesianGrid
              stroke="rgba(255,255,255,0.25)"
              strokeWidth={1}
              vertical={false}
            />
            <XAxis dataKey="label" hide />
            <YAxis
              stroke="rgba(255,255,255,0.85)"
              tick={{ fontSize: 12, fill: "#ffffff" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v} €`}
              domain={["dataMin - 2", "dataMax + 2"]}
              width={48}
              tickCount={8}
            />
            <Tooltip
              contentStyle={{
                background: "rgba(10,11,30,0.95)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 8,
                fontSize: 12,
                color: "#fff",
              }}
              labelStyle={{ color: "rgba(255,255,255,0.7)" }}
              formatter={(v: number) => {
                if (v === null || v === undefined) return ["", ""];
                return [`${v.toFixed(2)} €`, "Bankroll"];
              }}
            />
            <Line
              type="monotone"
              dataKey="bankroll"
              stroke="#ffffff"
              strokeWidth={3}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
            {hasProjection && (
              <>
                {/* Continuation pointillée vers le haut (si gagné) */}
                <Line
                  type="monotone"
                  dataKey="ifWin"
                  stroke="#ffffff"
                  strokeWidth={3}
                  strokeDasharray="6 5"
                  dot={false}
                  connectNulls={false}
                  isAnimationActive={false}
                />
                {/* Continuation pointillée vers le bas (si perdu) */}
                <Line
                  type="monotone"
                  dataKey="ifLoss"
                  stroke="#ffffff"
                  strokeWidth={3}
                  strokeDasharray="6 5"
                  dot={false}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Default: theme sombre
  const positive = data.length > 0 && (data[data.length - 1].bankroll ?? 0) >= startingBankroll;
  const color = positive ? "#26e0a4" : "#ff5470";

  return (
    <div className="h-64 md:h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
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
            domain={["dataMin - 5", "dataMax + 5"]}
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
          <Line
            type="monotone"
            dataKey="bankroll"
            stroke={color}
            strokeWidth={2}
            dot={false}
            connectNulls={false}
          />
          {hasProjection && (
            <>
              <Line
                type="monotone"
                dataKey="ifWin"
                stroke="#26e0a4"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={{ fill: "#26e0a4", r: 3 }}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="ifLoss"
                stroke="#ff5470"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={{ fill: "#ff5470", r: 3 }}
                connectNulls={false}
              />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
