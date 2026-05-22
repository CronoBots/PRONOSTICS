import { ReactNode, useState } from "react";

import { localeForLang, useI18n } from "@/lib/i18n";
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

function fmtKickoff(iso: string, locale: string) {
  return new Date(iso).toLocaleString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PickDetail({ pick, variant = "today" }: Props) {
  const { t, lang } = useI18n();
  const locale = localeForLang(lang);
  const isPending = pick.outcome === "pending" || pick.outcome === undefined;
  const isWin = pick.outcome === "win";
  const isLoss = pick.outcome === "loss";
  const stake = pick.stake ?? 5;
  const potentialProfit = stake * (pick.odds - 1);
  const potentialReturn = stake * pick.odds;

  const GLOSSARY: Record<string, string> = {
    cote: t("pickDetail.glossaryCote"),
    ev: t("pickDetail.glossaryEv"),
    edge: t("pickDetail.glossaryEdge"),
    era: t("pickDetail.glossaryEra"),
    whip: t("pickDetail.glossaryWhip"),
  };

  return (
    <div className="space-y-5">
      {/* Headline punchy en haut */}
      {pick.headline && (
        <div className="bg-accent-green/10 border-l-4 border-accent-green rounded-r-xl px-4 py-3">
          <div className="text-[10px] uppercase tracking-wider text-accent-green/80 font-semibold mb-1">
            {t("pickDetail.headlineLabel")}
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
          <span className="capitalize">{fmtKickoff(pick.kickoff, locale)}</span>
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
          label={t("pick.cote")}
          value={pick.odds.toFixed(2)}
          tooltip={GLOSSARY.cote}
        />
        <KeyStat
          label={t("pickDetail.estimation")}
          value={`${(pick.model_probability * 100).toFixed(0)}%`}
          tooltip={t("pickDetail.estimationTooltip")}
        />
        <KeyStat
          label={t("today.ev")}
          value={`+${(pick.expected_value * 100).toFixed(1)}%`}
          tone="green"
          tooltip={GLOSSARY.ev}
        />
      </div>

      {/* Mise & gain */}
      <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-4">
        <div className="text-[10px] uppercase tracking-wider text-white/40 mb-3">
          {isPending ? t("pickDetail.stakeAndPotential") : t("pickDetail.stakeAndResult")}
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-[10px] text-white/50">{t("pick.stake")}</div>
            <div className="text-lg font-bold tabular-nums">{stake.toFixed(2)} €</div>
          </div>
          {isPending && (
            <>
              <div>
                <div className="text-[10px] text-accent-green">{t("pick.ifWon")}</div>
                <div className="text-lg font-bold tabular-nums text-accent-green">
                  +{potentialProfit.toFixed(2)} €
                </div>
                <div className="text-[10px] text-white/40">
                  ({t("pick.return")} {potentialReturn.toFixed(2)} €)
                </div>
              </div>
              <div>
                <div className="text-[10px] text-accent-red">{t("pick.ifLost")}</div>
                <div className="text-lg font-bold tabular-nums text-accent-red">
                  −{stake.toFixed(2)} €
                </div>
              </div>
            </>
          )}
          {isWin && (
            <>
              <div>
                <div className="text-[10px] text-accent-green">{t("pickDetail.realGain")}</div>
                <div className="text-lg font-bold tabular-nums text-accent-green">
                  +{(pick.profit ?? potentialProfit).toFixed(2)} €
                </div>
              </div>
              <div>
                <div className="text-[10px] text-white/50">{t("pickDetail.totalReturn")}</div>
                <div className="text-lg font-bold tabular-nums">
                  {(stake + (pick.profit ?? potentialProfit)).toFixed(2)} €
                </div>
              </div>
            </>
          )}
          {isLoss && (
            <>
              <div>
                <div className="text-[10px] text-accent-red">{t("pickDetail.loss")}</div>
                <div className="text-lg font-bold tabular-nums text-accent-red">
                  {(pick.profit ?? -stake).toFixed(2)} €
                </div>
              </div>
              <div>
                <div className="text-[10px] text-white/50">{t("pickDetail.returnLabel")}</div>
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
        title={t("pickDetail.fullAnalysis")}
        icon="🧠"
        subtitle={t("pickDetail.analysisPoints", { n: pick.rationale.length })}
        defaultOpen={variant === "today"}
      >
        <div className="text-sm text-white/80 leading-relaxed mb-3 pb-3 border-b border-white/5">
          <span className="text-accent-green font-semibold">{t("pickDetail.summary")}</span>{" "}
          {t("pickDetail.modelEstimatesPrefix")} <strong>{pick.pick}</strong> {t("pickDetail.hasChances")}{" "}
          <strong>{t("pickDetail.chancesToWin", { percent: (pick.model_probability * 100).toFixed(0) })}</strong>{" "}
          {t("pickDetail.toWin")}{" "}
          <strong>{(pick.book_probability * 100).toFixed(0)}%</strong>
          {t("pickDetail.thatIsCalled")}{" "}
          <span className="text-accent-green">{t("pickDetail.valueBet")}</span>{" "}
          {t("pickDetail.oddsHigher")}
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
        title={t("pickDetail.beginnersTitle")}
        icon="🎓"
        subtitle={t("pickDetail.beginnersSubtitle")}
        defaultOpen={false}
      >
        <ol className="space-y-3 text-sm text-white/70 list-decimal list-inside">
          <li>
            <strong className="text-white">{t("pickDetail.beg1strong")}</strong>
            {t("pickDetail.beg1")}
          </li>
          <li>
            <strong className="text-white">
              {t("pickDetail.beg2strong", { odds: pick.odds.toFixed(2) })}
            </strong>
            {t("pickDetail.beg2", {
              odds: pick.odds.toFixed(2),
              profit: (pick.odds - 1).toFixed(2),
            })}
          </li>
          <li>
            <strong className="text-white">{t("pickDetail.beg3strong")}</strong>{" "}
            {t("pickDetail.beg3", {
              pick: pick.pick,
              bookPct: (pick.book_probability * 100).toFixed(0),
              modelPct: (pick.model_probability * 100).toFixed(0),
            })}
          </li>
          <li>
            <strong className="text-white">{t("pickDetail.beg4strong")}</strong>
            {t("pickDetail.beg4")}
          </li>
          <li>
            <strong className="text-white">{t("pickDetail.beg5strong")}</strong>
            {t("pickDetail.beg5", { ev: (pick.expected_value * 100).toFixed(1) })}
          </li>
          {isPending && (
            <li>
              <strong className="text-white">{t("pickDetail.beg6strong")}</strong>{" "}
              {t("pickDetail.beg6", {
                match: `${pick.home_team} vs ${pick.away_team}`,
                pick: pick.pick,
              })}
            </li>
          )}
        </ol>
      </ExpandableSection>

      {/* Pourquoi celui-ci ? — comparaison avec autres candidats */}
      {pick.comparison && (
        <ExpandableSection
          title={t("pickDetail.whyThisOne")}
          icon="🎯"
          subtitle={t("pickDetail.matchesAnalyzed", { n: pick.comparison.matches_analyzed })}
          defaultOpen={false}
        >
          <p className="text-xs text-white/50 mb-3">
            {t("pickDetail.alternativesIntro")}
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
                    {t("pickDetail.edge")} {alt.edge}
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
                    {t("pickDetail.confidence")} {alt.confidence}
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
            {t("pickDetail.placeBet")}
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
            {t("pickDetail.bookmakerHint", { match: `${pick.home_team} vs ${pick.away_team}` })}
          </p>
        </section>
      )}

      {/* Bouton de partage (toujours visible) */}
      <ShareButton pick={pick} />

      {/* Sources */}
      {pick.sources && pick.sources.length > 0 && (
        <ExpandableSection
          title={t("pickDetail.sourcesTitle")}
          icon="🔗"
          subtitle={t("pickDetail.sourcesSubtitle", { n: pick.sources.length })}
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
  const { t } = useI18n();
  return (
    <div className="bg-gradient-to-r from-accent-green to-accent-greenDim text-bg-base rounded-2xl p-4 md:p-5 shadow-lg shadow-accent-green/20">
      <div className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-70 mb-1">
        {t("pickDetail.pendingBanner")}
      </div>
      <div className="text-2xl md:text-3xl font-black leading-none">
        {pick.pick} <span className="opacity-60 font-bold text-xl">{t("pickDetail.winnerSuffix")}</span>
      </div>
      <div className="text-xs md:text-sm mt-2 opacity-80 font-medium">
        {t("pickDetail.coteEstimated", {
          odds: pick.odds.toFixed(2),
          percent: (pick.model_probability * 100).toFixed(0),
        })}
      </div>
    </div>
  );
}

function WinBanner({ pick }: { pick: UnifiedPick }) {
  const { t } = useI18n();
  const profit = pick.profit ?? 0;
  return (
    <div className="relative bg-gradient-to-br from-accent-green/15 to-accent-green/5 border-2 border-accent-green/40 rounded-2xl p-4 md:p-5 overflow-hidden">
      {/* Mini confetti decoratifs */}
      <span aria-hidden className="absolute top-2 right-3 text-2xl">🎉</span>
      <span aria-hidden className="absolute top-6 right-10 text-base opacity-60">✨</span>
      <span aria-hidden className="absolute top-3 right-16 text-sm opacity-40">⭐</span>

      <div className="flex items-center gap-2 text-accent-green text-[10px] uppercase tracking-[0.2em] font-bold mb-2">
        <span className="text-2xl">✓</span> {t("pickDetail.wonBanner")}
        {profit > 0 && (
          <span className="ml-auto text-accent-green text-base font-extrabold normal-case tabular-nums">
            +{profit.toFixed(2)}€
          </span>
        )}
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
  const { t } = useI18n();
  const loss = pick.profit ?? 0;
  return (
    <div className="bg-gradient-to-br from-accent-red/10 to-bg-card border-2 border-accent-red/40 rounded-2xl p-4 md:p-5">
      <div className="flex items-center gap-2 text-accent-red text-[10px] uppercase tracking-[0.2em] font-bold mb-2">
        <span className="text-xl">✕</span> {t("pickDetail.lostBanner")}
        {loss < 0 && (
          <span className="ml-auto text-accent-red text-base font-extrabold normal-case tabular-nums">
            {loss.toFixed(2)}€
          </span>
        )}
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
      {/* Lesson learned / empathy footer */}
      <div className="mt-3 pt-3 border-t border-white/5 text-[11px] text-white/50 italic leading-relaxed">
        {t("pickDetail.lessonLearned")}
      </div>
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
  const { t } = useI18n();
  const boostDelta =
    unboostedOdds && unboostedOdds > 0
      ? ((boostedOdds - unboostedOdds) / unboostedOdds) * 100
      : 0;

  return (
    <div className="bg-bg-card border border-yellow-400/20 rounded-2xl overflow-hidden">
      <div className="bg-yellow-400/10 px-4 py-2.5 border-b border-yellow-400/20 flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-[0.2em] font-bold text-yellow-400">
          {t("pickDetail.comboTitle", { n: legs.length })}
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
        {t("pickDetail.comboBothWin")}
      </div>
    </div>
  );
}

function LegRow({ leg, index }: { leg: ComboLeg; index: number }) {
  const { t, lang } = useI18n();
  const locale = localeForLang(lang);
  const isWin = leg.outcome === "win";
  const isLoss = leg.outcome === "loss";
  const isPending = leg.outcome === "pending" || !leg.outcome;
  const emoji = SPORT_EMOJIS[leg.sport] || "🎯";
  const kickoffDate = new Date(leg.kickoff);
  const time = kickoffDate.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
  const day = kickoffDate.toLocaleDateString(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  let outcomeColor = "text-white/40 bg-white/5 border-white/10";
  let outcomeLabel = t("pickDetail.legWaiting");
  if (isWin) {
    outcomeColor = "text-accent-green bg-accent-green/10 border-accent-green/30";
    outcomeLabel = t("pickDetail.legWon");
  } else if (isLoss) {
    outcomeColor = "text-accent-red bg-accent-red/10 border-accent-red/30";
    outcomeLabel = t("pickDetail.legLost");
  } else if (isPending) {
    outcomeColor = "text-yellow-400 bg-yellow-400/10 border-yellow-400/30";
    outcomeLabel = t("pickDetail.legWaiting");
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
              {t("pickDetail.legCote", { odds: leg.odds.toFixed(2) })}
            </span>
          </div>
          {leg.notes && (
            <div className="text-[11px] text-white/55 mt-2 leading-relaxed border-l-2 border-white/10 pl-2">
              {leg.notes}
            </div>
          )}
          {leg.result?.score_text && (
            <div className="text-[11px] text-white/70 mt-2 font-medium tabular-nums">
              {t("pickDetail.legScore", { score: leg.result.score_text })}
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
  const { t } = useI18n();
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
            aria-label={t("pickDetail.definition")}
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
  const { t, lang } = useI18n();
  const locale = localeForLang(lang);
  const [shared, setShared] = useState(false);

  function build(): { title: string; text: string; url: string } {
    const dateStr = new Date(pick.date).toLocaleDateString(locale);
    const title = t("pickDetail.shareTitle", { date: dateStr });
    let text = "";
    if (pick.outcome === "win" && pick.result) {
      text = t("pickDetail.shareWinText", {
        pick: pick.pick,
        odds: pick.odds.toFixed(2),
        score: pick.result.score_text || "",
        profit: (pick.profit ?? 0).toFixed(2),
      });
    } else if (pick.outcome === "loss") {
      text = t("pickDetail.shareLossText", {
        date: dateStr,
        pick: pick.pick,
        odds: pick.odds.toFixed(2),
      });
    } else {
      text = t("pickDetail.sharePendingText", {
        pick: pick.pick,
        odds: pick.odds.toFixed(2),
        ev: (pick.expected_value * 100).toFixed(0),
      });
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
      <span>{shared ? t("pickDetail.shareLinkCopied") : t("pickDetail.share")}</span>
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
