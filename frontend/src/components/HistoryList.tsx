import { useMemo, useState } from "react";

import { PickDetail, pickFromHistory } from "@/components/PickDetail";
import { HistoryPick, SPORT_EMOJIS, SPORT_LABELS } from "@/lib/types";

const MONTH_NAMES = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

const DAY_NAMES = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];

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
  picks: HistoryPick[];
}

interface WeekBucket {
  num: number;
  profit: number;
  days: DayBucket[];
}

interface MonthBucket {
  key: string;
  label: string;
  profit: number;
  weeks: WeekBucket[];
}

function groupHierarchical(picks: HistoryPick[]): MonthBucket[] {
  const monthsMap = new Map<string, MonthBucket>();

  const sorted = [...picks].sort((a, b) => b.date.localeCompare(a.date));

  for (const p of sorted) {
    const d = new Date(p.date + "T12:00:00Z");
    const monthKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const monthLabel = `${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
    const weekNum = getISOWeek(d);
    const dayName = DAY_NAMES[d.getUTCDay()];
    const dayNum = d.getUTCDate();

    const settled = p.outcome === "win" || p.outcome === "loss";
    const profit = settled ? p.profit : 0;

    let m = monthsMap.get(monthKey);
    if (!m) {
      m = { key: monthKey, label: monthLabel, profit: 0, weeks: [] };
      monthsMap.set(monthKey, m);
    }
    m.profit += profit;

    let w = m.weeks.find((x) => x.num === weekNum);
    if (!w) {
      w = { num: weekNum, profit: 0, days: [] };
      m.weeks.push(w);
    }
    w.profit += profit;

    let day = w.days.find((x) => x.date === p.date);
    if (!day) {
      day = { date: p.date, dayName, dayNum, profit: 0, picks: [] };
      w.days.push(day);
    }
    day.profit += profit;
    day.picks.push(p);
  }

  // Round profits + sort
  const months = Array.from(monthsMap.values());
  for (const m of months) {
    m.profit = round2(m.profit);
    m.weeks.sort((a, b) => b.num - a.num);
    for (const w of m.weeks) {
      w.profit = round2(w.profit);
      w.days.sort((a, b) => b.date.localeCompare(a.date));
      for (const d of w.days) {
        d.profit = round2(d.profit);
      }
    }
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

function ProfitChip({ profit, outcome }: { profit: number; outcome?: HistoryPick["outcome"] }) {
  let cls = "text-white/40 bg-white/5 border-white/10";
  if (profit > 0) cls = "text-accent-green bg-accent-green/10 border-accent-green/30";
  else if (profit < 0) cls = "text-accent-red bg-accent-red/10 border-accent-red/30";
  else if (outcome === "pending") cls = "text-white/40 bg-white/5 border-white/10";
  else cls = "text-accent-red bg-accent-red/5 border-accent-red/20";
  return (
    <span
      className={`text-xs font-semibold tabular-nums px-2.5 py-1 rounded-md border ${cls}`}
    >
      {fmtSigned(profit)}
    </span>
  );
}

function StatusBar({ outcome }: { outcome: HistoryPick["outcome"] }) {
  let bg = "bg-white/5";
  let text = "text-white/40";
  let label = "—";
  if (outcome === "win") {
    bg = "bg-accent-green/15";
    text = "text-accent-green";
    label = "Gagné";
  } else if (outcome === "loss") {
    bg = "bg-accent-red/15";
    text = "text-accent-red";
    label = "Perdu";
  } else if (outcome === "pending") {
    bg = "bg-white/[0.07]";
    text = "text-white/50";
    label = "En attente";
  } else if (outcome === "void") {
    bg = "bg-accent-blue/15";
    text = "text-accent-blue";
    label = "Remboursé";
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
  const emoji = SPORT_EMOJIS[pick.match.sport] || "🎯";
  const time = pick.match.kickoff
    ? new Date(pick.match.kickoff).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  return (
    <button
      onClick={onClick}
      className="w-full flex items-stretch bg-bg-elevated/40 border border-white/[0.06] rounded-xl overflow-hidden text-left hover:border-accent-green/30 transition"
    >
      <div className="flex items-center justify-center px-2 text-white/30 text-lg">⋮</div>
      <div className="flex-1 py-3 pr-2 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className="text-[11px] font-mono text-white/70 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">
            {time}
          </span>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-accent-blue bg-accent-blue/10 border border-accent-blue/20 px-2 py-0.5 rounded">
            Simple
          </span>
          <span className="text-[11px] font-bold italic bg-bg-base text-white px-2 py-0.5 rounded">
            b<span className="relative">w<span className="absolute -top-0.5 right-0 w-1 h-1 rounded-full bg-yellow-400" /></span>in
          </span>
        </div>
        <div className="text-sm font-medium truncate flex items-center gap-1.5">
          <span>{emoji}</span>
          <span>{pick.pick}</span>
          <span className="text-white/40 text-xs ml-1">@ {pick.odds.toFixed(2)}</span>
        </div>
        <div className="text-[11px] text-white/40 truncate mt-0.5">
          {pick.match.home_team} vs {pick.match.away_team}
        </div>
      </div>
      <StatusBar outcome={pick.outcome} />
    </button>
  );
}

function DayCard({ day, onPickClick }: { day: DayBucket; onPickClick: (p: HistoryPick) => void }) {
  return (
    <div className="bg-bg-card border border-white/[0.06] rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05]">
        <div className="font-semibold">
          <span className="capitalize">{day.dayName}</span> {day.dayNum}
        </div>
        <ProfitChip profit={day.profit} />
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
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between px-1 mb-2">
        <span className="text-white/50 text-sm">Semaine {week.num}</span>
        <ProfitChip profit={week.profit} />
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
      <ProfitChip profit={month.profit} />
    </div>
  );
}

interface Props {
  picks: HistoryPick[];
}

export function HistoryList({ picks }: Props) {
  // Masquer les paris en attente : ils sont affichés sur la page /today (Premium)
  const settled = picks.filter((p) => p.outcome !== "pending");
  const months = useMemo(() => groupHierarchical(settled), [settled]);
  const [openPick, setOpenPick] = useState<HistoryPick | null>(null);
  const currentMonthKey = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();

  if (months.length === 0) {
    return (
      <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-8 text-center text-white/50">
        Aucun pari pour le moment
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
                  Analyse du pari
                </span>
                <button
                  onClick={() => setOpenPick(null)}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white/60 hover:bg-white/5"
                  aria-label="Fermer"
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
