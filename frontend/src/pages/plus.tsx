import { ReactNode, useEffect, useState } from "react";
import Head from "next/head";

import { Header } from "@/components/Header";
import { StakeSimulator } from "@/components/StakeSimulator";
import { fetchHistory } from "@/lib/dataSource";
import { History } from "@/lib/types";

function LexEntry({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="border-l-2 border-accent-green/40 pl-3">
      <dt className="font-semibold text-white/90 text-sm">{term}</dt>
      <dd className="text-white/55 text-[13px] leading-relaxed mt-0.5">{children}</dd>
    </div>
  );
}

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
              defaultStake={5}
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
              <h3 className="text-sm font-semibold uppercase tracking-wider text-white/70 mb-4">
                Lexique pour débutant
              </h3>
              <dl className="space-y-3 text-sm">
                <LexEntry term="Cote (décimale)">
                  Multiplicateur du gain. Cote 2.73 = pour 1€ misé tu récupères 2.73€ si
                  tu gagnes (donc 1.73€ de profit net + ta mise).
                </LexEntry>
                <LexEntry term="Cote boostée">
                  Promo du bookmaker qui augmente la cote normale (ex. bwin booste 2.10 →
                  2.73). Souvent limité à une petite mise et 1 fois par client.
                </LexEntry>
                <LexEntry term="Mise / Stake">
                  Combien tu paries (en €). Si tu perds, tu perds la mise. Si tu gagnes, tu
                  récupères mise × cote.
                </LexEntry>
                <LexEntry term="Gain potentiel">
                  Combien tu récupères au total si le pari gagne = mise × cote. Sur 5€ à
                  2.73 = 13.65€ retour (dont 8.65€ de profit net).
                </LexEntry>
                <LexEntry term="EV (Expected Value)">
                  Espérance de gain en %. EV +50% = sur 100€ misés au long terme tu
                  encaisses 50€ de profit. Positive = pari rentable statistiquement.
                </LexEntry>
                <LexEntry term="Value bet">
                  Pari où notre estimation de probabilité est plus haute que celle du
                  bookmaker. C'est là que se cache la rentabilité long-terme.
                </LexEntry>
                <LexEntry term="Probabilité bookmaker">
                  Déduite de la cote : 1 / cote. Cote 2.73 → 36.6%. Si la cote était
                  équitable cette probabilité serait juste, mais le bookmaker prend une
                  marge.
                </LexEntry>
                <LexEntry term="Bankroll">
                  Ton capital total dédié aux paris. À gérer comme un compte d'investissement
                  — ne JAMAIS y mettre l'argent du loyer.
                </LexEntry>
                <LexEntry term="ROI">
                  Return on Investment. (Bénéfice / Total misé) × 100. Mesure ton rendement
                  par euro misé.
                </LexEntry>
                <LexEntry term="Progression">
                  Variation de la bankroll par rapport au départ. 5€ → 25€ = +400%.
                </LexEntry>
                <LexEntry term="Drawdown">
                  Plus grosse baisse depuis un pic. Si ta bankroll passe de 25€ à 18€ puis
                  remonte à 30€, le drawdown max est 7€.
                </LexEntry>
                <LexEntry term="ERA (baseball)">
                  Earned Run Average. Points encaissés par un lanceur sur 9 manches. Plus
                  c'est bas mieux c'est. Élite &lt; 2.50, bon &lt; 3.50, mauvais &gt; 4.50.
                </LexEntry>
                <LexEntry term="WHIP (baseball)">
                  Walks + Hits per Inning Pitched. Combien de batteurs adverses arrivent
                  sur base par manche. Élite &lt; 1.10, mauvais &gt; 1.30.
                </LexEntry>
                <LexEntry term="H2H">
                  Head-to-Head. Historique des confrontations directes entre deux équipes
                  ou joueurs.
                </LexEntry>
              </dl>
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
