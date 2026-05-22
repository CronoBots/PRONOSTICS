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
    {
      href: "/stats",
      label: t("nav.stats"),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 20V10M9 20V4M15 20v-8M21 20v-4" />
        </svg>
      ),
    },
  ];

  const rightTabs: Tab[] = [
    {
      href: "/analyzer",
      label: t("home.analyzer"),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" d="M12 3v9l6 4" />
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
    {
      href: "/plus",
      label: t("nav.plus"),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
          <circle cx="5" cy="12" r="1.5" fill="currentColor" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
          <circle cx="19" cy="12" r="1.5" fill="currentColor" />
        </svg>
      ),
    },
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
        className="max-w-md mx-auto grid grid-cols-7 relative items-end"
        style={{ paddingBottom: "calc(var(--safe-bottom) + 0.75rem)" }}
      >
        {leftTabs.map(renderTab)}

        {/* Bouton central → /today (pari du jour), couleur du chart accent-green
            étoile = identité forte "le pick du jour à ne pas rater" */}
        <div className="flex justify-center -mt-7 relative">
          <Link
            href="/today"
            className="nav-pulse relative w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white ring-4 ring-bg-base transition bg-accent-green shadow-accent-green/30 hover:shadow-accent-green/50"
            aria-label={t("nav.todayPick")}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
              <path d="M12 2 14.39 8.59 21 9.32l-5 4.87 1.51 6.81L12 17.5l-6.51 3.5L7 14.19 2 9.32l6.61-.73L12 2z" />
            </svg>
          </Link>
          {todayActive && (
            <span
              aria-hidden
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-accent-green"
            />
          )}
        </div>

        {rightTabs.map(renderTab)}
      </div>
    </nav>
  );
}
