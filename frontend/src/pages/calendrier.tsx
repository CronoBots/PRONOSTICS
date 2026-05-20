import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";

import { fetchHistory } from "@/lib/dataSource";
import { buildMonthGrid, DayCell, WEEKDAY_LABELS } from "@/lib/stats";
import { History } from "@/lib/types";

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

export default function CalendrierPage() {
  const [history, setHistory] = useState<History | null>(null);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [monthIdx, setMonthIdx] = useState(today.getMonth());

  useEffect(() => {
    let cancelled = false;
    fetchHistory().then((h) => {
      if (cancelled) return;
      setHistory(h);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const grid = useMemo(() => {
    if (!history) return null;
    return buildMonthGrid(history.picks, year, monthIdx);
  }, [history, year, monthIdx]);

  function prevMonth() {
    if (monthIdx === 0) {
      setYear(year - 1);
      setMonthIdx(11);
    } else {
      setMonthIdx(monthIdx - 1);
    }
  }
  function nextMonth() {
    if (monthIdx === 11) {
      setYear(year + 1);
      setMonthIdx(0);
    } else {
      setMonthIdx(monthIdx + 1);
    }
  }
  function goToday() {
    setYear(today.getFullYear());
    setMonthIdx(today.getMonth());
  }

  return (
    <>
      <Head>
        <title>Calendrier — PRONOSTICS</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-10">
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/"
            className="w-9 h-9 rounded-full bg-bg-card border border-white/5 flex items-center justify-center text-white/60 hover:text-white transition"
            aria-label="Retour"
          >
            ←
          </Link>
          <h1 className="text-lg font-bold tracking-tight">Calendrier des bénéfices</h1>
        </div>

        {/* Nav mois */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <button
            onClick={prevMonth}
            className="w-10 h-10 rounded-xl bg-bg-card border border-white/[0.06] flex items-center justify-center text-white/70 hover:text-white"
            aria-label="Mois précédent"
          >
            ‹
          </button>
          <div className="flex-1 text-center bg-bg-card border border-white/[0.06] rounded-xl py-2.5 font-semibold capitalize">
            {MONTH_NAMES[monthIdx]} {year}
          </div>
          <button
            onClick={nextMonth}
            className="w-10 h-10 rounded-xl bg-bg-card border border-white/[0.06] flex items-center justify-center text-white/70 hover:text-white"
            aria-label="Mois suivant"
          >
            ›
          </button>
          <button
            onClick={goToday}
            className="px-3 h-10 rounded-xl bg-bg-card border border-white/[0.06] text-sm text-white/70 hover:text-white"
          >
            Aujourd'hui
          </button>
        </div>

        {loading && (
          <div className="text-white/50 text-sm py-12 text-center">Chargement…</div>
        )}

        {!loading && grid && (
          <>
            {/* Grille */}
            <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-3 shadow-card">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {WEEKDAY_LABELS.map((d, i) => (
                  <div
                    key={i}
                    className="text-center text-[11px] uppercase tracking-wider text-white/40 py-1"
                  >
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {grid.cells.map((c, i) => (
                  <DayCellTile key={`${c.date}-${i}`} cell={c} />
                ))}
              </div>
            </div>

            {/* Totaux du mois */}
            <div className="grid grid-cols-2 gap-3 mt-5">
              <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-4">
                <div className="text-[11px] uppercase tracking-wider text-white/40">
                  Bénéfice du mois
                </div>
                <div
                  className={`text-2xl font-bold mt-1 tabular-nums ${
                    grid.monthProfit > 0
                      ? "text-accent-green"
                      : grid.monthProfit < 0
                        ? "text-accent-red"
                        : "text-white/40"
                  }`}
                >
                  {grid.monthProfit > 0 ? "+" : ""}
                  {grid.monthProfit.toFixed(2)} €
                </div>
              </div>
              <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-4">
                <div className="text-[11px] uppercase tracking-wider text-white/40">
                  Paris du mois
                </div>
                <div className="text-2xl font-bold mt-1 tabular-nums text-accent-blue">
                  {grid.monthPicks}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}

function DayCellTile({ cell }: { cell: DayCell }) {
  const hasProfit = cell.inMonth && cell.profit !== 0;
  const positive = cell.profit > 0;
  const ring = cell.isToday ? "ring-2 ring-accent-blue/60" : "";

  let bg = "bg-transparent";
  let border = "border-transparent";
  if (hasProfit) {
    bg = positive ? "bg-accent-green/10" : "bg-accent-red/10";
    border = positive ? "border-accent-green/30" : "border-accent-red/30";
  }

  const opacity = cell.inMonth ? "opacity-100" : "opacity-30";

  return (
    <div
      className={`aspect-square rounded-lg border ${border} ${bg} ${ring} ${opacity} flex flex-col items-center justify-center text-sm`}
    >
      <span className={cell.inMonth ? "text-white/80" : "text-white/30"}>
        {cell.day}
      </span>
      {hasProfit && (
        <span
          className={`text-[10px] font-semibold tabular-nums ${
            positive ? "text-accent-green" : "text-accent-red"
          }`}
        >
          {positive ? "+" : ""}
          {Math.round(cell.profit)}€
        </span>
      )}
    </div>
  );
}
