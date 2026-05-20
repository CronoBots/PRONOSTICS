import { useEffect, useState } from "react";
import Head from "next/head";

import { BankrollChart } from "@/components/BankrollChart";
import { HistoryList } from "@/components/HistoryList";
import { StakeSimulator } from "@/components/StakeSimulator";
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([fetchHistory(), fetchDay(date)])
      .then(([h, d]) => {
        if (cancelled) return;
        setHistory(h);
        setDay(d);
        // Si pas de pick pour aujourd'hui, prendre le dernier pending de l'historique
        if (!d?.safe_pick && h) {
          const lastPending = [...h.picks]
            .reverse()
            .find((p) => p.outcome === "pending");
          if (lastPending) setDate(lastPending.date);
        }
        if (!h) setError("Aucun historique disponible.");
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [date]);

  const stats = history?.stats;
  const picks = history?.picks ?? [];
  const startingBankroll = stats?.starting_bankroll ?? 1000;
  const bankrollPositive = (stats?.current_bankroll ?? 0) >= startingBankroll;

  return (
    <>
      <Head>
        <title>PRONOSTICS — Pick safe du jour & bankroll tracker</title>
        <meta
          name="description"
          content="1 pronostic value bet par jour, cote ≥ 2.00, suivi de bankroll en temps réel et historique gagné/perdu."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-10">
        {/* Header */}
        <header className="mb-6 md:mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-accent-green/15 ring-1 ring-accent-green/30 flex items-center justify-center">
              <span className="text-accent-green text-lg md:text-xl font-bold">P</span>
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold tracking-tight">
                PRONOSTICS
              </h1>
              <p className="text-white/40 text-[11px] md:text-xs">
                1 value bet par jour · cote ≥ 2.00
              </p>
            </div>
          </div>
          {history && stats && (
            <div className="text-right">
              <div className="text-[10px] md:text-xs uppercase tracking-wider text-white/40">
                Bankroll
              </div>
              <div
                className={`text-xl md:text-2xl font-bold tabular-nums ${
                  bankrollPositive ? "text-accent-green" : "text-accent-red"
                }`}
              >
                {stats.current_bankroll.toFixed(2)} €
              </div>
            </div>
          )}
        </header>

        {loading && (
          <div className="text-white/50 text-sm py-12 text-center">Chargement…</div>
        )}

        {error && !loading && (
          <div className="bg-bg-card border border-accent-red/30 rounded-2xl p-6 text-white/70">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {!loading && history && (
          <div className="space-y-6 md:space-y-8">
            {/* 1. Pick du jour — au sommet, le plus visible */}
            <TodayPick pick={day?.safe_pick ?? null} date={date} />

            {/* 2. Stats principales */}
            {stats && <StatsGrid stats={stats} />}

            {/* 3. Graphique bankroll */}
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

            {/* 4. Historique — déplié par défaut */}
            <section>
              <div className="flex items-baseline justify-between mb-3 px-1">
                <h2 className="text-sm md:text-base font-semibold uppercase tracking-wider text-white/70">
                  Historique des paris
                </h2>
                <span className="text-[11px] text-white/40">
                  {picks.length} pari{picks.length > 1 ? "s" : ""}
                </span>
              </div>
              <HistoryList picks={picks} />
            </section>

            {/* 5. Simulateur */}
            <StakeSimulator
              picks={picks}
              defaultStake={10}
              defaultStartingBankroll={startingBankroll}
            />

            <footer className="pt-6 pb-2 text-xs text-white/30 text-center space-y-1">
              <p>
                Mis à jour :{" "}
                {history.generated_at
                  ? new Date(history.generated_at).toLocaleString("fr-FR")
                  : "—"}
              </p>
              <p className="max-w-md mx-auto pt-2">
                Contenu informatif. Les paris sportifs comportent un risque de perte ;
                ne pariez que ce que vous pouvez vous permettre de perdre.
              </p>
            </footer>
          </div>
        )}
      </main>
    </>
  );
}
