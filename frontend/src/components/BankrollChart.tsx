import { useMemo } from "react";
import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { HistoryPick } from "@/lib/types";

export type ChartMode = "benefice" | "capital";

interface Props {
  picks: HistoryPick[];
  startingBankroll: number;
  variant?: "default" | "hero";
  mode?: ChartMode;
  showValues?: boolean;
}

interface Point {
  date: string;
  label: string;
  value: number | null;
  ifWin?: number | null;
  ifLoss?: number | null;
}

function buildSeries(
  picks: HistoryPick[],
  starting: number,
  mode: ChartMode,
): Point[] {
  const sorted = [...picks].sort((a, b) => a.date.localeCompare(b.date));
  const settled = sorted.filter((p) => p.outcome === "win" || p.outcome === "loss");
  const pendings = sorted.filter((p) => p.outcome === "pending");

  const toY = (bankroll: number) => (mode === "capital" ? bankroll : bankroll - starting);

  const series: Point[] = [];

  if (settled.length > 0) {
    const firstDate = new Date(settled[0].date);
    firstDate.setDate(firstDate.getDate() - 1);
    series.push({
      date: firstDate.toISOString().slice(0, 10),
      label: "",
      value: toY(starting),
    });
  } else {
    series.push({ date: "start", label: "Départ", value: toY(starting) });
  }

  for (const p of settled) {
    series.push({
      date: p.date,
      label: new Date(p.date).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
      }),
      value: toY(p.bankroll_after),
    });
  }

  if (pendings.length > 0 && series.length > 0) {
    const lastBankroll =
      mode === "capital"
        ? series[series.length - 1].value ?? starting
        : (series[series.length - 1].value ?? 0) + starting;
    const p = pendings[pendings.length - 1];
    const ifWinBankroll = Math.round((lastBankroll + p.stake * (p.odds - 1)) * 100) / 100;
    const ifLossBankroll = Math.round((lastBankroll - p.stake) * 100) / 100;

    series[series.length - 1] = {
      ...series[series.length - 1],
      ifWin: series[series.length - 1].value,
      ifLoss: series[series.length - 1].value,
    };

    series.push({
      date: p.date,
      label: new Date(p.date).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
      }),
      value: null,
      ifWin: toY(ifWinBankroll),
      ifLoss: toY(ifLossBankroll),
    });
  }

  return series;
}

function HeroTooltip({
  active,
  payload,
  label,
  mode,
}: {
  active?: boolean;
  payload?: Array<{ value: number | null; dataKey: string; payload: Point }>;
  label?: string;
  mode: ChartMode;
}) {
  if (!active || !payload || payload.length === 0) return null;
  // Dédupliquer : si plusieurs séries pointent vers la même valeur,
  // on ne montre qu'une entrée (avec un nom adapté).
  const seen = new Set<string>();
  const lines: Array<{ name: string; value: number }> = [];
  for (const entry of payload) {
    const v = entry.value;
    if (v === null || v === undefined) continue;
    const key = `${entry.dataKey}-${v.toFixed(2)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    let name = mode === "capital" ? "Capital" : "Bénéfice";
    if (entry.dataKey === "ifWin") name = "Si gagné";
    else if (entry.dataKey === "ifLoss") name = "Si perdu";
    // Évite le doublon "Capital 25 / Si gagné 25 / Si perdu 25" — on dédup par valeur
    if (lines.find((l) => l.value === v)) continue;
    lines.push({ name, value: v });
  }
  if (lines.length === 0) return null;
  const dateLabel = payload[0].payload?.label || label;
  return (
    <div className="bg-bg-card border border-white/15 rounded-lg p-2.5 text-xs shadow-xl">
      {dateLabel && <div className="text-white/60 mb-1">{dateLabel}</div>}
      {lines.map((l, i) => (
        <div key={i} className="text-white">
          <span className="text-white/70">{l.name} :</span>{" "}
          <span className="font-semibold">{l.value.toFixed(2)} €</span>
        </div>
      ))}
    </div>
  );
}

export function BankrollChart({
  picks,
  startingBankroll,
  variant = "default",
  mode = "capital",
  showValues = false,
}: Props) {
  const data = useMemo(
    () => buildSeries(picks, startingBankroll, mode),
    [picks, startingBankroll, mode],
  );
  const hasProjection = data.some((d) => d.ifWin !== undefined && d.ifWin !== null);

  if (variant === "hero") {
    return (
      <div className="h-full min-h-[180px] w-full rounded-2xl overflow-hidden bg-accent-green relative">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 18, right: 14, left: 8, bottom: 8 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.25)" strokeWidth={1} vertical={false} />
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
              content={<HeroTooltip mode={mode} />}
              cursor={{ stroke: "rgba(255,255,255,0.5)", strokeWidth: 1 }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#ffffff"
              strokeWidth={3}
              dot={showValues ? { fill: "#fff", r: 4 } : false}
              connectNulls={false}
              isAnimationActive={false}
            >
              {showValues && (
                <LabelList
                  dataKey="value"
                  position="top"
                  fill="#ffffff"
                  fontSize={11}
                  formatter={(v: number) => (v !== null ? `${v.toFixed(2)}` : "")}
                />
              )}
            </Line>
            {hasProjection && (
              <Line
                type="monotone"
                dataKey="ifWin"
                stroke="#ffffff"
                strokeWidth={3}
                strokeDasharray="6 5"
                dot={showValues ? { fill: "#fff", r: 4 } : false}
                connectNulls={false}
                isAnimationActive={false}
              >
                {showValues && (
                  <LabelList
                    dataKey="ifWin"
                    position="top"
                    fill="#ffffff"
                    fontSize={11}
                    formatter={(v: number) => (v !== null ? `${v.toFixed(2)}` : "")}
                  />
                )}
              </Line>
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Variant default (theme sombre)
  const lastVal = data[data.length - 1]?.value ?? 0;
  const baseline = mode === "capital" ? startingBankroll : 0;
  const positive = lastVal >= baseline;
  const color = positive ? "#10d9a3" : "#ff4d6d";

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
              background: "#14172c",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "rgba(255,255,255,0.6)" }}
            formatter={(v: number) => [`${v.toFixed(2)} €`, mode === "capital" ? "Capital" : "Bénéfice"]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
            connectNulls={false}
          />
          {hasProjection && (
            <Line
              type="monotone"
              dataKey="ifWin"
              stroke={color}
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              connectNulls={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
