import Link from "next/link";
import { useRouter } from "next/router";
import { ReactNode } from "react";

import { useI18n } from "@/lib/i18n";

interface Tab {
  href: string;
  label: string;
  icon: ReactNode;
}

export function BottomNav() {
  const router = useRouter();
  const { t } = useI18n();

  const leftTabs: Tab[] = [
    {
      href: "/",
      label: t("nav.home"),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12 12 3l9 9M5 10v10h4v-6h6v6h4V10" />
        </svg>
      ),
    },
    {
      href: "/paris",
      label: t("nav.paris"),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h10" />
        </svg>
      ),
    },
  ];

  const rightTabs: Tab[] = [
    {
      href: "/stats",
      label: t("nav.stats"),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 20V10M9 20V4M15 20v-8M21 20v-4" />
        </svg>
      ),
    },
    {
      href: "/calendrier",
      label: t("home.calendar"),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
          <rect x="3" y="4" width="18" height="17" rx="2" />
          <path strokeLinecap="round" d="M3 9h18M8 2v4M16 2v4" />
        </svg>
      ),
    },
    // "Plus" retiré v6.8 — ses fonctionnalités (outils, partage, infos
    // légales, lexique, compte, premium) sont accessibles via le burger
    // menu en haut à droite (/plus) sur la home.
  ];

  function renderTab(tab: Tab) {
    const active = router.pathname === tab.href;
    return (
      <Link
        key={tab.href}
        href={tab.href}
        className={`nav-pulse flex flex-col items-center gap-0.5 py-2 px-1 transition ${
          active ? "text-accent-green" : "text-white/40 hover:text-white/70"
        }`}
      >
        {tab.icon}
        <span className="text-[9px] font-medium tracking-wide truncate max-w-full">
          {tab.label}
        </span>
      </Link>
    );
  }

  const todayActive = router.pathname === "/today";

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-bg-card/95 backdrop-blur border-t border-white/[0.06]">
      <div
        className="max-w-md mx-auto grid grid-cols-5 relative items-end"
        style={{ paddingBottom: "var(--safe-bottom)" }}
      >
        {leftTabs.map(renderTab)}

        {/* Bouton central → /today (pari du jour), couleur cyan brand
            (v6) — etoile = identite forte "le pick du jour a ne pas rater".
            v6.9 : shadow réduite + halo subtil pour ne pas dominer la palette
            sobre nouvelle génération. Garde le brand cyan plein. */}
        <div className="flex justify-center -mt-7 relative">
          <Link
            href="/today"
            className="nav-pulse relative w-14 h-14 rounded-full flex items-center justify-center text-white ring-4 ring-bg-base transition bg-accent-blue shadow-md shadow-accent-blue/20 hover:shadow-accent-blue/40"
            aria-label={t("nav.todayPick")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="2" fill="currentColor" />
            </svg>
          </Link>
          {todayActive && (
            <span
              aria-hidden
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-accent-blue"
            />
          )}
        </div>

        {rightTabs.map(renderTab)}
      </div>
    </nav>
  );
}
