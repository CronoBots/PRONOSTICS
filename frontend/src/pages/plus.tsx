import { useEffect, useState } from "react";
import Head from "next/head";

import { Header } from "@/components/Header";
import { StakeSimulator } from "@/components/StakeSimulator";
import { fetchHistory } from "@/lib/dataSource";
import { History } from "@/lib/types";

export default function PlusPage() {
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
  const startingBankroll = history?.stats?.starting_bankroll ?? 1000;

  return (
    <>
      <Head>
        <title>Plus — PRONOSTICS</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-10">
        <Header title="Plus" stats={history?.stats} />

        {loading && <div className="text-white/50 text-sm py-12 text-center">Chargement…</div>}

        {!loading && history && (
          <div className="space-y-6">
            <StakeSimulator
              picks={picks}
              defaultStake={10}
              defaultStartingBankroll={startingBankroll}
            />

            <section className="bg-bg-card border border-white/[0.06] rounded-2xl p-5 shadow-card">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-white/70 mb-3">
                Comment ça marche
              </h3>
              <ul className="text-sm text-white/60 space-y-2 list-disc list-inside">
                <li>
                  1 pick safe par jour, analysé manuellement par Claude (recherche web,
                  croisement de sources, identification du value bet le plus fiable).
                </li>
                <li>Cible : cote ≥ 2.00 + probabilité estimée &gt; probabilité bookmaker.</li>
                <li>
                  Site statique GitHub Pages → entièrement gratuit, mis à jour à chaque push.
                </li>
                <li>Source : github.com/CronoBots/PRONOSTICS</li>
              </ul>
            </section>

            <section className="bg-bg-card border border-white/[0.06] rounded-2xl p-5 shadow-card">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-white/70 mb-3">
                Mentions
              </h3>
              <p className="text-xs text-white/50 leading-relaxed">
                Contenu informatif uniquement. Les paris sportifs comportent un risque
                de perte financière ; ne pariez que ce que vous pouvez vous permettre
                de perdre. Mineurs interdits. Pour de l'aide : Joueurs Info Service 09 74 75 13 13
                (appel non surtaxé).
              </p>
              <p className="text-[11px] text-white/30 mt-3">
                Dernière mise à jour :{" "}
                {history.generated_at
                  ? new Date(history.generated_at).toLocaleString("fr-FR")
                  : "—"}
              </p>
            </section>
          </div>
        )}
      </main>
    </>
  );
}
