import { useEffect, useState } from "react";
import Head from "next/head";

import { BankrollChart } from "@/components/BankrollChart";
import { Header } from "@/components/Header";
import { StatsGrid } from "@/components/StatsGrid";
import { TodayPick } from "@/components/TodayPick";
import { fetchDay, fetchHistory } from "@/lib/dataSource";
import { DayPayload, History } from "@/lib/types";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function Home() {
  const [history, setHistory] = useState<History | null>(null);
  const [day, setDay] = useState<DayPayload | null>(null);
  const [date, setDate] = useState(todayIso());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchHistory(), fetchDay(date)]).then(([h, d]) => {
      if (cancelled) return;
      setHistory(h);
      setDay(d);
      if (!d?.safe_pick && h) {
        const lastPending = [...h.picks].reverse().find((p) => p.outcome === "pending");
        if (lastPending) setDate(lastPending.date);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [date]);

  const stats = history?.stats;
  const picks = history?.picks ?? [];
  const startingBankroll = stats?.starting_bankroll ?? 1000;

  return (
    <>
      <Head>
        <title>PRONOSTICS — Pick safe du jour</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-10">
        <Header title="PRONOSTICS" stats={stats} />

        {loading && <div className="text-white/50 text-sm py-12 text-center">Chargement…</div>}

        {!loading && history && (
          <div className="space-y-6 md:space-y-8">
            <TodayPick pick={day?.safe_pick ?? null} date={date} />

            {stats && <StatsGrid stats={stats} />}

            <section className="bg-bg-card border border-white/[0.06] rounded-2xl p-4 md:p-6 shadow-card">
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="text-sm md:text-base font-semibold uppercase tracking-wider text-white/70">
                  Évolution de la bankroll
                </h2>
                <span className="text-[11px] text-white/40">
                  Départ {startingBankroll.toFixed(0)} €
                </span>
              </div>
              <BankrollChart picks={picks} startingBankroll={startingBankroll} />
            </section>
          </div>
        )}
      </main>
    </>
  );
}
