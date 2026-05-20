import { useEffect, useState } from "react";
import Head from "next/head";

import { Header } from "@/components/Header";
import { HistoryList } from "@/components/HistoryList";
import { fetchHistory } from "@/lib/dataSource";
import { History } from "@/lib/types";

export default function ParisPage() {
  const [history, setHistory] = useState<History | null>(null);
  const [loading, setLoading] = useState(true);

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

  const picks = history?.picks ?? [];

  return (
    <>
      <Head>
        <title>Paris — PRONOSTICS</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-10">
        <Header title="Paris" stats={history?.stats} />

        {loading && <div className="text-white/50 text-sm py-12 text-center">Chargement…</div>}

        {!loading && history && (
          <div>
            <div className="flex items-baseline justify-between mb-3 px-1">
              <h2 className="text-sm md:text-base font-semibold uppercase tracking-wider text-white/70">
                Historique des paris
              </h2>
              <span className="text-[11px] text-white/40">
                {picks.length} pari{picks.length > 1 ? "s" : ""}
              </span>
            </div>
            <HistoryList picks={picks} />
          </div>
        )}
      </main>
    </>
  );
}
