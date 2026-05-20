import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";

import { TodayPick } from "@/components/TodayPick";
import { fetchDay, fetchHistory } from "@/lib/dataSource";
import { DayPayload, History } from "@/lib/types";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function TodayPage() {
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

  return (
    <>
      <Head>
        <title>Pick du jour — PRONOSTICS</title>
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
          <h1 className="text-lg font-bold tracking-tight">Pick du jour</h1>
        </div>

        {loading && (
          <div className="text-white/50 text-sm py-12 text-center">Chargement…</div>
        )}

        {!loading && (
          <TodayPick pick={day?.safe_pick ?? null} date={date} />
        )}
      </main>
    </>
  );
}
