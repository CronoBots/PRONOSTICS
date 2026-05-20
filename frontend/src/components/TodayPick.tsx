import { SafePick, SPORT_EMOJIS, SPORT_LABELS } from "@/lib/types";

interface Props {
  pick: SafePick | null;
  date: string;
}

function fmtKickoff(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function TodayPick({ pick, date }: Props) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-accent-green/40 shadow-card">
      {/* Glow background */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent-green/20 via-bg-card to-bg-card pointer-events-none" />
      <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-accent-green/15 blur-3xl pointer-events-none" />

      <div className="relative p-5 md:p-7">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-60" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent-green" />
            </span>
            <span className="text-xs uppercase tracking-[0.2em] text-accent-green font-medium">
              Pick safe du jour
            </span>
          </div>
          <span className="text-xs text-white/40 capitalize">{fmtDate(date)}</span>
        </div>

        {!pick ? (
          <div className="py-10 text-center text-white/60">
            <p className="text-lg">Aucun value bet identifié aujourd'hui.</p>
            <p className="text-sm text-white/40 mt-2 max-w-md mx-auto">
              Le moteur n'a pas trouvé de cote ≥ 2.00 avec une probabilité supérieure
              à celle du bookmaker. Reviens demain pour un nouveau pick.
            </p>
          </div>
        ) : (
          <>
            <div className="text-sm text-white/50 mb-3 flex items-center gap-2 flex-wrap">
              <span className="text-lg">{SPORT_EMOJIS[pick.sport] || ""}</span>
              <span className="font-medium text-white/70">
                {SPORT_LABELS[pick.sport] || pick.sport}
              </span>
              <span className="text-white/20">·</span>
              <span>{pick.league}</span>
              <span className="text-white/20">·</span>
              <span className="capitalize">{fmtKickoff(pick.kickoff)}</span>
            </div>

            <div className="text-2xl md:text-4xl font-bold leading-tight mb-2">
              <span>{pick.home_team}</span>{" "}
              <span className="text-white/30 text-xl md:text-2xl font-normal">vs</span>{" "}
              <span>{pick.away_team}</span>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3 md:gap-5">
              <div className="bg-bg-base/60 backdrop-blur rounded-xl p-3 md:p-4 border border-white/5">
                <div className="text-[10px] md:text-xs uppercase tracking-wider text-white/40">
                  Pari
                </div>
                <div className="text-base md:text-xl font-semibold text-accent-green mt-1 truncate">
                  {pick.pick}
                </div>
              </div>
              <div className="bg-bg-base/60 backdrop-blur rounded-xl p-3 md:p-4 border border-white/5">
                <div className="text-[10px] md:text-xs uppercase tracking-wider text-white/40">
                  Cote
                </div>
                <div className="text-base md:text-xl font-semibold mt-1">
                  {pick.odds.toFixed(2)}
                </div>
              </div>
              <div className="bg-bg-base/60 backdrop-blur rounded-xl p-3 md:p-4 border border-white/5">
                <div className="text-[10px] md:text-xs uppercase tracking-wider text-white/40">
                  EV
                </div>
                <div className="text-base md:text-xl font-semibold text-accent-green mt-1">
                  +{(pick.expected_value * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="mt-4 text-xs text-white/50">
              Probabilité modèle{" "}
              <span className="text-white/80 font-medium">
                {(pick.model_probability * 100).toFixed(0)}%
              </span>{" "}
              vs bookmaker{" "}
              <span className="text-white/60">
                {(pick.book_probability * 100).toFixed(0)}%
              </span>
            </div>

            {pick.rationale.length > 0 && (
              <details className="mt-5 text-sm group">
                <summary className="cursor-pointer list-none flex items-center gap-2 text-accent-green hover:text-white transition">
                  <span className="text-xs">▸</span>
                  <span className="text-xs uppercase tracking-wider font-medium">
                    Analyse du moteur
                  </span>
                </summary>
                <ul className="mt-3 space-y-1.5 text-white/60 pl-4">
                  {pick.rationale.slice(0, 5).map((r, i) => (
                    <li key={i} className="list-disc">
                      {r}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
      </div>
    </div>
  );
}
