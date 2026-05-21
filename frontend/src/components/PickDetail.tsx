import { ReactNode, useState } from "react";

import { ComboLeg, HistoryPick, PickComparison, PickResult, SafePick, SPORT_EMOJIS, SPORT_LABELS } from "@/lib/types";

interface UnifiedPick {
  date: string;
  sport: string;
  league: string;
  home_team: string;
  away_team: string;
  kickoff: string;
  pick: string;
  odds: number;
  odds_unboosted?: number;
  model_probability: number;
  book_probability: number;
  expected_value: number;
  headline?: string;
  rationale: string[];
  sources?: string[];
  stake?: number;
  outcome?: "win" | "loss" | "pending" | "void";
  profit?: number;
  result?: PickResult | null;
  comparison?: PickComparison | null;
  profile_tags?: string[];
  legs?: ComboLeg[];
}

interface Props {
  pick: UnifiedPick;
  variant?: "today" | "past";
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

const GLOSSARY: Record<string, string> = {
  cote: "Multiplicateur du gain : pour 1€ misé tu touches X€ si tu gagnes.",
  ev: "Expected Value = rentabilité statistique du pari. Positive = pari rentable à long terme.",
  edge: "Écart entre notre estimation et celle du bookmaker. Plus c'est élevé, plus le pari est intéressant.",
  era: "Earned Run Average — points encaissés par lanceur sur 9 manches (baseball). Bas = bon.",
  whip:
    "Walks + Hits per Inning — coureurs adverses sur base par manche (baseball). Bas = bon.",
};

export function PickDetail({ pick, variant = "today" }: Props) {
  const isPending = pick.outcome === "pending" || pick.outcome === undefined;
  const isWin = pick.outcome === "win";
  const isLoss = pick.outcome === "loss";
  const stake = pick.stake ?? 5;
  const potentialProfit = stake * (pick.odds - 1);
  const potentialReturn = stake * pick.odds;

  return (
    <div className="space-y-5">
      {/* Headline punchy en haut */}
      {pick.headline && (
        <div className="bg-accent-green/10 border-l-4 border-accent-green rounded-r-xl px-4 py-3">
          <div className="text-[10px] uppercase tracking-wider text-accent-green/80 font-semibold mb-1">
            💡 En 1 phrase
          </div>
          <p className="text-sm md:text-base font-medium leading-relaxed">{pick.headline}</p>
        </div>
      )}

      {/* Header */}
      <div>
        <div className="text-sm text-white/50 flex items-center gap-2 flex-wrap">
          <span className="text-lg">{SPORT_EMOJIS[pick.sport] || ""}</span>
          <span className="font-medium text-white/70">
            {SPORT_LABELS[pick.sport] || pick.sport}
          </span>
          <span className="text-white/20">·</span>
          <span className="capitalize">{fmtKickoff(pick.kickoff)}</span>
        </div>
        <div className="text-xs text-white/50 mt-1">{pick.league}</div>
        <div className="text-2xl md:text-3xl font-bold leading-tight mt-3">
          <span>{pick.home_team}</span>{" "}
          <span className="text-white/30 text-xl font-normal">vs</span>{" "}
          <span>{pick.away_team}</span>
        </div>
      </div>

      {/* Bannière selon état */}
      {isPending ? (
        <PendingBanner pick={pick} />
      ) : isWin ? (
        <WinBanner pick={pick} />
      ) : isLoss ? (
        <LossBanner pick={pick} />
      ) : null}

      {/* Résumé chiffres clés */}
      <div className="grid grid-cols-3 gap-3">
        <KeyStat
          label="Cote"
          value={pick.odds.toFixed(2)}
          tooltip={GLOSSARY.cote}
        />
        <KeyStat
          label="Notre estimation"
          value={`${(pick.model_probability * 100).toFixed(0)}%`}
          tooltip="Probabilité de victoire selon notre analyse (différente de celle du bookmaker)."
        />
        <KeyStat
          label="EV"
          value={`+${(pick.expected_value * 100).toFixed(1)}%`}
          tone="green"
          tooltip={GLOSSARY.ev}
        />
      </div>

      {/* Mise & gain */}
      <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-4">
        <div className="text-[10px] uppercase tracking-wider text-white/40 mb-3">
          {isPending ? "Mise & gains potentiels" : "Mise & résultat"}
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-[10px] text-white/50">Mise</div>
            <div className="text-lg font-bold tabular-nums">{stake.toFixed(2)} €</div>
          </div>
          {isPending && (
            <>
              <div>
                <div className="text-[10px] text-accent-green">Si gagné</div>
                <div className="text-lg font-bold tabular-nums text-accent-green">
                  +{potentialProfit.toFixed(2)} €
                </div>
                <div className="text-[10px] text-white/40">
                  (retour {potentialReturn.toFixed(2)} €)
                </div>
              </div>
              <div>
                <div className="text-[10px] text-accent-red">Si perdu</div>
                <div className="text-lg font-bold tabular-nums text-accent-red">
                  −{stake.toFixed(2)} €
                </div>
              </div>
            </>
          )}
          {isWin && (
            <>
              <div>
                <div className="text-[10px] text-accent-green">Gain réel</div>
                <div className="text-lg font-bold tabular-nums text-accent-green">
                  +{(pick.profit ?? potentialProfit).toFixed(2)} €
                </div>
              </div>
              <div>
                <div className="text-[10px] text-white/50">Retour total</div>
                <div className="text-lg font-bold tabular-nums">
                  {(stake + (pick.profit ?? potentialProfit)).toFixed(2)} €
                </div>
              </div>
            </>
          )}
          {isLoss && (
            <>
              <div>
                <div className="text-[10px] text-accent-red">Perte</div>
                <div className="text-lg font-bold tabular-nums text-accent-red">
                  {(pick.profit ?? -stake).toFixed(2)} €
                </div>
              </div>
              <div>
                <div className="text-[10px] text-white/50">Retour</div>
                <div className="text-lg font-bold tabular-nums">0.00 €</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Détail des jambes du combiné (si applicable) */}
      {pick.legs && pick.legs.length > 0 && (
        <ComboLegs legs={pick.legs} unboostedOdds={pick.odds_unboosted} boostedOdds={pick.odds} />
      )}

      {/* Résumé en 1 phrase + analyse complète */}
      <ExpandableSection
        title="Analyse complète"
        icon="🧠"
        subtitle={`${pick.rationale.length} points d'analyse`}
        defaultOpen={variant === "today"}
      >
        <div className="text-sm text-white/80 leading-relaxed mb-3 pb-3 border-b border-white/5">
          <span className="text-accent-green font-semibold">Résumé :</span>{" "}
          Notre modèle estime que <strong>{pick.pick}</strong> a{" "}
          <strong>{(pick.model_probability * 100).toFixed(0)}% de chances</strong> de
          gagner, alors que le bookmaker n'en donne que{" "}
          <strong>{(pick.book_probability * 100).toFixed(0)}%</strong>. C'est ce qu'on
          appelle un <span className="text-accent-green">value bet</span> — la cote est
          plus élevée que la probabilité réelle.
        </div>
        <div className="space-y-2 text-sm text-white/70">
          {pick.rationale.map((r, i) => {
            // Détection des sections (lignes préfixées par ##)
            if (r.startsWith("##")) {
              return (
                <h4
                  key={i}
                  className="text-accent-green text-[11px] uppercase tracking-[0.2em] font-bold mt-4 first:mt-2 pb-1 border-b border-accent-green/20"
                >
                  {r.replace(/^##\s*/, "")}
                </h4>
              );
            }
            return (
              <div key={i} className="leading-relaxed pl-1 flex gap-2">
                <span className="text-accent-green/60 shrink-0">•</span>
                <span>{r}</span>
              </div>
            );
          })}
        </div>
      </ExpandableSection>

      {/* Guide pour débutants */}
      <ExpandableSection
        title="Tu débutes ? Lis ceci"
        icon="🎓"
        subtitle="Explication pas à pas"
        defaultOpen={false}
      >
        <ol className="space-y-3 text-sm text-white/70 list-decimal list-inside">
          <li>
            <strong className="text-white">Pari "Vainqueur"</strong> : tu paries que
            l'équipe choisie va gagner le match. Pas le score exact, juste qui gagne.
          </li>
          <li>
            <strong className="text-white">Cote {pick.odds.toFixed(2)}</strong> : pour
            1€ misé, le bookmaker te rendra {pick.odds.toFixed(2)} € si tu gagnes
            (dont {(pick.odds - 1).toFixed(2)} € de profit + ton 1€ initial).
          </li>
          <li>
            <strong className="text-white">
              Pourquoi cette cote est intéressante ?
            </strong>{" "}
            Le bookmaker estime que {pick.pick} a{" "}
            {(pick.book_probability * 100).toFixed(0)}% de chances. Notre analyse, qui
            tient compte d'éléments comme la forme récente, les blessures, le
            historique direct, donne{" "}
            {(pick.model_probability * 100).toFixed(0)}%. L'écart en notre faveur =
            opportunité.
          </li>
          <li>
            <strong className="text-white">Mise raisonnable</strong> : ne jamais miser
            plus de 5% de ta bankroll sur un seul pari. Pour 100€ de bankroll, 5€ max.
            Plus tu mises petit, plus tu absorbes les pertes.
          </li>
          <li>
            <strong className="text-white">EV (Expected Value)</strong> :{" "}
            +{(pick.expected_value * 100).toFixed(1)}% signifie qu'en moyenne, sur
            beaucoup de paris similaires, tu gagnerais{" "}
            {(pick.expected_value * 100).toFixed(1)}% de ta mise totale. Plus c'est
            haut, plus c'est intéressant — mais ça ne garantit jamais le résultat de
            CE pari spécifique.
          </li>
          {isPending && (
            <li>
              <strong className="text-white">Comment placer ce pari ?</strong> Va sur
              ton bookmaker préféré (Bwin, Unibet, Winamax…), cherche le match{" "}
              <em>{pick.home_team} vs {pick.away_team}</em>, sélectionne{" "}
              <em>"{pick.pick} vainqueur"</em>, mets ta mise, valide.
            </li>
          )}
        </ol>
      </ExpandableSection>

      {/* Pourquoi celui-ci ? — comparaison avec autres candidats */}
      {pick.comparison && (
        <ExpandableSection
          title="Pourquoi celui-ci ?"
          icon="🎯"
          subtitle={`${pick.comparison.matches_analyzed} matchs analysés aujourd'hui`}
          defaultOpen={false}
        >
          <p className="text-xs text-white/50 mb-3">
            Les top alternatives écartées et pourquoi :
          </p>
          <div className="space-y-2.5">
            {pick.comparison.top_alternatives.map((alt) => (
              <div
                key={alt.rank}
                className="bg-bg-elevated/40 border border-white/5 rounded-lg p-3"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white/40 text-xs font-mono">#{alt.rank}</span>
                    <span className="font-semibold text-sm">{alt.label}</span>
                  </div>
                  <span className="text-xs text-white/50 tabular-nums">
                    @ {alt.odds.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-white/50 mb-1.5">
                  <span className="bg-white/5 px-1.5 py-0.5 rounded">
                    edge {alt.edge}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded ${
                      alt.confidence === "High"
                        ? "bg-accent-green/15 text-accent-green"
                        : alt.confidence === "Medium"
                          ? "bg-accent-blue/15 text-accent-blue"
                          : "bg-white/5"
                    }`}
                  >
                    confidence {alt.confidence}
                  </span>
                </div>
                <p className="text-xs text-white/60 italic">↳ {alt.why_not}</p>
              </div>
            ))}
          </div>
        </ExpandableSection>
      )}

      {/* Boutons "Parier sur..." (pour pending uniquement) */}
      {isPending && (
        <section className="bg-bg-card border border-white/[0.06] rounded-2xl p-4">
          <div className="text-[10px] uppercase tracking-wider text-white/40 mb-3 text-center">
            ⚡ Placer ce pari
          </div>
          <div className="grid grid-cols-3 gap-2">
            <BookmakerButton
              name="bwin"
              url="https://sports.bwin.fr/fr/sports/baseball-23"
            />
            <BookmakerButton
              name="Winamax"
              url="https://www.winamax.fr/paris-sportifs/sports"
            />
            <BookmakerButton
              name="Unibet"
              url="https://www.unibet.fr/sport/baseball"
            />
          </div>
          <p className="text-[10px] text-white/30 text-center mt-2 leading-relaxed">
            Liens vers les bookmakers — cherche le match{" "}
            <em>{pick.home_team} vs {pick.away_team}</em> et place ton pari.
          </p>
        </section>
      )}

      {/* Bouton de partage (toujours visible) */}
      <ShareButton pick={pick} />

      {/* Sources */}
      {pick.sources && pick.sources.length > 0 && (
        <ExpandableSection
          title="Sources web vérifiées"
          icon="🔗"
          subtitle={`${pick.sources.length} articles consultés`}
          defaultOpen={false}
        >
          <ul className="space-y-2 text-xs">
            {pick.sources.map((s, i) => (
              <li key={i} className="truncate">
                <a
                  href={s}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-green hover:underline"
                >
                  {s.replace(/^https?:\/\//, "").slice(0, 60)}
                </a>
              </li>
            ))}
          </ul>
        </ExpandableSection>
      )}
    </div>
  );
}

// ============== Sous-composants ==============

function PendingBanner({ pick }: { pick: UnifiedPick }) {
  return (
    <div className="bg-gradient-to-r from-accent-green to-accent-greenDim text-bg-base rounded-2xl p-4 md:p-5 shadow-lg shadow-accent-green/20">
      <div className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-70 mb-1">
        ⚡ Pari à placer
      </div>
      <div className="text-2xl md:text-3xl font-black leading-none">
        {pick.pick} <span className="opacity-60 font-bold text-xl">VAINQUEUR</span>
      </div>
      <div className="text-xs md:text-sm mt-2 opacity-80 font-medium">
        Cote {pick.odds.toFixed(2)} ·{" "}
        {(pick.model_probability * 100).toFixed(0)}% de chances estimées
      </div>
    </div>
  );
}

function WinBanner({ pick }: { pick: UnifiedPick }) {
  return (
    <div className="bg-accent-green/10 border-2 border-accent-green/40 rounded-2xl p-4 md:p-5">
      <div className="flex items-center gap-2 text-accent-green text-[10px] uppercase tracking-[0.2em] font-bold mb-2">
        <span className="text-xl">✓</span> Pari gagné
      </div>
      {pick.result?.score_text && (
        <div className="text-xl md:text-2xl font-bold mb-2 tabular-nums">
          {pick.result.score_text}
        </div>
      )}
      {pick.result?.summary && (
        <p className="text-sm text-white/70 leading-relaxed">{pick.result.summary}</p>
      )}
      {pick.result?.bet_outcome && (
        <div className="mt-3 text-sm text-accent-green font-medium">
          {pick.result.bet_outcome}
        </div>
      )}
    </div>
  );
}

function LossBanner({ pick }: { pick: UnifiedPick }) {
  return (
    <div className="bg-accent-red/10 border-2 border-accent-red/40 rounded-2xl p-4 md:p-5">
      <div className="flex items-center gap-2 text-accent-red text-[10px] uppercase tracking-[0.2em] font-bold mb-2">
        <span className="text-xl">✕</span> Pari perdu
      </div>
      {pick.result?.score_text && (
        <div className="text-xl md:text-2xl font-bold mb-2 tabular-nums">
          {pick.result.score_text}
        </div>
      )}
      {pick.result?.summary && (
        <p className="text-sm text-white/70 leading-relaxed">{pick.result.summary}</p>
      )}
      {pick.result?.bet_outcome && (
        <div className="mt-3 text-sm text-accent-red font-medium">
          {pick.result.bet_outcome}
        </div>
      )}
    </div>
  );
}

function ComboLegs({
  legs,
  unboostedOdds,
  boostedOdds,
}: {
  legs: ComboLeg[];
  unboostedOdds?: number;
  boostedOdds: number;
}) {
  const boostDelta =
    unboostedOdds && unboostedOdds > 0
      ? ((boostedOdds - unboostedOdds) / unboostedOdds) * 100
      : 0;

  return (
    <div className="bg-bg-card border border-yellow-400/20 rounded-2xl overflow-hidden">
      <div className="bg-yellow-400/10 px-4 py-2.5 border-b border-yellow-400/20 flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-[0.2em] font-bold text-yellow-400">
          🎯 Combiné · {legs.length} jambes
        </div>
        <div className="text-[10px] text-white/50 tabular-nums">
          {unboostedOdds ? (
            <>
              <span className="line-through text-white/30">{unboostedOdds.toFixed(2)}</span>
              {" → "}
              <span className="text-yellow-400 font-bold">{boostedOdds.toFixed(2)}</span>
              {boostDelta > 0 && (
                <span className="text-yellow-400 ml-1">+{boostDelta.toFixed(0)}%</span>
              )}
            </>
          ) : (
            <span className="text-yellow-400 font-bold">{boostedOdds.toFixed(2)}</span>
          )}
        </div>
      </div>

      <div className="divide-y divide-white/5">
        {legs.map((leg, i) => (
          <LegRow key={i} leg={leg} index={i + 1} />
        ))}
      </div>

      <div className="bg-bg-base/40 px-4 py-2 text-[10px] text-white/40 text-center">
        Les 2 jambes doivent gagner pour valider le combiné
      </div>
    </div>
  );
}

function LegRow({ leg, index }: { leg: ComboLeg; index: number }) {
  const isWin = leg.outcome === "win";
  const isLoss = leg.outcome === "loss";
  const isPending = leg.outcome === "pending" || !leg.outcome;
  const emoji = SPORT_EMOJIS[leg.sport] || "🎯";
  const kickoffDate = new Date(leg.kickoff);
  const time = kickoffDate.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const day = kickoffDate.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  let outcomeColor = "text-white/40 bg-white/5 border-white/10";
  let outcomeLabel = "En attente";
  if (isWin) {
    outcomeColor = "text-accent-green bg-accent-green/10 border-accent-green/30";
    outcomeLabel = "✓ Gagné";
  } else if (isLoss) {
    outcomeColor = "text-accent-red bg-accent-red/10 border-accent-red/30";
    outcomeLabel = "✕ Perdu";
  } else if (isPending) {
    outcomeColor = "text-yellow-400 bg-yellow-400/10 border-yellow-400/30";
    outcomeLabel = "En attente";
  }

  return (
    <div className="px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-full bg-yellow-400/15 border border-yellow-400/30 flex items-center justify-center text-yellow-400 text-xs font-bold shrink-0">
          {index}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-base">{emoji}</span>
            <span className="text-[10px] uppercase tracking-wider text-white/50">
              {leg.league}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${outcomeColor}`}>
              {outcomeLabel}
            </span>
          </div>
          <div className="text-sm font-semibold mb-1">{leg.pick}</div>
          <div className="text-[11px] text-white/40 mb-1.5">
            {leg.home_team} vs {leg.away_team}
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-white/50">
              {day} · {time}
            </span>
            <span className="text-white/30">·</span>
            <span className="text-yellow-400 font-bold tabular-nums">
              cote {leg.odds.toFixed(2)}
            </span>
          </div>
          {leg.notes && (
            <div className="text-[11px] text-white/55 mt-2 leading-relaxed border-l-2 border-white/10 pl-2">
              {leg.notes}
            </div>
          )}
          {leg.result?.score_text && (
            <div className="text-[11px] text-white/70 mt-2 font-medium tabular-nums">
              Score : {leg.result.score_text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KeyStat({
  label,
  value,
  tooltip,
  tone,
}: {
  label: string;
  value: string;
  tooltip?: string;
  tone?: "green" | "red";
}) {
  const [open, setOpen] = useState(false);
  const toneClass =
    tone === "green" ? "text-accent-green" : tone === "red" ? "text-accent-red" : "text-white";
  return (
    <div className="bg-bg-card border border-white/[0.06] rounded-xl p-3 md:p-4 relative">
      <div className="flex items-center gap-1 text-[10px] md:text-xs uppercase tracking-wider text-white/40">
        <span>{label}</span>
        {tooltip && (
          <button
            onClick={() => setOpen(!open)}
            className="w-3.5 h-3.5 rounded-full border border-white/20 text-white/40 text-[9px] flex items-center justify-center hover:bg-white/10"
            aria-label="Définition"
          >
            ?
          </button>
        )}
      </div>
      <div className={`text-base md:text-xl font-semibold mt-1 tabular-nums ${toneClass}`}>
        {value}
      </div>
      {open && tooltip && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-bg-elevated border border-white/10 rounded-lg p-2 text-[11px] text-white/70 leading-relaxed z-10 shadow-xl">
          {tooltip}
        </div>
      )}
    </div>
  );
}

function ExpandableSection({
  title,
  icon,
  subtitle,
  defaultOpen,
  children,
}: {
  title: string;
  icon: string;
  subtitle?: string;
  defaultOpen: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="bg-bg-card border border-white/[0.06] rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition text-left"
      >
        <span className="text-xl">{icon}</span>
        <div className="flex-1">
          <div className="font-semibold text-sm">{title}</div>
          {subtitle && <div className="text-xs text-white/40">{subtitle}</div>}
        </div>
        <span className={`text-white/40 transition-transform ${open ? "rotate-90" : ""}`}>
          ›
        </span>
      </button>
      {open && <div className="px-4 pb-4 pt-1">{children}</div>}
    </section>
  );
}

function ShareButton({ pick }: { pick: UnifiedPick }) {
  const [shared, setShared] = useState(false);

  function build(): { title: string; text: string; url: string } {
    const title = `WTF · Pick du ${new Date(pick.date).toLocaleDateString("fr-FR")}`;
    let text = "";
    if (pick.outcome === "win" && pick.result) {
      text = `✅ Pari gagné : ${pick.pick} (cote ${pick.odds.toFixed(2)}). ${pick.result.score_text || ""} Profit +${(pick.profit ?? 0).toFixed(2)}€. WTF — l'IA qui prédit, tu gagnes.`;
    } else if (pick.outcome === "loss") {
      text = `Pick du ${new Date(pick.date).toLocaleDateString("fr-FR")} : ${pick.pick} @ ${pick.odds.toFixed(2)} — perdu cette fois. Mais transparence 100% : suis tous nos picks sur WTF.`;
    } else {
      text = `🎯 Pari du jour WTF : ${pick.pick} @ ${pick.odds.toFixed(2)} · EV +${(pick.expected_value * 100).toFixed(0)}%. L'IA qui prédit. Découvre l'analyse complète.`;
    }
    return {
      title,
      text,
      url: typeof window !== "undefined" ? window.location.href : "",
    };
  }

  async function onShare() {
    const data = build();
    if (typeof navigator !== "undefined" && (navigator as Navigator & { share?: (d: ShareData) => Promise<void> }).share) {
      try {
        await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share(data);
      } catch {
        /* user cancelled */
      }
    } else {
      // Fallback : copie dans le presse-papier
      const combined = `${data.text}\n${data.url}`;
      try {
        await navigator.clipboard.writeText(combined);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      } catch {
        /* ignore */
      }
    }
  }

  return (
    <button
      onClick={onShare}
      className="w-full py-3 rounded-2xl bg-bg-card border border-white/[0.06] hover:border-accent-green/40 transition flex items-center justify-center gap-2 text-sm font-medium"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-accent-green">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
      </svg>
      <span>{shared ? "✓ Lien copié" : "Partager ce pick"}</span>
    </button>
  );
}

function BookmakerButton({ name, url }: { name: string; url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-bg-elevated border border-white/10 hover:border-accent-green/40 rounded-lg py-2.5 text-center text-sm font-semibold transition"
    >
      {name} ↗
    </a>
  );
}

// Adapter une HistoryPick au type unifié
export function pickFromHistory(p: HistoryPick): UnifiedPick {
  return {
    date: p.date,
    sport: p.match.sport,
    league: p.match.league,
    home_team: p.match.home_team,
    away_team: p.match.away_team,
    kickoff: p.match.kickoff,
    pick: p.pick,
    odds: p.odds,
    odds_unboosted: p.odds_unboosted,
    model_probability: p.model_probability,
    book_probability: p.book_probability,
    expected_value: p.expected_value,
    headline: p.headline,
    rationale: p.rationale,
    sources: p.sources,
    stake: p.stake,
    outcome: p.outcome,
    profit: p.profit,
    result: p.result ?? undefined,
    comparison: p.comparison,
    profile_tags: p.profile_tags,
    legs: p.legs,
  };
}

// Adapter un SafePick (today.json) au type unifié
export function pickFromSafe(p: SafePick): UnifiedPick {
  return {
    date: p.kickoff.slice(0, 10),
    sport: p.sport,
    league: p.league,
    home_team: p.home_team,
    away_team: p.away_team,
    kickoff: p.kickoff,
    pick: p.pick,
    odds: p.odds,
    odds_unboosted: p.odds_unboosted,
    model_probability: p.model_probability,
    book_probability: p.book_probability,
    expected_value: p.expected_value,
    headline: p.headline,
    rationale: p.rationale,
    sources: p.sources,
    stake: p.stake,
    outcome: "pending",
    comparison: p.comparison,
    profile_tags: p.profile_tags,
    legs: p.legs,
  };
}
