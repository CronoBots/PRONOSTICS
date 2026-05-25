import { ReactNode, useMemo } from "react";
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

import { CHART_COLORS } from "@/lib/chartColors";
import { localeForLang, useI18n } from "@/lib/i18n";
import { HistoryPick } from "@/lib/types";

export type ChartMode = "benefice" | "capital";

/**
 * Label custom rendu via Recharts LabelList content prop : un pill blanc
 * arrondi avec valeur en vert dark dedans. Beaucoup plus lisible que du texte
 * blanc directement sur la ligne blanche du chart.
 */
function PillLabel(props: {
  x?: number;
  y?: number;
  value?: number | string;
}) {
  const { x = 0, y = 0, value } = props;
  if (value === null || value === undefined || value === "") return null;
  const text = typeof value === "number" ? value.toFixed(2) : String(value);
  const charWidth = 6.5;
  const padX = 6;
  const width = text.length * charWidth + padX * 2;
  const height = 16;
  const cx = x;
  const cy = y - 10;
  return (
    <g pointerEvents="none">
      <rect
        x={cx - width / 2}
        y={cy - height / 2}
        width={width}
        height={height}
        rx={8}
        fill="#ffffff"
      />
      <text
        x={cx}
        y={cy + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={10}
        fontWeight={700}
        fill={CHART_COLORS.brandDark}
      >
        {text}
      </text>
    </g>
  );
}

/**
 * Génère un tableau de ticks "nice numbers" à intervalle régulier entre min
 * et max. Retourne typiquement `count+1` valeurs uniformément espacées,
 * step arrondi à 1/2/5/10/20/50/100… selon la magnitude.
 *
 * Exemple : niceTickArray(2, 16, 5) → [0, 5, 10, 15, 20] (step = 5)
 *           niceTickArray(-3, 12, 5) → [-5, 0, 5, 10, 15]
 */
function niceTickArray(min: number, max: number, count: number): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max === min) {
    const v = Number.isFinite(min) ? min : 0;
    return [v - 1, v, v + 1];
  }
  const range = max - min;
  const rawStep = range / count;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalized = rawStep / magnitude;
  let step: number;
  if (normalized < 1.5) step = 1 * magnitude;
  else if (normalized < 3) step = 2 * magnitude;
  else if (normalized < 7) step = 5 * magnitude;
  else step = 10 * magnitude;
  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = niceMin; v <= niceMax + step / 2; v += step) {
    ticks.push(Math.round(v * 1000) / 1000); // évite les flottants type 1.99999
  }
  return ticks;
}

interface Props {
  picks: HistoryPick[];
  startingBankroll: number;
  variant?: "default" | "hero";
  mode?: ChartMode;
  showValues?: boolean;
  /** Contenu rendu en bas du container vert (variant hero uniquement),
   *  utilisé typiquement pour les period pills 1j/1s/1m/1a. */
  footer?: ReactNode;
  /** Element rendu en absolute top-right (typiquement bouton ⋯). */
  topRight?: ReactNode;
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
  footer,
  topRight,
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
    // Hero NΞXBΞT v6 : fond aligné sur StatsHero (gradient bg-card →
    // bg-elevated, theme-aware). Ligne data dynamique vert/rouge selon
    // trend (gain vs perte), échelle Y en vert sémantique. Ligne projection
    // ifWin reste blanche+pointillée pour distinguer "réel" vs "scénario".
    // Génère des ticks Y à intervalles RÉGULIERS (pas calé sur les valeurs
    // brutes des picks pour éviter une échelle type "2, 4, 7, 16").
    const allValues = data
      .flatMap((d) => [d.value, d.ifWin, d.ifLoss])
      .filter((v): v is number => v !== null && v !== undefined);
    const dataMin = allValues.length ? Math.min(...allValues) : 0;
    const dataMax = allValues.length ? Math.max(...allValues) : 10;
    const niceTicks = niceTickArray(dataMin, dataMax, 5);
    const yDomain: [number, number] = [niceTicks[0], niceTicks[niceTicks.length - 1]];
    // Couleur de la ligne data : vert si bankroll finale ≥ starting (gain),
    // rouge sinon (perte). Aligné sur le comportement de StatsHero (/stats).
    const lastValue = data[data.length - 1]?.value ?? startingBankroll;
    const trendColor =
      lastValue >= startingBankroll ? "var(--accent-green)" : "var(--accent-red)";
    return (
      <div className="h-full w-full rounded-3xl overflow-hidden bg-gradient-to-br from-bg-card to-bg-elevated relative flex flex-col border card-border shadow-card">
        {topRight && (
          <div className="absolute top-3 right-3 z-10">{topRight}</div>
        )}
        {/* Wrapper relatif : ResponsiveContainer Recharts a besoin d'un parent
            avec hauteur résolue. En layout flex-1 imbriqué, l'hauteur n'est
            mesurable qu'après calcul ; absolute inset-0 garantit une dimension
            exploitable dès le 1er render. */}
        <div className="flex-1 min-h-[160px] relative">
          <div className="absolute inset-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 18, right: 14, left: 8, bottom: 6 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.25)" strokeWidth={1} vertical={false} />
              <XAxis dataKey="label" hide />
              <YAxis
                stroke="var(--accent-green)"
                tick={{ fontSize: 11, fill: "var(--accent-green)" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${Math.round(v)}€`}
                domain={yDomain}
                ticks={niceTicks}
                width={42}
              />
              <Tooltip
                contentStyle={{
                  background: "rgba(0,0,0,0.55)",
                  border: "1px solid rgba(255,255,255,0.25)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "#fff",
                }}
                labelStyle={{ color: "rgba(255,255,255,0.75)" }}
                formatter={(v: number) => [
                  `${v.toFixed(2)} €`,
                  mode === "capital" ? labels.capital : labels.benefit,
                ]}
                cursor={{ stroke: "rgba(255,255,255,0.5)", strokeWidth: 1 }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={trendColor}
                strokeWidth={3}
                dot={showValues ? { fill: trendColor, r: 4 } : false}
                connectNulls={false}
                isAnimationActive={true}
                animationDuration={1000}
              >
                {showValues && (
                  <LabelList dataKey="value" position="top" content={<PillLabel />} />
                )}
              </Line>
              {hasProjection && (
                <Line
                  type="monotone"
                  dataKey="ifWin"
                  stroke="#ffffff"
                  strokeWidth={3}
                  strokeDasharray="6 5"
                  strokeOpacity={0.8}
                  dot={showValues ? { fill: "#fff", r: 4 } : false}
                  connectNulls={false}
                  isAnimationActive={true}
                  animationDuration={1000}
                >
                  {showValues && (
                    <LabelList dataKey="ifWin" position="top" content={<PillLabel />} />
                  )}
                </Line>
              )}
            </LineChart>
          </ResponsiveContainer>
          </div>
        </div>
        {footer && <div className="px-3 pb-3 pt-1">{footer}</div>}
      </div>
    );
  }

  // Variant default (theme sombre)
  const lastVal = data[data.length - 1]?.value ?? 0;
  const baseline = mode === "capital" ? startingBankroll : 0;
  const positive = lastVal >= baseline;
  const color = positive ? CHART_COLORS.positive : CHART_COLORS.negative;

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
              background: CHART_COLORS.bg,
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
