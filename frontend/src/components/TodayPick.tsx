import { SafePick, SPORT_EMOJIS, SPORT_LABELS } from "@/lib/types";

interface Props {
  pick: SafePick | null;
  date: string;
}

function fmtKickoff(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TodayPick({ pick, date }: Props) {
  return (
    <div className="bg-gradient-to-br from-accent-green/15 via-bg-card to-bg-card border border-accent-green/30 rounded-2xl p-5 md:p-6 shadow-card">
      <div className="flex items-center justify-between text-xs uppercase tracking-wider text-white/50 mb-3">
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
          Pick safe du jour
        </span>
        <span>{new Date(date).toLocaleDateString("fr-FR", { dateStyle: "full" })}</span>
      </div>

      {!pick ? (
        <div className="py-8 text-center text-white/60">
          <p className="text-base">Aucun value bet identifié pour aujourd'hui.</p>
          <p className="text-sm text-white/40 mt-1">
            Le moteur n'a pas trouvé de cote ≥ 2.00 avec une probabilité supérieure
            à celle du bookmaker. Reviens demain.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-[1fr_auto] gap-6 items-center">
          <div>
            <div className="text-xs text-white/50 mb-1">
              <span>{SPORT_EMOJIS[pick.sport] || ""}</span>{" "}
              <span>{SPORT_LABELS[pick.sport] || pick.sport}</span>
              <span className="text-white/30"> · </span>
              <span>{pick.league}</span>
              <span className="text-white/30"> · </span>
              <span>{fmtKickoff(pick.kickoff)}</span>
            </div>
            <div className="text-2xl md:text-3xl font-semibold mt-1">
              {pick.home_team}{" "}
              <span className="text-white/40 font-normal text-xl">vs</span>{" "}
              {pick.away_team}
            </div>
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-accent-green text-bg-base font-medium text-sm">
                Pick : {pick.pick}
              </span>
              <span className="px-3 py-1 rounded-full bg-white/10 text-sm">
                Cote {pick.odds.toFixed(2)}
              </span>
              <span className="px-3 py-1 rounded-full bg-white/10 text-sm">
                Modèle {(pick.model_probability * 100).toFixed(0)}%
              </span>
              <span className="px-3 py-1 rounded-full bg-accent-green/15 text-accent-green text-sm">
                EV +{(pick.expected_value * 100).toFixed(1)}%
              </span>
            </div>

            {pick.rationale.length > 0 && (
              <details className="mt-4 text-sm text-white/60">
                <summary className="cursor-pointer hover:text-white/80">
                  Analyse du moteur
                </summary>
                <ul className="mt-2 space-y-1 list-disc list-inside text-white/50">
                  {pick.rationale.slice(0, 5).map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
