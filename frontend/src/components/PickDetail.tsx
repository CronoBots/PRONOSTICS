import { ReactNode, useState } from "react";

import { HistoryPick, PickResult, SafePick, SPORT_EMOJIS, SPORT_LABELS } from "@/lib/types";

interface UnifiedPick {
  date: string;
  sport: string;
  league: string;
  home_team: string;
  away_team: string;
  kickoff: string;
  pick: string;
  odds: number;
  model_probability: number;
  book_probability: number;
  expected_value: number;
  rationale: string[];
  sources?: string[];
  stake?: number;
  outcome?: "win" | "loss" | "pending" | "void";
  profit?: number;
  result?: PickResult | null;
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
        <ul className="space-y-2 text-sm text-white/70">
          {pick.rationale.map((r, i) => (
            <li key={i} className="leading-relaxed">
              {r}
            </li>
          ))}
        </ul>
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
    model_probability: p.model_probability,
    book_probability: p.book_probability,
    expected_value: p.expected_value,
    rationale: p.rationale,
    sources: p.sources,
    stake: p.stake,
    outcome: p.outcome,
    profit: p.profit,
    result: p.result ?? undefined,
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
    model_probability: p.model_probability,
    book_probability: p.book_probability,
    expected_value: p.expected_value,
    rationale: p.rationale,
    sources: p.sources,
    stake: p.stake,
    outcome: "pending",
  };
}
