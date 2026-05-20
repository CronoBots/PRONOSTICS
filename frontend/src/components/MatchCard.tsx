import { Match, SPORT_EMOJIS, SPORT_LABELS } from "@/lib/types";
import { PredictionBar } from "./PredictionBar";

interface Props {
  match: Match;
}

function formatKickoff(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function evColor(ev: number | null): string {
  if (ev === null) return "text-white/40";
  if (ev > 0.1) return "text-emerald-400";
  if (ev > 0) return "text-emerald-300";
  return "text-rose-400";
}

export function MatchCard({ match }: Props) {
  const pred = match.prediction;

  return (
    <article className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-5 hover:border-brand-500/40 transition">
      <header className="flex items-center justify-between mb-3 text-xs text-white/60">
        <span className="flex items-center gap-1.5">
          <span>{SPORT_EMOJIS[match.sport] || ""}</span>
          <span>{SPORT_LABELS[match.sport] || match.sport}</span>
          <span className="text-white/30">·</span>
          <span className="truncate max-w-[180px]">{match.league}</span>
        </span>
        <span>{formatKickoff(match.kickoff)}</span>
      </header>

      <div className="flex items-center justify-between mb-4">
        <div className="text-lg font-medium">{match.homeTeam}</div>
        <div className="text-xs text-white/40 px-2">vs</div>
        <div className="text-lg font-medium text-right">{match.awayTeam}</div>
      </div>

      {pred ? (
        <div className="space-y-3">
          <PredictionBar probabilities={pred.probabilities} pick={pred.pick} />

          <div className="flex items-baseline justify-between pt-2 border-t border-white/5">
            <div>
              <div className="text-xs uppercase tracking-wide text-white/40">Pronostic</div>
              <div className="text-base font-semibold text-brand-100">{pred.pick}</div>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wide text-white/40">Confiance</div>
              <div className="text-base font-semibold">{(pred.confidence * 100).toFixed(1)}%</div>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wide text-white/40">EV</div>
              <div className={`text-base font-semibold ${evColor(pred.expectedValue)}`}>
                {pred.expectedValue !== null ? `${(pred.expectedValue * 100).toFixed(1)}%` : "—"}
              </div>
            </div>
          </div>

          {pred.rationale.length > 0 && (
            <details className="text-xs text-white/60">
              <summary className="cursor-pointer hover:text-white/80">Analyse</summary>
              <ul className="mt-2 space-y-1 list-disc list-inside text-white/50">
                {pred.rationale.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
              <div className="mt-2 text-white/30">Moteur : {pred.engine}</div>
            </details>
          )}
        </div>
      ) : (
        <div className="text-sm text-white/40">Pas encore de prédiction.</div>
      )}
    </article>
  );
}
