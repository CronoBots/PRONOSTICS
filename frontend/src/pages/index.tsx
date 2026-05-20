import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";

import { BankrollChart, ChartMode } from "@/components/BankrollChart";
import { InfoSheet } from "@/components/InfoSheet";
import { HomeSkeleton } from "@/components/Skeleton";
import { fetchHistory } from "@/lib/dataSource";
import { History } from "@/lib/types";

type StatKey = "paris" | "benefice" | "roi" | "progression";

const STAT_INFOS: Record<
  StatKey,
  { title: string; body: React.ReactNode; note?: string }
> = {
  paris: {
    title: "Nombre de paris",
    body: <>Nombre total de paris que vous avez réalisés.</>,
    note: "Les paris avec un état \"En attente\" et \"Annulé\" ne sont pas comptabilisés.",
  },
  benefice: {
    title: "Bénéfice",
    body: (
      <>
        Calcul du bénéfice de votre bankroll :
        <br />
        <span className="text-accent-green font-semibold">
          (Total de vos gains − Total de vos mises) = Bénéfice
        </span>
      </>
    ),
    note: "Les paris avec un état \"En attente\" et \"Annulé\" ne sont pas comptabilisés.",
  },
  roi: {
    title: "ROI",
    body: (
      <>
        Le ROI (Return On Investment) mesure le rapport entre les bénéfices réalisés
        et le montant total des mises.
        <br />
        <span className="text-accent-green font-semibold">
          (Bénéfices / Mises totales) × 100 = ROI
        </span>
      </>
    ),
    note: "Les paris avec un état \"En attente\" et \"Annulé\" ne sont pas pris en compte.",
  },
  progression: {
    title: "Progression / ROC",
    body: (
      <>
        La progression est calculée selon le rapport entre les bénéfices réalisés et
        le capital de départ de la bankroll.
        <br />
        <span className="text-accent-green font-semibold">
          (Bénéfices / Capital de départ) × 100 = Progression
        </span>
      </>
    ),
  },
};

type Period = "1j" | "1s" | "1m" | "1a";

const PERIODS: Period[] = ["1j", "1s", "1m", "1a"];

interface ChartOptions {
  mode: ChartMode;
  showCLV: boolean;
  showValues: boolean;
}

export default function Home() {
  const router = useRouter();
  const [history, setHistory] = useState<History | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("1m");
  const [opts, setOpts] = useState<ChartOptions>({
    mode: "capital",
    showCLV: false,
    showValues: false,  // chart clean par défaut, activable via menu ⋯
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [hasFilters, setHasFilters] = useState(false);
  const [infoOpen, setInfoOpen] = useState<StatKey | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

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

  // Verrouille le scroll sur la Home (no-scroll par design)
  useEffect(() => {
    document.body.classList.add("lock-scroll");
    return () => {
      document.body.classList.remove("lock-scroll");
    };
  }, []);

  // Détecte si des filtres sont actifs (sauvegardés en localStorage)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("pronostics.filters");
      if (!raw) return;
      const obj = JSON.parse(raw);
      const active = Object.entries(obj).some(([k, v]) => {
        if (k === "live" || k === "free") return v !== "tous";
        return v && v !== "";
      });
      setHasFilters(active);
    } catch {
      /* ignore */
    }
  }, [router.asPath]);

  // Ferme le menu sur click extérieur
  useEffect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  function clearFilters() {
    try {
      localStorage.removeItem("pronostics.filters");
    } catch {
      /* ignore */
    }
    setHasFilters(false);
  }

  const stats = history?.stats;
  const picks = history?.picks ?? [];
  const startingBankroll = stats?.starting_bankroll ?? 5;
  const settledCount = stats ? stats.won + stats.lost : 0;

  return (
    <>
      <Head>
        <title>PRONOSTICS — Pick safe du jour</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
      </Head>

      <main
        className="max-w-md mx-auto px-4 md:px-6 pt-3 pb-2 flex flex-col"
        style={{
          // 100svh = small viewport height (stable, ne change pas avec
          // l'apparition du clavier). Variables --safe-* pinnées au load.
          height: "calc(100svh - 6.5rem - var(--safe-top) - var(--safe-bottom))",
        }}
      >
        {/* Header compact */}
        <header className="flex items-center justify-between mb-3 shrink-0">
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

        {loading && <HomeSkeleton />}

        {!loading && history && (
          <div className="flex-1 flex flex-col gap-3 min-h-0">
            {/* Chart + bouton ⋯ — flex-1 prend l'espace restant */}
            <section className="relative flex-1 min-h-[180px]">
              <BankrollChart
                picks={picks}
                startingBankroll={startingBankroll}
                variant="hero"
                mode={opts.mode}
                showValues={opts.showValues}
              />

              {/* Bouton ⋯ */}
              <div className="absolute top-3 right-3" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  className="w-9 h-9 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white"
                  aria-label="Options du graphique"
                >
                  ⋯
                </button>
                {menuOpen && (
                  <ChartOptionsMenu
                    opts={opts}
                    onChange={(next) => setOpts(next)}
                    onClose={() => setMenuOpen(false)}
                  />
                )}
              </div>
            </section>

            {/* Filter pills */}
            <div className="grid grid-cols-5 gap-1.5 shrink-0">
              {PERIODS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`py-1 rounded-full text-[11px] font-medium border transition text-center ${
                    period === p
                      ? "bg-bg-card text-accent-green border-accent-green"
                      : "bg-bg-card/60 text-white/70 border-white/10"
                  }`}
                >
                  {p}
                </button>
              ))}
              <Link
                href="/filtres"
                className="py-1 rounded-full text-[11px] font-medium border bg-bg-card/60 text-white/70 border-white/10 text-center"
              >
                Filtres
              </Link>
            </div>

            {/* Analyses / Calendrier */}
            <div className="grid grid-cols-2 gap-2 shrink-0">
              <Link
                href="/analyzer"
                className="bg-bg-card border border-white/[0.06] rounded-xl py-2.5 flex items-center justify-center gap-1.5"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-accent-blue">
                  <circle cx="12" cy="12" r="9" />
                  <path strokeLinecap="round" d="M12 3v9l6 4" />
                </svg>
                <span className="text-sm font-medium">Analyses</span>
              </Link>
              <Link
                href="/calendrier"
                className="bg-bg-card border border-white/[0.06] rounded-xl py-2.5 flex items-center justify-center gap-1.5"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-accent-blue">
                  <rect x="3" y="4" width="18" height="17" rx="2" />
                  <path strokeLinecap="round" d="M3 9h18M8 2v4M16 2v4" />
                </svg>
                <span className="text-sm font-medium">Calendrier</span>
              </Link>
            </div>

            {/* 4 stat tiles — pas de signe +/- */}
            {stats && (
              <div className="grid grid-cols-2 gap-2 shrink-0">
                <StatTile
                  label="PARIS"
                  value={`${settledCount}`}
                  tone="blue"
                  onInfo={() => setInfoOpen("paris")}
                />
                <StatTile
                  label="BÉNÉFICE"
                  value={`${Math.abs(stats.profit).toFixed(2)}€`}
                  tone={stats.profit >= 0 ? "green" : "red"}
                  onInfo={() => setInfoOpen("benefice")}
                />
                <StatTile
                  label="ROI"
                  value={`${Math.abs(stats.roi_percent).toFixed(2)}%`}
                  tone={stats.roi_percent >= 0 ? "green" : "red"}
                  onInfo={() => setInfoOpen("roi")}
                />
                <StatTile
                  label="PROGRESSION"
                  value={`${Math.abs(stats.progression_percent).toFixed(2)}%`}
                  tone={stats.progression_percent >= 0 ? "green" : "red"}
                  onInfo={() => setInfoOpen("progression")}
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* InfoSheet pour les ? des stats */}
      {infoOpen && (
        <InfoSheet
          title={STAT_INFOS[infoOpen].title}
          open={!!infoOpen}
          onClose={() => setInfoOpen(null)}
        >
          <p>{STAT_INFOS[infoOpen].body}</p>
          {STAT_INFOS[infoOpen].note && (
            <p className="text-white/50 text-xs">{STAT_INFOS[infoOpen].note}</p>
          )}
        </InfoSheet>
      )}

      {/* Chip flottante × Filtres (si filtres actifs) */}
      {hasFilters && (
        <button
          onClick={clearFilters}
          className="fixed bottom-24 right-4 z-30 bg-accent-red/90 text-white rounded-full pl-3 pr-4 py-2 shadow-lg flex items-center gap-1.5 hover:bg-accent-red"
        >
          <span className="text-sm">✕</span>
          <span className="text-sm font-semibold">Filtres</span>
        </button>
      )}
    </>
  );
}

function StatTile({
  label,
  value,
  tone,
  onInfo,
}: {
  label: string;
  value: string;
  tone: "blue" | "green" | "red";
  onInfo?: () => void;
}) {
  const colorClass =
    tone === "blue" ? "text-accent-blue" : tone === "red" ? "text-accent-red" : "text-accent-green";
  return (
    <div className="bg-bg-card border border-white/[0.06] rounded-2xl px-4 py-4 relative flex flex-col justify-center items-center">
      {onInfo && (
        <button
          onClick={onInfo}
          className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full border border-white/15 text-white/40 hover:text-white hover:border-white/30 text-[10px] flex items-center justify-center transition"
          aria-label={`Aide ${label}`}
        >
          ?
        </button>
      )}
      <div className="text-[11px] uppercase tracking-wider text-white/50 text-center">
        {label}
      </div>
      <div className={`text-2xl md:text-3xl font-bold tabular-nums text-center mt-1.5 ${colorClass}`}>
        {value}
      </div>
    </div>
  );
}

interface MenuProps {
  opts: ChartOptions;
  onChange: (next: ChartOptions) => void;
  onClose: () => void;
}

function ChartOptionsMenu({ opts, onChange }: MenuProps) {
  return (
    <div className="absolute top-11 right-0 z-30 w-60 rounded-2xl bg-bg-elevated/95 border border-white/10 shadow-2xl backdrop-blur overflow-hidden">
      <div className="px-4 pt-3 pb-1 text-[11px] uppercase tracking-wider text-white/40 font-semibold">
        Données du graphique
      </div>
      <MenuItem
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <circle cx="9" cy="12" r="6" />
            <path strokeLinecap="round" d="M15 12h6M18 9l3 3-3 3" />
          </svg>
        }
        label="Bénéfice"
        active={opts.mode === "benefice"}
        onClick={() => onChange({ ...opts, mode: "benefice" })}
      />
      <MenuItem
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l6-6 4 4 8-8" />
          </svg>
        }
        label="Capital"
        active={opts.mode === "capital"}
        onClick={() => onChange({ ...opts, mode: "capital" })}
      />
      <div className="px-4 pt-3 pb-1 text-[11px] uppercase tracking-wider text-white/40 font-semibold border-t border-white/5 mt-1">
        Options
      </div>
      <MenuItem
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4" />
          </svg>
        }
        label="CLV"
        active={opts.showCLV}
        onClick={() => onChange({ ...opts, showCLV: !opts.showCLV })}
      />
      <MenuItem
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path strokeLinecap="round" d="M4 9h16M4 15h16M10 3l-4 18M18 3l-4 18" />
          </svg>
        }
        label="Valeurs"
        active={opts.showValues}
        onClick={() => onChange({ ...opts, showValues: !opts.showValues })}
      />
    </div>
  );
}

function MenuItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 transition text-left ${
        active ? "bg-white/[0.06] text-white" : "text-white/70 hover:bg-white/[0.04]"
      }`}
    >
      <span className={active ? "text-accent-green" : "text-white/50"}>{icon}</span>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}
