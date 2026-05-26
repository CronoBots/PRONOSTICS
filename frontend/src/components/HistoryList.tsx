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
      day = { date: p.date, dayName, dayNum, profit: 0, allPending: true, picks: [] };
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

function StatusBar({ outcome }: { outcome: HistoryPick["outcome"] }) {
  const { t } = useI18n();
  let bg = "bg-white/5";
  let text = "text-white/40";
  let label = t("history.outcomeNone");
  if (outcome === "win") {
    bg = "bg-accent-green/15";
    text = "text-accent-green";
    label = t("history.outcomeWin");
  } else if (outcome === "loss") {
    bg = "bg-accent-red/15";
    text = "text-accent-red";
    label = t("history.outcomeLoss");
  } else if (outcome === "pending") {
    bg = "bg-white/[0.07]";
    text = "text-white/50";
    label = t("history.outcomePending");
  } else if (outcome === "void") {
    bg = "bg-accent-blue/15";
    text = "text-accent-blue";
    label = t("history.outcomeVoid");
  }
  return (
    <div
      className={`${bg} ${text} flex items-center justify-center px-2 rounded-r-xl self-stretch min-w-[28px]`}
    >
      <span
        className="text-[10px] font-semibold tracking-wider uppercase"
        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
      >
        {label}
      </span>
    </div>
  );
}

function BetRow({ pick, onClick }: { pick: HistoryPick; onClick: () => void }) {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const router = useRouter();
  const isPremium = !!user?.isPremium;
  const isPending = pick.outcome === "pending";
  const isLocked = isPending && !isPremium;
  const emoji = SPORT_EMOJIS[pick.match.sport] || "🎯";
  const isCombo = pick.match.sport === "combo" && pick.legs && pick.legs.length > 0;
  const time = pick.match.kickoff
    ? new Date(pick.match.kickoff).toLocaleTimeString(localeForLang(lang), {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  return (
    <button
      onClick={() => (isLocked ? router.push("/premium") : onClick())}
      className="w-full flex items-stretch bg-bg-elevated/40 border border-white/[0.06] rounded-xl overflow-hidden text-left hover:border-accent-green/30 transition"
    >
      <div className="flex items-center justify-center px-2 text-white/30 text-lg">⋮</div>
      <div className="flex-1 py-3 pr-2 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className="text-[11px] font-mono text-white/70 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">
            {time}
          </span>
          <span
            className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded border ${
              isCombo
                ? "text-yellow-400 bg-yellow-400/10 border-yellow-400/30"
                : "text-accent-blue bg-accent-blue/10 border-accent-blue/20"
            }`}
          >
            {isCombo ? t("history.combinedLegs", { n: pick.legs!.length }) : t("history.simple")}
          </span>
          <span className="text-[10px] font-semibold tracking-wider uppercase bg-bg-base border border-white/10 text-white/75 px-2 py-0.5 rounded">
            Unibet BE
          </span>
          {isCombo && pick.odds_unboosted && (
            <span className="text-[10px] text-yellow-400/80 font-semibold">
              {t("history.boostFromTo")} <span className="line-through text-white/30">{pick.odds_unboosted.toFixed(2)}</span> → {pick.odds.toFixed(2)}
            </span>
          )}
        </div>

        {/* Gating Premium pour un pick PENDING (les équipes révéleraient le pari) */}
        {isLocked ? (
          <div className="mt-1 flex items-center gap-2 bg-bg-base/40 border border-yellow-400/20 rounded-lg px-2.5 py-2">
            <span className="text-lg">🔒</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium leading-tight">
                {t("status.pendingLockedTitle")}
              </div>
              <div className="text-[10px] text-white/40 mt-0.5">
                {t("status.pendingLockedHint")} · {t("status.cote")} {pick.odds.toFixed(2)}
              </div>
            </div>
          </div>
        ) : isCombo ? (
          <div className="space-y-1.5 mt-1">
            {pick.legs!.map((leg, i) => (
              <ComboLegMini key={i} leg={leg} index={i + 1} />
            ))}
            <div className="text-[10px] text-white/40 mt-1.5 flex items-center gap-2">
              <span className="text-yellow-400 font-bold tabular-nums">
                {t("history.totalOdds", { odds: pick.odds.toFixed(2) })}
              </span>
              <span>·</span>
              <span>{t("history.bothMustWin")}</span>
            </div>
          </div>
        ) : (
          <>
            <div className="text-sm font-medium truncate flex items-center gap-1.5">
              <span>{emoji}</span>
              <span>{pick.pick}</span>
              <span className="text-white/40 text-xs ml-1">@ {pick.odds.toFixed(2)}</span>
            </div>
            <div className="text-[11px] text-white/40 truncate mt-0.5">
              {pick.match.home_team} vs {pick.match.away_team}
            </div>
          </>
        )}
      </div>
      <StatusBar outcome={pick.outcome} />
    </button>
  );
}

function ComboLegMini({ leg, index }: { leg: import("@/lib/types").ComboLeg; index: number }) {
  const emoji = SPORT_EMOJIS[leg.sport] || "🎯";
  const isWin = leg.outcome === "win";
  const isLoss = leg.outcome === "loss";

  let statusDot = "bg-yellow-400";
  let statusText = "text-white/70";
  if (isWin) {
    statusDot = "bg-accent-green";
    statusText = "text-accent-green";
  } else if (isLoss) {
    statusDot = "bg-accent-red";
    statusText = "text-accent-red";
  }

  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot}`} />
      <span className="text-white/50 tabular-nums">#{index}</span>
      <span className="text-base shrink-0">{emoji}</span>
      <span className={`font-medium truncate ${statusText}`}>{leg.pick}</span>
      <span className="text-white/40 ml-auto tabular-nums shrink-0">
        @ {leg.odds.toFixed(2)}
      </span>
    </div>
  );
}

function DayCard({ day, onPickClick }: { day: DayBucket; onPickClick: (p: HistoryPick) => void }) {
  return (
    <div className="bg-bg-card border border-white/[0.06] rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05]">
        <div className="font-semibold">
          <span className="capitalize">{day.dayName}</span> {day.dayNum}
        </div>
        <ProfitChip profit={day.profit} pending={day.allPending} />
      </div>
      <div className="p-3 space-y-2">
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
  const { user, ready } = useAuth();
  const { t } = useI18n();
  const { months: monthNames, days: dayNames } = useDateLabels();
  const isPremium = ready && user?.isPremium;
  // Paris en attente : visibles uniquement par les Premium (gated comme /today).
  // Les non-Premium voient une carte teaser "Pick du jour réservé Premium".
  const visiblePicks = isPremium
    ? picks
    : picks.filter((p) => p.outcome !== "pending");
  const months = useMemo(
    () => groupHierarchical(visiblePicks, monthNames, dayNames),
    [visiblePicks, monthNames, dayNames],
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
