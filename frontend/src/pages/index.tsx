import { useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";

import { AnimatedNumber } from "@/components/AnimatedNumber";
import { BankrollChart, ChartMode } from "@/components/BankrollChart";
import { BrandBanner } from "@/components/BrandBanner";
import { InfoSheet } from "@/components/InfoSheet";
import { HomeSkeleton } from "@/components/Skeleton";
import { fetchDay, fetchHistory } from "@/lib/dataSource";
import { useI18n } from "@/lib/i18n";
import { History } from "@/lib/types";

type StatKey = "paris" | "benefice" | "roi" | "progression";

function useStatInfos() {
  const { t } = useI18n();
  return useMemo<
    Record<StatKey, { title: string; body: React.ReactNode; note?: string }>
  >(
    () => ({
      paris: {
        title: t("statInfo.paris.title"),
        body: <>{t("statInfo.paris.body")}</>,
        note: t("statInfo.paris.note"),
      },
      benefice: {
        title: t("statInfo.benefice.title"),
        body: (
          <>
            {t("statInfo.benefice.body")}
            <br />
            <span className="text-accent-green font-semibold">
              {t("statInfo.benefice.formula")}
            </span>
          </>
        ),
        note: t("statInfo.benefice.note"),
      },
      roi: {
        title: t("statInfo.roi.title"),
        body: (
          <>
            {t("statInfo.roi.body")}
            <br />
            <span className="text-accent-green font-semibold">
              {t("statInfo.roi.formula")}
            </span>
          </>
        ),
        note: t("statInfo.roi.note"),
      },
      progression: {
        title: t("statInfo.progression.title"),
        body: (
          <>
            {t("statInfo.progression.body")}
            <br />
            <span className="text-accent-green font-semibold">
              {t("statInfo.progression.formula")}
            </span>
          </>
        ),
      },
    }),
    [t],
  );
}

type Period = "1j" | "1s" | "1m" | "1a";

const PERIODS: Period[] = ["1j", "1s", "1m", "1a"];

interface ChartOptions {
  mode: ChartMode;
  showCLV: boolean;
  showValues: boolean;
}

export default function Home() {
  const router = useRouter();
  const { t } = useI18n();
  const statInfos = useStatInfos();
  const [history, setHistory] = useState<History | null>(null);
  const [hasPickToday, setHasPickToday] = useState(false);
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
  const menuRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const todayIso = new Date().toISOString().slice(0, 10);
    Promise.all([fetchHistory(), fetchDay(todayIso)]).then(([h, d]) => {
      if (cancelled) return;
      setHistory(h);
      setHasPickToday(!!d?.safe_pick);
      setLoading(false);
    });
    return () => {
      cancelled = true;
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

  // Filtre des picks selon la période sélectionnée (chart recharge)
  const PERIOD_DAYS: Record<Period, number> = { "1j": 1, "1s": 7, "1m": 30, "1a": 365 };
  const filteredPicks = useMemo(() => {
    const days = PERIOD_DAYS[period];
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - (days - 1));
    const cutoffIso = cutoff.toISOString().slice(0, 10);
    return picks.filter((p) => p.date >= cutoffIso);
  }, [picks, period]);

  return (
    <>
      <Head>
        <title>NΞXBΞT — Trust the Algorithm</title>
      </Head>

      <main
        className="w-full max-w-md md:max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 md:px-6 lg:px-8 pt-2 lg:pt-6 pb-2 flex flex-col gap-1.5 lg:gap-5 flex-1 min-h-0 lg:flex-none"
      >
        {/* Header compact — banner NΞXBΞT centré + burger menu à droite.
            Caché sur desktop (DesktopHeader prend le relais). */}
        <header className="lg:hidden grid grid-cols-[1fr_auto_1fr] items-center gap-2 shrink-0 py-1">
          <div aria-hidden />
          <BrandBanner height={48} className="mx-auto" />
          <div className="flex justify-end">
            <Link
              href="/compte"
              className="w-9 h-9 rounded-full flex items-center justify-center text-accent-green hover:bg-white/5"
              aria-label={t("home.menu")}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </Link>
          </div>
        </header>

        {loading && <HomeSkeleton />}

        {!loading && history && (
          <>
            {/* Chart NΞXBΞT — fond vert plein, period pills intégrés dans le cadre.
                Hauteur explicite en dvh (s'adapte à l'URL bar mobile) au lieu de
                flex-1 qui était mal interprété sur Safari iOS dans un layout
                flex-col imbriqué (chart écrasé). */}
            <section className="relative flex-1 min-h-[180px] lg:h-[420px] lg:flex-none" ref={menuRef}>
              <BankrollChart
                picks={filteredPicks}
                startingBankroll={startingBankroll}
                variant="hero"
                mode={opts.mode}
                showValues={opts.showValues}
                topRight={
                  <button
                    onClick={() => setMenuOpen((o) => !o)}
                    style={{ borderColor: "#ffffff" }}
                    className="nav-pulse w-7 h-7 rounded-full border flex items-center justify-center gap-[2px]"
                    aria-label={t("home.chartOptions")}
                  >
                    <span className="block w-[3px] h-[3px] rounded-full bg-white" />
                    <span className="block w-[3px] h-[3px] rounded-full bg-white" />
                    <span className="block w-[3px] h-[3px] rounded-full bg-white" />
                  </button>
                }
                footer={
                  <div className="grid grid-cols-5 gap-1.5">
                    {PERIODS.map((p) => {
                      const labelKey =
                        p === "1j"
                          ? "period.day"
                          : p === "1s"
                            ? "period.week"
                            : p === "1m"
                              ? "period.month"
                              : "period.year";
                      return (
                        <button
                          key={p}
                          onClick={() => setPeriod(p)}
                          style={{ color: "#ffffff", borderColor: "#ffffff" }}
                          className={`nav-pulse py-1 rounded-full text-[11px] font-semibold border text-center ${
                            period === p ? "bg-white/35" : "bg-transparent"
                          }`}
                        >
                          {t(labelKey)}
                        </button>
                      );
                    })}
                    <Link
                      href="/filtres"
                      style={{ color: "#ffffff", borderColor: "#ffffff" }}
                      className="nav-pulse py-1 rounded-full text-[11px] font-semibold border text-center bg-transparent"
                    >
                      {t("home.filters")}
                    </Link>
                  </div>
                }
              />
              {menuOpen && (
                <ChartOptionsMenu
                  opts={opts}
                  onChange={(next) => setOpts(next)}
                  onClose={() => setMenuOpen(false)}
                />
              )}
            </section>

            {/* Analyses / Calendrier */}
            <div className="grid grid-cols-2 gap-2 shrink-0">
              <Link
                href="/analyzer"
                className="bg-bg-card border border-white/[0.06] shadow-card rounded-xl py-1.5 flex items-center justify-center gap-1.5"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-accent-blue">
                  <circle cx="12" cy="12" r="9" />
                  <path strokeLinecap="round" d="M12 3v9l6 4" />
                </svg>
                <span className="text-sm font-medium">{t("home.analyzer")}</span>
              </Link>
              <Link
                href="/calendrier"
                className="bg-bg-card border border-white/[0.06] shadow-card rounded-xl py-1.5 flex items-center justify-center gap-1.5"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-accent-blue">
                  <rect x="3" y="4" width="18" height="17" rx="2" />
                  <path strokeLinecap="round" d="M3 9h18M8 2v4M16 2v4" />
                </svg>
                <span className="text-sm font-medium">{t("home.calendar")}</span>
              </Link>
            </div>

            {/* Stat tiles : 2 rangées séparées pour distribuer les gaps
                équitablement via justify-between sur main (mobile + desktop) */}
            {stats && (
              <>
                <div className="grid grid-cols-2 gap-2 lg:gap-3 shrink-0">
                  <StatTile
                    label={t("home.statParis")}
                    value={settledCount}
                    decimals={0}
                    tone="blue"
                    onInfo={() => setInfoOpen("paris")}
                  />
                  <StatTile
                    label={t("home.statBenefice")}
                    value={Math.abs(stats.profit)}
                    decimals={2}
                    suffix="€"
                    tone={stats.profit >= 0 ? "green" : "red"}
                    onInfo={() => setInfoOpen("benefice")}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 lg:gap-3 shrink-0">
                  <StatTile
                    label={t("home.statRoi")}
                    value={Math.abs(stats.roi_percent)}
                    decimals={2}
                    suffix="%"
                    tone={stats.roi_percent >= 0 ? "green" : "red"}
                    onInfo={() => setInfoOpen("roi")}
                  />
                  <StatTile
                    label={t("home.statProgression")}
                    value={Math.abs(stats.progression_percent)}
                    decimals={2}
                    suffix="%"
                    tone={stats.progression_percent >= 0 ? "green" : "red"}
                    onInfo={() => setInfoOpen("progression")}
                  />
                </div>
              </>
            )}
          </>
        )}
      </main>

      {/* InfoSheet pour les ? des stats */}
      {infoOpen && (
        <InfoSheet
          title={statInfos[infoOpen].title}
          open={!!infoOpen}
          onClose={() => setInfoOpen(null)}
        >
          <p>{statInfos[infoOpen].body}</p>
          {statInfos[infoOpen].note && (
            <p className="text-white/50 text-xs">{statInfos[infoOpen].note}</p>
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
          <span className="text-sm font-semibold">{t("home.filters")}</span>
        </button>
      )}
    </>
  );
}

function StatTile({
  label,
  value,
  decimals = 0,
  suffix = "",
  tone,
  onInfo,
}: {
  label: string;
  value: number;
  decimals?: number;
  suffix?: string;
  tone: "blue" | "green" | "red";
  onInfo?: () => void;
}) {
  const { t } = useI18n();
  const colorClass =
    tone === "blue" ? "text-accent-blue" : tone === "red" ? "text-accent-red" : "text-accent-green";
  return (
    <div className="bg-bg-card border border-white/[0.06] shadow-card rounded-2xl px-3 py-1.5 lg:py-4 relative flex flex-col justify-center items-center">
      {onInfo && (
        <button
          onClick={onInfo}
          className="absolute top-1 right-1 w-4 h-4 lg:w-5 lg:h-5 rounded-full border border-white/15 text-white/40 hover:text-white hover:border-white/30 text-[9px] lg:text-[10px] flex items-center justify-center transition"
          aria-label={t("home.helpFor", { label })}
        >
          ?
        </button>
      )}
      <div className="text-[10px] lg:text-[11px] uppercase tracking-wider text-white/50 text-center">
        {label}
      </div>
      <div className={`text-lg lg:text-3xl font-bold tabular-nums text-center mt-0 lg:mt-1.5 ${colorClass}`}>
        <AnimatedNumber value={value} decimals={decimals} suffix={suffix} />
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
  const { t } = useI18n();
  return (
    <div className="absolute top-12 right-3 z-30 w-60 rounded-2xl bg-bg-elevated/95 border border-white/10 shadow-2xl backdrop-blur overflow-hidden">
      <div className="px-4 pt-3 pb-1 text-[11px] uppercase tracking-wider text-white/40 font-semibold">
        {t("home.chartData")}
      </div>
      <MenuItem
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <circle cx="9" cy="12" r="6" />
            <path strokeLinecap="round" d="M15 12h6M18 9l3 3-3 3" />
          </svg>
        }
        label={t("home.chartBenefit")}
        active={opts.mode === "benefice"}
        onClick={() => onChange({ ...opts, mode: "benefice" })}
      />
      <MenuItem
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l6-6 4 4 8-8" />
          </svg>
        }
        label={t("home.chartCapital")}
        active={opts.mode === "capital"}
        onClick={() => onChange({ ...opts, mode: "capital" })}
      />
      <div className="px-4 pt-3 pb-1 text-[11px] uppercase tracking-wider text-white/40 font-semibold border-t border-white/5 mt-1">
        {t("home.chartOptionsSection")}
      </div>
      <MenuItem
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4" />
          </svg>
        }
        label={t("home.chartCLV")}
        active={opts.showCLV}
        onClick={() => onChange({ ...opts, showCLV: !opts.showCLV })}
      />
      <MenuItem
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path strokeLinecap="round" d="M4 9h16M4 15h16M10 3l-4 18M18 3l-4 18" />
          </svg>
        }
        label={t("home.chartValues")}
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
