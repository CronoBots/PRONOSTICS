import { useMemo, useState } from "react";
import Head from "next/head";
import { useQuery } from "@apollo/client";

import { MatchCard } from "@/components/MatchCard";
import { SportFilter } from "@/components/SportFilter";
import { GET_DAILY_MATCHES } from "@/lib/queries";
import { Match } from "@/lib/types";

function today(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().substring(0, 10);
}

export default function Home() {
  const [activeSport, setActiveSport] = useState<string | null>(null);
  const [date, setDate] = useState<string>(today());
  const [minConfidence, setMinConfidence] = useState<number>(0);

  const { data, loading, error, refetch } = useQuery<{
    matches: Match[];
    supportedSports: string[];
  }>(GET_DAILY_MATCHES, {
    variables: { onDate: date, sport: activeSport, minConfidence },
  });

  const matches = data?.matches ?? [];
  const sortedMatches = useMemo(
    () => [...matches].sort((a, b) => {
      const ca = a.prediction?.confidence ?? 0;
      const cb = b.prediction?.confidence ?? 0;
      return cb - ca;
    }),
    [matches],
  );

  return (
    <>
      <Head>
        <title>PRONOSTICS — Pronostics sportifs du jour</title>
        <meta name="description" content="Pronostics sportifs quotidiens propulsés par l'analyse statistique" />
      </Head>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Pronostics du jour
          </h1>
          <p className="text-white/60 mt-1">
            Analyse statistique des matchs : forme, classement, h2h, cotes — tous sports confondus.
          </p>
        </header>

        <section className="space-y-4 mb-8">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-white/70">
              Date
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-md px-2 py-1 text-sm"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-white/70">
              Confiance min
              <input
                type="range"
                min="0"
                max="0.9"
                step="0.05"
                value={minConfidence}
                onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
              />
              <span className="text-white/50 w-10">{(minConfidence * 100).toFixed(0)}%</span>
            </label>
            <button
              onClick={() => refetch()}
              className="px-3 py-1.5 rounded-md bg-brand-600 hover:bg-brand-500 text-sm"
            >
              Rafraîchir
            </button>
          </div>

          <SportFilter
            sports={data?.supportedSports ?? []}
            active={activeSport}
            onChange={setActiveSport}
          />
        </section>

        {loading && <p className="text-white/50">Chargement…</p>}
        {error && (
          <p className="text-rose-400">
            Erreur : {error.message}. Vérifie que le backend tourne sur{" "}
            <code>http://localhost:8000/graphql</code>.
          </p>
        )}

        {!loading && !error && sortedMatches.length === 0 && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center text-white/60">
            <p>Pas de matchs pour cette sélection.</p>
            <p className="text-sm mt-2">
              Lance <code className="text-brand-100">python backend/scripts/daily_update.py</code>{" "}
              pour ingérer les pronostics du jour.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedMatches.map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </div>

        <footer className="mt-12 pt-6 border-t border-white/10 text-xs text-white/40 text-center">
          PRONOSTICS · données : API-Football, Football-Data.org, The Odds API — moteurs heuristiques v1
        </footer>
      </main>
    </>
  );
}
