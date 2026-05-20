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
  const [date] = useState(todayIso());
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
        if (!h) {
          setError(
            "Aucun historique disponible. Le pipeline daily-update doit avoir tourné au moins une fois.",
          );
        }
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

  return (
    <>
      <Head>
        <title>PRONOSTICS — Pick safe du jour & bankroll tracker</title>
        <meta
          name="description"
          content="1 pronostic value bet par jour, tracking de bankroll en temps réel, historique gagné/perdu."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-10">
        <header className="mb-6 md:mb-8 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-accent-green" />
              <h1 className="text-xl md:text-2xl font-semibold">PRONOSTICS</h1>
            </div>
            <p className="text-white/40 text-xs md:text-sm mt-1">
              1 value bet par jour, cote ≥ 2.00 · bankroll tracker
            </p>
          </div>
          {history && (
            <div className="text-right">
              <div className="text-xs uppercase tracking-wider text-white/40">
                Bankroll
              </div>
              <div
                className={`text-xl md:text-2xl font-semibold ${
                  (stats?.current_bankroll ?? 0) >= startingBankroll
                    ? "text-accent-green"
                    : "text-accent-red"
                }`}
              >
                {stats?.current_bankroll.toFixed(2)} €
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
            <TodayPick pick={day?.safe_pick ?? null} date={date} />

            {stats && <StatsGrid stats={stats} />}

            <section className="bg-bg-card border border-white/5 rounded-2xl p-4 md:p-6 shadow-card">
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-base font-semibold">Évolution de la bankroll</h2>
                <span className="text-xs text-white/40">
                  Démarrée à {startingBankroll.toFixed(0)} €
                </span>
              </div>
              <BankrollChart
                picks={picks}
                startingBankroll={startingBankroll}
              />
            </section>

            <section>
              <h2 className="text-base font-semibold mb-3 px-1">Historique</h2>
              <HistoryList picks={picks} />
            </section>

            <StakeSimulator
              picks={picks}
              defaultStake={10}
              defaultStartingBankroll={startingBankroll}
            />

            <footer className="pt-6 pb-2 text-xs text-white/30 text-center">
              <p>
                Mis à jour : {history.generated_at ? new Date(history.generated_at).toLocaleString("fr-FR") : "—"}
              </p>
              <p className="mt-2 max-w-md mx-auto">
                Contenu informatif uniquement. Les paris sportifs comportent un risque
                de perte ; ne pariez que ce que vous pouvez vous permettre de perdre.
              </p>
            </footer>
          </div>
        )}
      </main>
    </>
  );
}
