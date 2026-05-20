import { useEffect, useState } from "react";
import Head from "next/head";

import { MatchCard } from "@/components/MatchCard";
import { SportFilter } from "@/components/SportFilter";
import { fetchMatches } from "@/lib/dataSource";
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
  const [matches, setMatches] = useState<Match[]>([]);
  const [supportedSports, setSupportedSports] = useState<string[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchMatches(date, activeSport, minConfidence)
      .then((res) => {
        if (cancelled) return;
        setMatches(res.matches);
        setSupportedSports(res.supportedSports);
        setGeneratedAt(res.generatedAt);
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
  }, [date, activeSport, minConfidence]);

  return (
    <>
      <Head>
        <title>PRONOSTICS — Pronostics sportifs du jour</title>
        <meta
          name="description"
          content="Pronostics sportifs quotidiens propulsés par l'analyse statistique"
        />
      </Head>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Pronostics du jour
          </h1>
          <p className="text-white/60 mt-1">
            Analyse statistique des matchs : forme, classement, h2h, cotes — tous sports confondus.
          </p>
          {generatedAt && (
            <p className="text-white/40 text-xs mt-2">
              Dernière mise à jour : {new Date(generatedAt).toLocaleString("fr-FR")}
            </p>
          )}
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
          </div>

          <SportFilter
            sports={supportedSports}
            active={activeSport}
            onChange={setActiveSport}
          />
        </section>

        {loading && <p className="text-white/50">Chargement…</p>}
        {error && <p className="text-rose-400">Erreur : {error}</p>}

        {!loading && !error && matches.length === 0 && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center text-white/60">
            <p>Pas de pronostics pour cette date.</p>
            <p className="text-sm mt-2">
              Le workflow <code className="text-brand-100">daily-update</code> doit avoir
              généré le fichier <code>data/predictions/{date}.json</code>. Tu peux le déclencher
              manuellement depuis l'onglet Actions sur GitHub.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {matches.map((m) => (
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
