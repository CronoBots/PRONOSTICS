import { useMemo, useState } from "react";
import { useRouter } from "next/router";

import { PickDetail, pickFromHistory } from "@/components/PickDetail";
import { useAuth } from "@/lib/auth";
import { localeForLang, useDateLabels, useI18n } from "@/lib/i18n";
import { HistoryPick, SPORT_EMOJIS } from "@/lib/types";

function getISOWeek(date: Date): number {
  const target = new Date(date.getTime());
  target.setHours(0, 0, 0, 0);
  target.setDate(target.getDate() + 3 - ((target.getDay() + 6) % 7));
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      (target.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000),
    )
  );
}

interface DayBucket {
  date: string;
  dayName: string;
  dayNum: number;
  monthName: string;
  profit: number;
  allPending: boolean;
  picks: HistoryPick[];
}

interface WeekBucket {
  num: number;
  profit: number;
  allPending: boolean;
  days: DayBucket[];
}

interface MonthBucket {
  key: string;
  label: string;
  profit: number;
  allPending: boolean;
  weeks: WeekBucket[];
}

function groupHierarchical(
  picks: HistoryPick[],
  monthNames: string[],
  dayNames: string[],
): MonthBucket[] {
  const monthsMap = new Map<string, MonthBucket>();

  const sorted = [...picks].sort((a, b) => b.date.localeCompare(a.date));

  for (const p of sorted) {
    const d = new Date(p.date + "T12:00:00Z");
    const monthKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const monthLabel = `${monthNames[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
    const weekNum = getISOWeek(d);
    const dayName = dayNames[d.getUTCDay()];
    const dayNum = d.getUTCDate();
    const monthName = monthNames[d.getUTCMonth()];

    const settled = p.outcome === "win" || p.outcome === "loss";
    const profit = settled ? p.profit : 0;

    let m = monthsMap.get(monthKey);
    if (!m) {
      m = { key: monthKey, label: monthLabel, profit: 0, allPending: true, weeks: [] };
      monthsMap.set(monthKey, m);
    }
    m.profit += profit;

    let w = m.weeks.find((x) => x.num === weekNum);
    if (!w) {
      w = { num: weekNum, profit: 0, allPending: true, days: [] };
      m.weeks.push(w);
    }
    w.profit += profit;

    let day = w.days.find((x) => x.date === p.date);
    if (!day) {
      day = { date: p.date, dayName, dayNum, monthName, profit: 0, allPending: true, picks: [] };
      w.days.push(day);
    }
    day.profit += profit;
    day.picks.push(p);
  }

  // Round profits + sort + compute allPending flags
  const months = Array.from(monthsMap.values());
  for (const m of months) {
    m.profit = round2(m.profit);
    m.weeks.sort((a, b) => b.num - a.num);
    let mAllPending = true;
    for (const w of m.weeks) {
      w.profit = round2(w.profit);
      w.days.sort((a, b) => b.date.localeCompare(a.date));
      let wAllPending = true;
      for (const d of w.days) {
        d.profit = round2(d.profit);
        d.allPending = d.picks.every((p) => p.outcome === "pending");
        if (!d.allPending) wAllPending = false;
      }
      w.allPending = wAllPending;
      if (!w.allPending) mAllPending = false;
    }
    m.allPending = mAllPending;
  }
  return months;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function fmtSigned(n: number): string {
  if (n === 0) return "0.00 €";
  return `${n > 0 ? "+" : ""}${n.toFixed(2)} €`;
}

function ProfitChip({
  profit,
  pending,
}: {
  profit: number;
  pending?: boolean;
}) {
  const { t } = useI18n();
  let cls = "text-white/40 bg-white/5 border-white/10";
  let label = fmtSigned(profit);
  if (pending) {
    label = t("history.inProgress");
    cls = "text-yellow-400 bg-yellow-400/10 border-yellow-400/30";
  } else if (profit > 0) {
    cls = "text-accent-green bg-accent-green/10 border-accent-green/30";
  } else if (profit < 0) {
    cls = "text-accent-red bg-accent-red/10 border-accent-red/30";
  }
  return (
    <span
      className={`text-xs font-semibold tabular-nums px-2.5 py-1 rounded-md border whitespace-nowrap ${cls}`}
    >
      {label}
    </span>
  );
}

function BetRow({ pick, onClick }: { pick: HistoryPick; onClick: () => void }) {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const router = useRouter();
  const isPremium = !!user?.isPremium;
  const isPending = pick.outcome === "pending";
  const isWin = pick.outcome === "win";
  const isLoss = pick.outcome === "loss";
  const isVoid = pick.outcome === "void";
  const isLocked = isPending && !isPremium;
  const emoji = SPORT_EMOJIS[pick.match.sport] || "🎯";
  const isCombo = pick.match.sport === "combo" && pick.legs && pick.legs.length > 0;

  // Bordure latérale colorée selon outcome
  const borderLeftClass = isWin
    ? "border-l-accent-green"
    : isLoss
      ? "border-l-accent-red"
      : isVoid
        ? "border-l-accent-blue"
        : "border-l-yellow-400/60";

  // Badge status texte (style Unibet "Gagné" / "Perdu" en couleur)
  const statusBadge = (() => {
    if (isWin)
      return {
        cls: "text-accent-green",
        icon: "✓",
        label: t("history.outcomeWin"),
      };
    if (isLoss)
      return {
        cls: "text-accent-red",
        icon: "✕",
        label: t("history.outcomeLoss"),
      };
    if (isVoid)
      return {
        cls: "text-accent-blue",
        icon: "○",
        label: t("history.outcomeVoid"),
      };
    return {
      cls: "text-yellow-300",
      icon: "⏳",
      label: t("history.outcomePending"),
    };
  })();

  // Couleur de la cote inline
  const oddsColorClass = isWin
    ? "text-accent-green"
    : isLoss
      ? "text-accent-red"
      : isVoid
        ? "text-accent-blue"
        : "text-white";

  // Heure seule : "13:00" — intégrée à la ligne du tournoi (la date est
  // déjà visible dans le header du jour "Lundi 25" qui groupe les paris).
  const kickoffDate = pick.match.kickoff ? new Date(pick.match.kickoff) : null;
  const timeLabel = kickoffDate
    ? kickoffDate.toLocaleTimeString(localeForLang(lang), {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  // Résultat (score brut) si réglé — privilégie score_home/score_away
  // plutôt que score_text qui peut contenir "Swiatek bat Jones 6-1 6-2"
  // (redondant avec le pari + le badge status). On extrait juste le chiffre.
  const resultText = (() => {
    const r = pick.result;
    if (!r) return null;
    const home = r.score_home;
    const away = r.score_away;
    const hasHome = home != null && String(home).length > 0;
    const hasAway = away != null && String(away).length > 0;
    if (hasHome && hasAway) return `${home}-${away}`;
    if (hasHome) return String(home); // tennis : score_home="6-3 7-6"
    if (r.score_text) {
      // Fallback : extrait la séquence de chiffres/tirets/espaces en fin
      // de texte. Ex "Swiatek bat Jones 6-1 6-2" → "6-1 6-2"
      const m = r.score_text.match(/[\d\s\-,()]+$/);
      if (m) {
        const trimmed = m[0].trim();
        if (trimmed.length >= 2) return trimmed;
      }
      return r.score_text;
    }
    return null;
  })();

  // Financier : mise → gain selon outcome
  const stake = pick.stake || 0;
  const potentialGain = stake * pick.odds - stake;
  const actualGain = pick.profit;
  const financialLine = (() => {
    if (stake <= 0) return null;
    const stakeFmt = `${stake.toFixed(2).replace(/\.00$/, "")} €`;
    if (isPending) {
      return {
        text: `${stakeFmt}  →  +${potentialGain.toFixed(2)} €`,
        cls: "text-yellow-300",
      };
    }
    if (isWin) {
      return {
        text: `${stakeFmt}  →  +${actualGain.toFixed(2)} €`,
        cls: "text-accent-green",
      };
    }
    if (isLoss) {
      return {
        text: `${stakeFmt}  →  ${actualGain.toFixed(2)} €`,
        cls: "text-accent-red",
      };
    }
    if (isVoid) {
      return {
        text: `${stakeFmt}  →  ${stakeFmt} (remboursé)`,
        cls: "text-accent-blue",
      };
    }
    return null;
  })();

  return (
    <button
      onClick={() => (isLocked ? router.push("/premium") : onClick())}
      className={`w-full block text-left transition-transform duration-100 ease-out active:scale-[0.99] hover:bg-white/[0.02] ${
        isCombo ? "" : `border-l-2 ${borderLeftClass} rounded-r-md`
      }`}
    >
      {isLocked ? (
        <div className="relative">
          {/* HEADER : icone cadenas + sport + nb jambes + Premium pill */}
          <div className="p-3.5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base">🔒</span>
              <div className="flex-1 min-w-0 text-sm text-white font-semibold truncate">
                {isCombo
                  ? t("history.combinedLegs", { n: pick.legs!.length })
                  : pick.match.sport.charAt(0).toUpperCase() + pick.match.sport.slice(1)}
              </div>
              <span className="shrink-0 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-yellow-500/15 border border-yellow-500/40 text-yellow-300">
                Premium
              </span>
            </div>
            <div className="text-xs text-white/55 mb-3">
              ⏱ {t("status.pendingLabel").replace("⏳ ", "")}
              {timeLabel && <span className="text-white/40"> · {timeLabel}</span>}
            </div>

            {/* Faux corps flouté avec lignes placeholder */}
            <div className="space-y-1.5 select-none filter blur-[6px] opacity-60 pointer-events-none">
              {(isCombo ? pick.legs! : [pick]).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-sm">🎾</span>
                  <div className="flex-1 h-3 rounded bg-white/15" />
                  <div className="w-10 h-3 rounded bg-white/15" />
                </div>
              ))}
            </div>
          </div>

          {/* Overlay CTA centré */}
          <div className="absolute inset-0 flex items-end justify-center pb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-500/15 border border-yellow-500/40 text-yellow-300 text-xs font-bold backdrop-blur-sm">
              <span>👑</span>
              <span>Débloquer avec Premium</span>
              <span className="text-yellow-300/60">→</span>
            </span>
          </div>
        </div>
      ) : (
        <div className="p-3.5 min-w-0">
          {/* HEADER : emoji + tournoi (toute la largeur) + status texte + chevron */}
          <div className="flex items-start gap-2 mb-1.5">
            <div className="flex-1 min-w-0 text-sm text-white font-semibold truncate">
              {emoji}{" "}
              {isCombo
                ? t("history.combinedLegs", { n: pick.legs!.length })
                : pick.match.league || pick.match.sport}
            </div>
            <span
              className={`shrink-0 text-xs font-bold tracking-wide whitespace-nowrap flex items-center gap-1 ${statusBadge.cls}`}
              aria-label={statusBadge.label}
            >
              <span className="text-sm leading-none">{statusBadge.icon}</span>
              <span>{statusBadge.label}</span>
            </span>
            <span className="shrink-0 text-white/30 text-base leading-none mt-0.5" aria-hidden>
              ›
            </span>
          </div>

          {/* MATCH + heure inline (subtle) */}
          {!isCombo && (
            <div className="text-xs text-white/55 truncate">
              {pick.match.home_team} vs {pick.match.away_team}
              {timeLabel && <span className="text-white/45"> · {timeLabel}</span>}
            </div>
          )}
          {isCombo && timeLabel && (
            <div className="text-xs text-white/55">{timeLabel}</div>
          )}

          {/* DIVIDER (omis pour combos — les bandes des legs ont leur propre top border full-bleed) */}
          {!isCombo && <div className="border-t border-white/[0.08] my-2" />}
          {isCombo && <div className="h-2" />}

          {/* BET (hero) : pari à gauche, cote à droite */}
          {isCombo ? (
            <div className="-mx-3.5 border-t border-white/[0.08]">
              {pick.legs!.map((leg, i) => (
                <ComboLegMini key={i} leg={leg} index={i + 1} />
              ))}
              <div className="border-t border-white/15">
                <div className="flex items-center justify-between gap-2 mx-3.5 py-3">
                  <span className="text-base font-bold text-white">
                    {t("history.totalOddsLabel")}
                  </span>
                  <span className={`text-xl font-extrabold tabular-nums ${oddsColorClass}`}>
                    {pick.odds.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            (() => {
              const parsed = parsePickLabel(pick.pick);
              return (
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-white truncate min-w-0">
                      {parsed.entity}
                    </span>
                    <span
                      className={`text-base font-bold tabular-nums whitespace-nowrap ${oddsColorClass}`}
                    >
                      {pick.odds.toFixed(2)}
                    </span>
                  </div>
                  {parsed.typeKey && (
                    <div className="text-[11px] text-white/55 mt-0.5">
                      {t(parsed.typeKey, parsed.typeParams)}
                    </div>
                  )}
                </div>
              );
            })()
          )}

          {/* FINANCIAL — 3 mini-stats pour les combos, ligne inline pour single */}
          {isCombo && stake > 0 ? (
            <FinancialStatsGrid
              stake={stake}
              odds={pick.odds}
              actualGain={actualGain}
              outcome={pick.outcome}
              resultText={resultText}
            />
          ) : (
            financialLine && (
              <div className={`text-xs font-semibold tabular-nums mt-1.5 ${financialLine.cls}`}>
                {financialLine.text}
                {resultText && (
                  <span className="text-white/45 font-normal">
                    {" · "}
                    {resultText}
                  </span>
                )}
              </div>
            )
          )}

          {isCombo && pick.odds_unboosted && (
            <div className="text-[11px] text-yellow-400/80 font-semibold mt-1">
              {t("history.boostFromTo")}{" "}
              <span className="line-through text-white/30">
                {pick.odds_unboosted.toFixed(2)}
              </span>{" "}
              → {pick.odds.toFixed(2)}
            </div>
          )}
        </div>
      )}
    </button>
  );
}

/** Parse a pick label into (picked entity, bet type) using regex
 *  heuristics. The type is returned as an i18n key + optional params,
 *  so the caller localises it via t(). Returns type=null when nothing
 *  recognisable matches — the caller skips the subtitle line. */
function parsePickLabel(
  pick: string,
): { entity: string; typeKey: string | null; typeParams?: Record<string, string | number> } {
  const trimmed = pick.trim();

  const mlMatch = trimmed.match(
    /^(.+?)\s+(vainqueur du match|vainqueur|gagne|gagnant|to win match|to win|wins match|wins)\s*$/i,
  );
  if (mlMatch) {
    return { entity: mlMatch[1].trim(), typeKey: "betType.matchWinner" };
  }

  const setsMatch = trimmed.match(
    /^(.+?)\s+(?:in|en)\s+(\d)\s+sets?(?:\s+(?:exactement|exactly))?$/i,
  );
  if (setsMatch) {
    return {
      entity: setsMatch[1].trim(),
      typeKey: "betType.winInSets",
      typeParams: { n: setsMatch[2] },
    };
  }

  const totMatch = trimmed.match(/(over|under|plus de|moins de)\s+([\d.]+)/i);
  if (totMatch) {
    const dir = /over|plus/i.test(totMatch[1]) ? "Over" : "Under";
    return { entity: `${dir} ${totMatch[2]}`, typeKey: "betType.totalGames" };
  }

  const hcpMatch = trimmed.match(/^(.+?)\s+([+-]\d+\.?\d*)\s*(jeux|games)?$/i);
  if (hcpMatch) {
    return {
      entity: `${hcpMatch[1].trim()} ${hcpMatch[2]}`,
      typeKey: "betType.handicap",
    };
  }

  if (/(\+|et|and)\s*(btts|les deux|both teams)/i.test(trimmed)) {
    return { entity: trimmed, typeKey: "betType.specialCombo" };
  }

  return { entity: trimmed, typeKey: null };
}

function FinancialStatsGrid({
  stake,
  odds,
  actualGain,
  outcome,
  resultText,
}: {
  stake: number;
  odds: number;
  actualGain: number;
  outcome: HistoryPick["outcome"];
  resultText: string | null;
}) {
  const { t } = useI18n();
  const totalReturn = stake * odds;
  const isPending = outcome === "pending";
  const isWin = outcome === "win";
  const isLoss = outcome === "loss";

  const gainText = isPending
    ? `+${(totalReturn - stake).toFixed(2)} €`
    : isWin
      ? `+${actualGain.toFixed(2)} €`
      : isLoss
        ? `${actualGain.toFixed(2)} €`
        : `±${(0).toFixed(2)} €`;
  const gainCls = isPending
    ? "text-yellow-300"
    : isWin
      ? "text-accent-green"
      : isLoss
        ? "text-accent-red"
        : "text-white/60";
  const returnText = isLoss ? `0.00 €` : `${totalReturn.toFixed(2)} €`;

  return (
    <div className="mt-3 pt-3 border-t border-white/[0.06]">
      <div className="grid grid-cols-3 gap-2">
        <FinancialStat label={t("history.stake")} value={`${stake.toFixed(2)} €`} />
        <FinancialStat label={t("history.return")} value={returnText} />
        <FinancialStat label={t("history.gain")} value={gainText} valueCls={gainCls} />
      </div>
      {resultText && (
        <div className="flex justify-center mt-3">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
              isWin
                ? "bg-accent-green/15 border-accent-green/35 text-accent-green"
                : isLoss
                  ? "bg-accent-red/15 border-accent-red/35 text-accent-red"
                  : "bg-white/[0.05] border-white/15 text-white/60"
            }`}
          >
            <span aria-hidden>{isWin ? "✓" : isLoss ? "✕" : "•"}</span>
            <span>{resultText}{!resultText.includes("jamb") ? " jambes" : ""}</span>
          </span>
        </div>
      )}
    </div>
  );
}

function FinancialStat({
  label,
  value,
  valueCls,
}: {
  label: string;
  value: string;
  valueCls?: string;
}) {
  return (
    <div className="text-center">
      <div className="text-[9px] uppercase tracking-wider text-white/40 font-semibold">
        {label}
      </div>
      <div className={`text-sm font-bold tabular-nums mt-0.5 ${valueCls ?? "text-white"}`}>
        {value}
      </div>
    </div>
  );
}

function ComboLegMini({ leg, index }: { leg: import("@/lib/types").ComboLeg; index: number }) {
  const emoji = SPORT_EMOJIS[leg.sport] || "🎯";
  const isWin = leg.outcome === "win";
  const isLoss = leg.outcome === "loss";
  const isVoid = leg.outcome === "void";

  const oddsColor = isWin
    ? "text-accent-green"
    : isLoss
      ? "text-accent-red"
      : isVoid
        ? "text-accent-blue"
        : "text-white";

  const { t } = useI18n();
  const { entity, typeKey, typeParams } = parsePickLabel(leg.pick);
  const matchup = `${leg.home_team} — ${leg.away_team}`;

  // Bloc statut coloré (style Unibet) : vert/rouge/bleu/jaune selon outcome
  // de la jambe individuelle, indépendant du combo global.
  const statusBg = isWin
    ? "bg-accent-green"
    : isLoss
      ? "bg-accent-red"
      : isVoid
        ? "bg-accent-blue"
        : "bg-yellow-500";
  const statusFg = isLoss || isVoid ? "text-white" : "text-bg-base";

  return (
    <div className="flex items-stretch border-t border-white/15 first:border-t-0">
      {/* Bande verticale pleine hauteur, flush bord gauche, couleur = statut leg */}
      <div
        className={`shrink-0 w-9 flex items-center justify-center ${statusBg}`}
        aria-label={`Jambe ${index} — ${leg.outcome}`}
      >
        <span className={`text-base font-extrabold tabular-nums ${statusFg}`}>
          {index}
        </span>
      </div>
      <div className="flex-1 min-w-0 flex items-start gap-2 py-2.5 pl-3 pr-3.5">
        <span className="shrink-0 text-sm mt-0.5">{emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-white truncate">{entity}</span>
            <span className={`shrink-0 text-sm font-bold tabular-nums ${oddsColor}`}>
              {leg.odds.toFixed(2)}
            </span>
          </div>
          {typeKey && (
            <div className="text-[11px] text-white/55 mt-0.5">
              {t(typeKey, typeParams)}
            </div>
          )}
          <div className="text-[11px] text-white/35 truncate mt-0.5">{matchup}</div>
        </div>
      </div>
    </div>
  );
}

function DayCard({ day, onPickClick }: { day: DayBucket; onPickClick: (p: HistoryPick) => void }) {
  return (
    <div className="bg-bg-card border border-white/[0.06] rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05]">
        <div className="font-semibold">
          <span className="capitalize">{day.dayName}</span> {day.dayNum}{" "}
          <span className="text-white/40 font-normal">{day.monthName}</span>
        </div>
        <ProfitChip profit={day.profit} pending={day.allPending} />
      </div>
      <div className="divide-y divide-white/[0.05]">
        {day.picks.map((p, i) => (
          <BetRow key={`${p.date}-${i}`} pick={p} onClick={() => onPickClick(p)} />
        ))}
      </div>
    </div>
  );
}

function WeekSection({
  week,
  onPickClick,
}: {
  week: WeekBucket;
  onPickClick: (p: HistoryPick) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between px-1 mb-2">
        <span className="text-white/50 text-sm">{t("history.week", { n: week.num })}</span>
        <ProfitChip profit={week.profit} pending={week.allPending} />
      </div>
      <div className="space-y-3">
        {week.days.map((d) => (
          <DayCard key={d.date} day={d} onPickClick={onPickClick} />
        ))}
      </div>
    </div>
  );
}

function MonthHeader({ month, current }: { month: MonthBucket; current: boolean }) {
  return (
    <div
      className={`flex items-center justify-between px-4 py-3.5 rounded-2xl border mb-5 ${
        current ? "border-accent-blue/50" : "border-white/[0.06]"
      }`}
    >
      <span className={`font-semibold capitalize ${current ? "text-accent-blue" : "text-white/80"}`}>
        {month.label}
      </span>
      <ProfitChip profit={month.profit} pending={month.allPending} />
    </div>
  );
}

interface Props {
  picks: HistoryPick[];
}

export function HistoryList({ picks }: Props) {
  const { t } = useI18n();
  const { months: monthNames, days: dayNames } = useDateLabels();
  // Paris en attente : VISIBLES par tout le monde dans la liste, mais
  // les non-Premium voient une carte teaser floutée "🔒 Pari du jour
  // en cours — détails réservés aux Premium" (logique gérée par BetRow
  // via isLocked = isPending && !isPremium). Le user a un signal qu'il
  // y a du contenu Premium aujourd'hui sans en révéler le détail.
  const months = useMemo(
    () => groupHierarchical(picks, monthNames, dayNames),
    [picks, monthNames, dayNames],
  );
  const [openPick, setOpenPick] = useState<HistoryPick | null>(null);
  const currentMonthKey = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();

  if (months.length === 0) {
    return (
      <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-8 text-center">
        <div className="text-5xl mb-3 opacity-40">📊</div>
        <p className="text-base font-semibold mb-1">{t("history.emptyTitle")}</p>
        <p className="text-sm text-white/50 leading-relaxed max-w-xs mx-auto">
          {t("history.emptyBody")}
        </p>
      </div>
    );
  }

  return (
    <div>
      {months.map((m) => (
        <section key={m.key} className="mb-6">
          <MonthHeader month={m} current={m.key === currentMonthKey} />
          {m.weeks.map((w) => (
            <WeekSection key={w.num} week={w} onPickClick={setOpenPick} />
          ))}
        </section>
      ))}

      {/* Modal détail */}
      {openPick && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm overflow-y-auto"
          onClick={() => setOpenPick(null)}
        >
          <div className="min-h-screen px-4 py-6 md:py-10 flex items-start justify-center">
            <div
              className="w-full max-w-2xl bg-bg-base border border-white/10 rounded-3xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-white/5 sticky top-0 bg-bg-base z-10 rounded-t-3xl">
                <span className="text-sm font-semibold text-white/70">
                  {t("history.betAnalysis")}
                </span>
                <button
                  onClick={() => setOpenPick(null)}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white/60 hover:bg-white/5"
                  aria-label={t("history.close")}
                >
                  ✕
                </button>
              </div>
              <div className="p-4 md:p-6">
                <PickDetail pick={pickFromHistory(openPick)} variant="past" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
