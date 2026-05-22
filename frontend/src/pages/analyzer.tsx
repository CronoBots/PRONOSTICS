import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";

import { AnalyzerGeneral } from "@/components/AnalyzerGeneral";
import { AnalyzerPeriode } from "@/components/AnalyzerPeriode";
import { AnalyzerSport } from "@/components/AnalyzerSport";
import { fetchHistory } from "@/lib/dataSource";
import { History } from "@/lib/types";

type Tab = "general" | "periode" | "sport";

const TABS: { id: Tab; label: string }[] = [
  { id: "general", label: "Général" },
  { id: "periode", label: "Période" },
  { id: "sport", label: "Sport" },
];

export default function AnalyzerPage() {
  const [history, setHistory] = useState<History | null>(null);
  const [tab, setTab] = useState<Tab>("general");
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
        <title>Analyses — WTF</title>
      </Head>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-10">
        <div className="flex items-center gap-3 mb-4">
          <Link
            href="/"
            className="w-9 h-9 rounded-full bg-bg-card border border-white/5 flex items-center justify-center text-white/60 hover:text-white transition"
            aria-label="Retour"
          >
            ←
          </Link>
          <h1 className="text-lg font-bold tracking-tight">Analyses</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5 overflow-x-auto -mx-1 px-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition border ${
                tab === t.id
                  ? "bg-accent-green/15 border-accent-green/40 text-accent-green"
                  : "bg-bg-card border-white/[0.06] text-white/60 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="text-white/40 text-sm py-12 text-center animate-fade-in">
            <div className="inline-block w-6 h-6 border-2 border-accent-green border-t-transparent rounded-full animate-spin mb-3" />
            <div>Chargement des analyses…</div>
          </div>
        )}

        {!loading && history && (
          <div>
            {tab === "general" && <AnalyzerGeneral picks={picks} />}
            {tab === "periode" && <AnalyzerPeriode picks={picks} />}
            {tab === "sport" && <AnalyzerSport picks={picks} />}
          </div>
        )}
      </main>
    </>
  );
}
