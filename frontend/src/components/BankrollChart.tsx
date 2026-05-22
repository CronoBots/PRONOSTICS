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

import { localeForLang, useI18n } from "@/lib/i18n";
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
  locale: string,
  startLabel: string,
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
    series.push({ date: "start", label: startLabel, value: toY(starting) });
  }

  for (const p of settled) {
    series.push({
      date: p.date,
      label: new Date(p.date).toLocaleDateString(locale, {
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
      label: new Date(p.date).toLocaleDateString(locale, {
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

export function BankrollChart({
  picks,
  startingBankroll,
  variant = "default",
  mode = "capital",
  showValues = false,
}: Props) {
  const { t, lang } = useI18n();
  const locale = localeForLang(lang);
  const labels = {
    capital: t("chart.capital"),
    benefit: t("chart.benefit"),
  };
  const data = useMemo(
    () => buildSeries(picks, startingBankroll, mode, locale, t("chart.start")),
    [picks, startingBankroll, mode, locale, t],
  );
  const hasProjection = data.some((d) => d.ifWin !== undefined && d.ifWin !== null);

  if (variant === "hero") {
    // Style sparkline sombre (inspiré /stats StatsHero) :
    // - fond gradient bg-card → bg-elevated
    // - ligne verte/rouge selon trend (vs flashy green/blanc)
    // - grid + axes très discrets
    // - tooltip dark cohérent avec le reste de l'app
    const lastVal = data[data.length - 1]?.value ?? 0;
    const baseline = mode === "capital" ? startingBankroll : 0;
    const positive = lastVal >= baseline;
    const lineColor = positive ? "#10d9a3" : "#ff4d6d";

    return (
      <div className="h-full min-h-[180px] w-full rounded-2xl overflow-hidden bg-gradient-to-br from-bg-card to-bg-elevated border border-white/[0.06] shadow-card relative">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 18, right: 14, left: 8, bottom: 8 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeWidth={1} vertical={false} />
            <XAxis dataKey="label" hide />
            <YAxis
              stroke="rgba(255,255,255,0.25)"
              tick={{ fontSize: 11, fill: "rgba(255,255,255,0.5)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${Math.round(v)}€`}
              domain={["dataMin - 2", "dataMax + 2"]}
              width={42}
              tickCount={5}
            />
            <Tooltip
              contentStyle={{
                background: "rgb(var(--bg-card-rgb))",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "rgba(255,255,255,0.5)" }}
              formatter={(v: number) => [
                `${v.toFixed(2)} €`,
                mode === "capital" ? labels.capital : labels.benefit,
              ]}
              cursor={{ stroke: "rgba(255,255,255,0.3)", strokeWidth: 1 }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={lineColor}
              strokeWidth={2.5}
              dot={showValues ? { fill: lineColor, r: 4 } : false}
              connectNulls={false}
              isAnimationActive={true}
              animationDuration={1200}
            >
              {showValues && (
                <LabelList
                  dataKey="value"
                  position="top"
                  fill="rgba(255,255,255,0.85)"
                  fontSize={11}
                  formatter={(v: number) => (v !== null ? `${v.toFixed(2)}` : "")}
                />
              )}
            </Line>
            {hasProjection && (
              <Line
                type="monotone"
                dataKey="ifWin"
                stroke={lineColor}
                strokeWidth={2.5}
                strokeDasharray="6 5"
                strokeOpacity={0.6}
                dot={showValues ? { fill: lineColor, r: 4 } : false}
                connectNulls={false}
                isAnimationActive={true}
                animationDuration={1200}
              >
                {showValues && (
                  <LabelList
                    dataKey="ifWin"
                    position="top"
                    fill="rgba(255,255,255,0.85)"
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
            tickFormatter={(v) => `${Math.round(v)}€`}
            domain={["dataMin - 5", "dataMax + 5"]}
            width={42}
          />
          <Tooltip
            contentStyle={{
              background: "#14172c",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "rgba(255,255,255,0.6)" }}
            formatter={(v: number) => [`${v.toFixed(2)} €`, mode === "capital" ? labels.capital : labels.benefit]}
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
