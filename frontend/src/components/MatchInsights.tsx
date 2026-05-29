import { useEffect, useState } from "react";

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

interface Verdict {
  tone: "green" | "yellow" | "red";
  label: string;
  text: string;
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
  risk_flags: string[];
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

export async function fetchInsights(date: string): Promise<InsightsPayload | null> {
  try {
    const r = await fetch(`${basePath()}/data/insights/${date}.json`, {
      cache: "no-store",
    });
    if (!r.ok) return null;
    return (await r.json()) as InsightsPayload;
  } catch {
    return null;
  }
}

function ProbabilityGauge({ value, label }: { value: number; label: string }) {
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
    </div>
  );
}

function LegCard({ leg, index }: { leg: LegInsight; index: number }) {
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
        <ProbabilityGauge value={leg.model_probability} label="Modèle" />
        <ProbabilityGauge value={leg.market_implied} label="Marché" />
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.06]">
        <div className="text-[11px] text-white/40">
          Edge {edge >= 0 ? "+" : ""}
          {(edge * 100).toFixed(1)} pts
        </div>
        <div
          className={`text-[11px] font-bold tabular-nums ${
            leg.ev_pct >= 0 ? "text-accent-green" : "text-accent-red"
          }`}
        >
          EV {leg.ev_pct >= 0 ? "+" : ""}
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
  const [data, setData] = useState<InsightsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchInsights(date).then((d) => {
      if (!cancelled) {
        setData(d);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [date]);

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

  return (
    <div className="space-y-4">
      {/* Header verdict */}
      <div className={`rounded-3xl border-2 p-5 ${TONE_BG[data.verdict.tone]}`}>
        <div className="flex items-center gap-2 mb-2">
          <div className="text-[10px] uppercase tracking-widest font-bold opacity-80">
            AI Insights
          </div>
          <div className="text-[10px] uppercase tracking-wider font-bold border border-current/40 px-2 py-0.5 rounded-full">
            {data.verdict.label}
          </div>
        </div>
        <div className="text-base font-bold text-white mb-1">
          {data.headline || data.pick_label}
        </div>
        <div className="text-[13px] opacity-90">{data.verdict.text}</div>
      </div>

      {/* Probability + finance grid */}
      <div className="bg-bg-card border border-white/[0.06] rounded-3xl p-5">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <ProbabilityGauge value={data.model_probability} label="Proba modèle" />
          <ProbabilityGauge value={data.market_implied} label="Proba marché" />
        </div>
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/[0.06]">
          <div>
            <div className="text-[9px] uppercase tracking-wider text-white/40 font-semibold mb-0.5">
              Edge
            </div>
            <div className="text-base font-bold text-accent-blue tabular-nums">
              +{edgePoints} pts
            </div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-wider text-white/40 font-semibold mb-0.5">
              EV
            </div>
            <div
              className={`text-base font-bold tabular-nums ${
                data.ev_pct >= 0 ? "text-accent-green" : "text-accent-red"
              }`}
            >
              {data.ev_pct >= 0 ? "+" : ""}
              {data.ev_pct.toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-wider text-white/40 font-semibold mb-0.5">
              Net P/L
            </div>
            <div className="text-base font-bold text-white tabular-nums">
              +{data.potential_profit.toFixed(2)}€
            </div>
          </div>
        </div>
      </div>

      {/* Per-leg cards (combos only) */}
      {data.legs.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-wider text-white/45 font-semibold mb-2 px-1">
            Sélections du combo
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

      {/* Risk flags */}
      {data.risk_flags.length > 0 && (
        <div className="bg-yellow-500/[0.06] border border-yellow-400/25 rounded-2xl p-4">
          <div className="text-[11px] uppercase tracking-wider text-yellow-300 font-bold mb-2 flex items-center gap-2">
            <span>⚠️</span>
            <span>Garde-fous</span>
          </div>
          <ul className="space-y-1.5">
            {data.risk_flags.map((flag, i) => (
              <li key={i} className="text-[12px] text-white/70 leading-snug">
                — {flag}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Sources */}
      {data.sources.length > 0 && (
        <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-4">
          <div className="text-[11px] uppercase tracking-wider text-white/45 font-semibold mb-3">
            Sources croisées ({data.sources.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {data.sources.map((s, i) => (
              <a
                key={i}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] px-2.5 py-1 rounded-full bg-bg-elevated border border-white/[0.08] text-white/70 hover:text-white hover:border-white/20 transition-colors"
              >
                {s.name}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
