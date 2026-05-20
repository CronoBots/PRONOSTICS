import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";

import { BankrollChart } from "@/components/BankrollChart";
import { fetchHistory } from "@/lib/dataSource";
import { History } from "@/lib/types";

type Period = "1j" | "1s" | "1m" | "1a";

const PERIODS: Period[] = ["1j", "1s", "1m", "1a"];

export default function Home() {
  const [history, setHistory] = useState<History | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("1m");

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

  const stats = history?.stats;
  const picks = history?.picks ?? [];
  const startingBankroll = stats?.starting_bankroll ?? 5;

  // Stats à afficher : ne compter que les paris RÉGLÉS (pas le pending)
  const settledCount = stats ? stats.won + stats.lost : 0;

  return (
    <>
      <Head>
        <title>PRONOSTICS — Pick safe du jour</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="max-w-md mx-auto px-4 md:px-6 pt-6 pb-6">
        {/* Header compact style bet-analytix */}
        <header className="flex items-center justify-between mb-5">
          <button className="w-9 h-9 rounded-full flex items-center justify-center text-accent-blue hover:bg-white/5">
            ←
          </button>
          <Link href="/today" className="flex items-center gap-1.5 font-bold">
            <span>Claude IA</span>
            <span className="w-5 h-5 rounded-full bg-accent-blue/20 text-accent-blue flex items-center justify-center text-xs">
              ›
            </span>
          </Link>
          <Link
            href="/compte"
            className="w-9 h-9 rounded-full flex items-center justify-center text-accent-blue hover:bg-white/5"
            aria-label="Menu"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
              <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </Link>
        </header>

        {loading && <div className="text-white/50 text-sm py-12 text-center">Chargement…</div>}

        {!loading && history && (
          <div className="space-y-4">
            {/* Chart hero vert avec filtres temporels intégrés */}
            <section className="relative">
              <BankrollChart picks={picks} startingBankroll={startingBankroll} variant="hero" />
              <div className="absolute top-3 right-3">
                <button className="w-9 h-9 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white">
                  ⋯
                </button>
              </div>
              {/* Filter pills */}
              <div className="absolute bottom-3 left-3 right-3 flex gap-2 overflow-x-auto">
                {PERIODS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-4 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition ${
                      period === p
                        ? "bg-white text-accent-green border-white"
                        : "bg-transparent text-white border-white/60 hover:bg-white/10"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <Link
                  href="/filtres"
                  className="px-4 py-1.5 rounded-full text-xs font-medium border bg-transparent text-white border-white/60 hover:bg-white/10 whitespace-nowrap"
                >
                  Filtres
                </Link>
              </div>
            </section>

            {/* 2 boutons Analyzer / Calendrier */}
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/analyzer"
                className="bg-bg-card border border-white/[0.06] rounded-2xl py-4 flex items-center justify-center gap-2 hover:border-accent-green/30 transition"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-accent-blue">
                  <circle cx="12" cy="12" r="9" />
                  <path strokeLinecap="round" d="M12 3v9l6 4" />
                </svg>
                <span className="font-medium">Analyzer</span>
              </Link>
              <Link
                href="/calendrier"
                className="bg-bg-card border border-white/[0.06] rounded-2xl py-4 flex items-center justify-center gap-2 hover:border-accent-green/30 transition"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-accent-blue">
                  <rect x="3" y="4" width="18" height="17" rx="2" />
                  <path strokeLinecap="round" d="M3 9h18M8 2v4M16 2v4" />
                </svg>
                <span className="font-medium">Calendrier</span>
              </Link>
            </div>

            {/* 4 stat tiles */}
            {stats && (
              <div className="grid grid-cols-2 gap-3">
                <StatTile label="PARIS" value={`${settledCount}`} tone="blue" />
                <StatTile
                  label="BÉNÉFICE"
                  value={`${stats.profit > 0 ? "+" : ""}${stats.profit.toFixed(2)}€`}
                  tone={stats.profit >= 0 ? "green" : "red"}
                />
                <StatTile
                  label="ROI"
                  value={`${stats.roi_percent > 0 ? "+" : ""}${stats.roi_percent.toFixed(2)}%`}
                  tone={stats.roi_percent >= 0 ? "green" : "red"}
                />
                <StatTile
                  label="PROGRESSION"
                  value={`${stats.progression_percent > 0 ? "+" : ""}${stats.progression_percent.toFixed(2)}%`}
                  tone={stats.progression_percent >= 0 ? "green" : "red"}
                />
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "blue" | "green" | "red";
}) {
  const colorClass =
    tone === "blue" ? "text-accent-blue" : tone === "red" ? "text-accent-red" : "text-accent-green";
  return (
    <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-5 relative">
      <div className="absolute top-3 right-3 w-5 h-5 rounded-full border border-white/15 text-white/30 text-[10px] flex items-center justify-center">
        ?
      </div>
      <div className="text-xs uppercase tracking-wider text-white/50 text-center mt-1">
        {label}
      </div>
      <div
        className={`text-3xl md:text-4xl font-bold tabular-nums text-center mt-3 ${colorClass}`}
      >
        {value}
      </div>
    </div>
  );
}
