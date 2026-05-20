import { SafePick, SPORT_EMOJIS, SPORT_LABELS } from "@/lib/types";

interface Props {
  pick: SafePick | null;
  date: string;
}

function fmtKickoff(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
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
              {pick?.kind === "safe_favorite" ? "Favori safe du jour" : "Pick safe du jour"}
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
              <span className="capitalize">{fmtKickoff(pick.kickoff)}</span>
            </div>

            <div className="text-xs text-white/50 mb-3">{pick.league}</div>

            <div className="text-xl md:text-2xl font-medium text-white/70 leading-tight mb-1">
              <span>{pick.home_team}</span>{" "}
              <span className="text-white/30 font-normal">vs</span>{" "}
              <span>{pick.away_team}</span>
            </div>
            <div className="text-xs text-white/40 mb-5">
              Match à <span className="text-white/70 font-medium">{pick.home_team}</span>{" "}
              (le {pick.home_team.split(" ")[0]} reçoit)
            </div>

            {/* ⚡ Le pari à jouer : énorme, en couleur, impossible à rater */}
            <div className="bg-accent-green text-bg-base rounded-2xl p-4 md:p-5 mb-4 shadow-lg shadow-accent-green/20">
              <div className="text-[10px] md:text-xs uppercase tracking-[0.2em] font-bold opacity-70 mb-1">
                ⚡ Pari à placer
              </div>
              <div className="text-2xl md:text-4xl font-black leading-none">
                {pick.pick}{" "}
                <span className="opacity-60 font-bold text-xl md:text-2xl">VAINQUEUR</span>
              </div>
              <div className="text-xs md:text-sm mt-2 opacity-80 font-medium">
                Cote {pick.odds.toFixed(2)} · {(pick.model_probability * 100).toFixed(0)}% de chances estimées
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:gap-4">
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
                  Edge (EV)
                </div>
                <div className="text-base md:text-xl font-semibold text-accent-green mt-1">
                  +{(pick.expected_value * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Bloc mise / gain potentiel */}
            {pick.stake !== undefined && pick.potential_profit !== undefined && (
              <div className="mt-4 bg-bg-base/40 backdrop-blur rounded-xl p-4 border border-accent-green/20">
                <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">
                  Mise & gains potentiels
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-[10px] text-white/50">Mise</div>
                    <div className="text-lg font-bold tabular-nums">
                      {pick.stake.toFixed(2)} €
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-accent-green">Si gagné</div>
                    <div className="text-lg font-bold tabular-nums text-accent-green">
                      +{pick.potential_profit.toFixed(2)} €
                    </div>
                    <div className="text-[10px] text-white/40">
                      (retour {pick.potential_return?.toFixed(2)} €)
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-accent-red">Si perdu</div>
                    <div className="text-lg font-bold tabular-nums text-accent-red">
                      −{pick.stake.toFixed(2)} €
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 text-xs text-white/50 leading-relaxed">
              Notre modèle estime{" "}
              <span className="text-white/80 font-medium">
                {(pick.model_probability * 100).toFixed(0)}% de chances de gagner
              </span>
              , alors que le bookmaker estime{" "}
              <span className="text-white/60">
                {(pick.book_probability * 100).toFixed(0)}%
              </span>{" "}
              (déduit de la cote {pick.odds.toFixed(2)}). C'est ça qu'on appelle un{" "}
              <span className="text-accent-green">value bet</span>.
            </div>

            {pick.rationale.length > 0 && (
              <details className="mt-5 text-sm group" open>
                <summary className="cursor-pointer list-none flex items-center gap-2 text-accent-green hover:text-white transition mb-3">
                  <span className="text-xs">▾</span>
                  <span className="text-xs uppercase tracking-wider font-medium">
                    Analyse complète ({pick.rationale.length} points)
                  </span>
                </summary>
                <ul className="space-y-2 text-white/70 text-[13px] md:text-sm">
                  {pick.rationale.map((r, i) => (
                    <li key={i} className="leading-relaxed">
                      {r}
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {pick.sources && pick.sources.length > 0 && (
              <details className="mt-3 text-xs">
                <summary className="cursor-pointer text-white/40 hover:text-white/70">
                  Sources ({pick.sources.length})
                </summary>
                <ul className="mt-2 space-y-1 text-white/40">
                  {pick.sources.map((s, i) => (
                    <li key={i} className="truncate">
                      <a
                        href={s}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-accent-green underline underline-offset-2"
                      >
                        {s.replace(/^https?:\/\//, "").slice(0, 60)}
                      </a>
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
