import { useEffect, useState } from "react";

import { useI18n } from "@/lib/i18n";

interface LegInsight {
  home_team: string;
  away_team: string;
  pick_label: string;
  kickoff: string;
  odds: number;
  model_probability: number;
  market_implied: number;
  ev_pct: number;
}

interface SourceInsight {
  url: string;
  name: string;
}

interface RiskFlag {
  code: string;
  context: string | null;
}

interface Verdict {
  tone: "green" | "yellow" | "red";
  key: "bonCoup" | "ok" | "limite" | "eviter";
  params: { prob: number; ev: number; odds: number };
}

interface InsightsPayload {
  date: string;
  sport: string;
  league: string;
  pick_label: string;
  headline?: string;
  odds: number;
  stake: number;
  model_probability: number;
  market_implied: number;
  ev_pct: number;
  potential_return: number;
  potential_profit: number;
  legs: LegInsight[];
  sections: Record<string, string[]>;
  risk_flags: RiskFlag[];
  sources: SourceInsight[];
  verdict: Verdict;
}

const TONE_BG: Record<Verdict["tone"], string> = {
  green: "bg-accent-green/10 border-accent-green/30 text-accent-green",
  yellow: "bg-yellow-500/10 border-yellow-400/30 text-yellow-300",
  red: "bg-accent-red/10 border-accent-red/30 text-accent-red",
};

function basePath(): string {
  return process.env.NEXT_PUBLIC_RESOLVED_BASE_PATH || "";
}

export async function fetchInsights(
  date: string,
  lang: "fr" | "en" = "fr",
): Promise<InsightsPayload | null> {
  // Try locale-specific file first, fall back to the legacy unsuffixed
  // file (FR by convention) if the locale variant isn't there yet.
  const tries = [
    `${basePath()}/data/insights/${date}.${lang}.json`,
    `${basePath()}/data/insights/${date}.json`,
  ];
  for (const url of tries) {
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (r.ok) return (await r.json()) as InsightsPayload;
    } catch {
      /* try next */
    }
  }
  return null;
}

function ProbabilityGauge({ value, label, hint }: { value: number; label: string; hint?: string }) {
  // value 0..1, render a horizontal bar with the percentage
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className="flex-1">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">
          {label}
        </span>
        <span className="text-sm font-bold text-white tabular-nums">
          {pct.toFixed(0)}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent-blue to-accent-green transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      {hint && <div className="text-[10px] text-white/40 mt-1.5 leading-snug">{hint}</div>}
    </div>
  );
}

function LegCard({ leg, index }: { leg: LegInsight; index: number }) {
  const { t } = useI18n();
  const edge = leg.model_probability - leg.market_implied;
  return (
    <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-full bg-accent-blue/15 border border-accent-blue/40 flex items-center justify-center text-[11px] font-bold text-accent-blue">
          {index + 1}
        </div>
        <div className="text-sm font-semibold text-white truncate flex-1">
          {leg.home_team} <span className="text-white/30">vs</span> {leg.away_team}
        </div>
        <div className="text-base font-bold text-accent-green tabular-nums">
          {leg.odds.toFixed(2)}
        </div>
      </div>
      <div className="text-[11px] text-white/55 mb-3 italic">{leg.pick_label}</div>
      <div className="grid grid-cols-2 gap-3">
        <ProbabilityGauge value={leg.model_probability} label={t("insights.leg.estimation")} />
        <ProbabilityGauge value={leg.market_implied} label={t("insights.leg.market")} />
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.06]">
        <div className={`text-[11px] ${edge >= 0 ? "text-accent-blue" : "text-accent-red"}`}>
          {t("insights.leg.advantage")} : {edge >= 0 ? "+" : ""}
          {(edge * 100).toFixed(1)} pts
        </div>
        <div
          className={`text-[11px] font-bold tabular-nums ${
            leg.ev_pct >= 0 ? "text-accent-green" : "text-accent-red"
          }`}
        >
          {t("insights.leg.rentability")} {leg.ev_pct >= 0 ? "+" : ""}
          {leg.ev_pct.toFixed(1)}%
        </div>
      </div>
    </div>
  );
}

function RationaleSection({ title, lines }: { title: string; lines: string[] }) {
  const body = lines.join(" ").replace(/\*\*(.+?)\*\*/g, "$1");
  if (!body.trim()) return null;
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-accent-blue font-bold mb-2">
        {title}
      </div>
      <p className="text-[13px] text-white/70 leading-relaxed">{body}</p>
    </div>
  );
}

export function MatchInsights({ date }: { date: string }) {
  const { t, lang } = useI18n();
  const [data, setData] = useState<InsightsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchInsights(date, lang).then((d) => {
      if (!cancelled) {
        setData(d);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [date, lang]);

  if (loading) {
    return (
      <div className="bg-bg-card border border-white/[0.06] rounded-3xl p-5 animate-pulse">
        <div className="h-4 w-24 bg-white/[0.06] rounded mb-4" />
        <div className="h-12 bg-white/[0.06] rounded mb-3" />
        <div className="h-2 w-full bg-white/[0.06] rounded" />
      </div>
    );
  }
  if (!data) return null;

  const edgePoints = ((data.model_probability - data.market_implied) * 100).toFixed(1);
  const verdictLabel = t(`insights.verdict.${data.verdict.key}.label`);
  const verdictText = t(`insights.verdict.${data.verdict.key}.text`, {
    prob: String(data.verdict.params.prob),
    ev: String(data.verdict.params.ev),
    odds: String(data.verdict.params.odds),
  });

  return (
    <div className="space-y-4">
      {/* Header verdict */}
      <div className={`rounded-3xl border-2 p-5 ${TONE_BG[data.verdict.tone]}`}>
        <div className="flex items-center gap-2 mb-2">
          <div className="text-[10px] uppercase tracking-widest font-bold opacity-80">
            {t("insights.badge")}
          </div>
          <div className="text-[10px] uppercase tracking-wider font-bold border border-current/40 px-2 py-0.5 rounded-full">
            {verdictLabel}
          </div>
        </div>
        <div className="text-base font-bold text-white mb-1">
          {data.headline || data.pick_label}
        </div>
        <div className="text-[13px] opacity-90">{verdictText}</div>
      </div>

      {/* Probability + finance grid */}
      <div className="bg-bg-card border border-white/[0.06] rounded-3xl p-5">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <ProbabilityGauge
            value={data.model_probability}
            label={t("insights.estimation")}
            hint={t("insights.estimation.hint")}
          />
          <ProbabilityGauge
            value={data.market_implied}
            label={t("insights.market")}
            hint={t("insights.market.hint")}
          />
        </div>
        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/[0.06]">
          <div>
            <div className="text-[9px] uppercase tracking-wider text-white/40 font-semibold mb-0.5">
              {t("insights.advantage")}
            </div>
            <div
              className={`text-base font-bold tabular-nums ${
                data.model_probability >= data.market_implied
                  ? "text-accent-blue"
                  : "text-accent-red"
              }`}
            >
              {data.model_probability >= data.market_implied ? "+" : ""}
              {edgePoints} pts
            </div>
            <div className="text-[10px] text-white/40 leading-snug mt-0.5">
              {t("insights.advantage.hint")}
            </div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-wider text-white/40 font-semibold mb-0.5">
              {t("insights.rentability")}
            </div>
            <div
              className={`text-base font-bold tabular-nums ${
                data.ev_pct >= 0 ? "text-accent-green" : "text-accent-red"
              }`}
            >
              {data.ev_pct >= 0 ? "+" : ""}
              {data.ev_pct.toFixed(1)}%
            </div>
            <div className="text-[10px] text-white/40 leading-snug mt-0.5">
              {t("insights.rentability.hint")}
            </div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-wider text-white/40 font-semibold mb-0.5">
              {t("insights.netGain")}
            </div>
            <div className="text-base font-bold text-white tabular-nums">
              +{data.potential_profit.toFixed(2)}€
            </div>
            <div className="text-[10px] text-white/40 leading-snug mt-0.5">
              {t("insights.netGain.hint")}
            </div>
          </div>
        </div>
      </div>

      {/* Per-leg cards (combos only) */}
      {data.legs.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-wider text-white/45 font-semibold mb-2 px-1">
            {t("insights.legs.title")}
          </div>
          <div className="space-y-2">
            {data.legs.map((leg, i) => (
              <LegCard key={i} leg={leg} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Rationale sections */}
      {Object.entries(data.sections).length > 0 && (
        <div className="bg-bg-card border border-white/[0.06] rounded-3xl p-5 space-y-5">
          {Object.entries(data.sections).map(([title, lines]) => (
            <RationaleSection key={title} title={title} lines={lines} />
          ))}
        </div>
      )}

      {/* Risk flags = "ce qu'on a vérifié pour limiter le risque" */}
      {data.risk_flags.length > 0 && (
        <div className="bg-yellow-500/[0.06] border border-yellow-400/25 rounded-2xl p-4">
          <div className="text-[11px] uppercase tracking-wider text-yellow-300 font-bold mb-1">
            {t("insights.risk.title")}
          </div>
          <p className="text-[11px] text-white/45 leading-relaxed mb-3">
            {t("insights.risk.intro")}
          </p>
          <ul className="space-y-3">
            {data.risk_flags.map((flag, i) => {
              const title = t(`insights.risk.${flag.code}.title`);
              const description = t(`insights.risk.${flag.code}.description`);
              // If the i18n lookup returned the key itself, the code is
              // unknown (e.g. WARN) — fall back to context-as-title.
              const titleResolved = title.startsWith("insights.risk.")
                ? flag.context || flag.code
                : title;
              const descResolved = description.startsWith("insights.risk.")
                ? ""
                : description;
              return (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="text-accent-green mt-0.5 shrink-0">✓</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-white leading-snug">
                      {titleResolved}
                    </div>
                    {descResolved && (
                      <div className="text-[11px] text-white/55 leading-relaxed mt-0.5">
                        {descResolved}
                      </div>
                    )}
                    {flag.context && flag.context !== titleResolved && (
                      <div className="text-[11px] text-yellow-300/70 leading-relaxed mt-1 italic">
                        {t("insights.risk.context", { ctx: flag.context })}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Sources */}
      {data.sources.length > 0 && (
        <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-4">
          <div className="text-[11px] uppercase tracking-wider text-white/45 font-semibold mb-1.5">
            {t("insights.sources.title", { n: String(data.sources.length) })}
          </div>
          <p className="text-[11px] text-white/45 leading-relaxed mb-3">
            {t("insights.sources.intro")}
          </p>
          <div className="flex flex-wrap gap-2">
            {data.sources.map((s, i) => (
              <a
                key={i}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] px-2.5 py-1 rounded-full bg-bg-elevated border border-white/[0.08] text-white/70 hover:text-white hover:border-white/20 transition-colors"
              >
                {s.name} ↗
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
