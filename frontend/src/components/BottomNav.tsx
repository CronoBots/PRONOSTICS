import Link from "next/link";
import { useRouter } from "next/router";
import { ReactNode, useEffect, useState } from "react";

import { fetchHistory } from "@/lib/dataSource";
import { useI18n } from "@/lib/i18n";

interface Tab {
  href: string;
  label: string;
  icon: ReactNode;
}

export function BottomNav() {
  const router = useRouter();
  const { t } = useI18n();
  const [hasPendingPick, setHasPendingPick] = useState(false);

  // Détecte si un pick pending existe → animation pulse sur le "+" central
  useEffect(() => {
    let cancelled = false;
    fetchHistory()
      .then((h) => {
        if (cancelled || !h) return;
        const pending = h.picks.some((p) => p.outcome === "pending");
        setHasPendingPick(pending);
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
  }, [router.asPath]);

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
        className={`flex flex-col items-center gap-1 py-2.5 transition ${
          active ? "text-accent-green" : "text-white/40 hover:text-white/70"
        }`}
      >
        {tab.icon}
        <span className="text-[10px] font-medium tracking-wider">{tab.label}</span>
      </Link>
    );
  }

  const todayActive = router.pathname === "/today";

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-bg-card/95 backdrop-blur border-t border-white/[0.06]">
      <div
        className="max-w-md mx-auto grid grid-cols-5 relative items-end"
        style={{ paddingBottom: "calc(var(--safe-bottom) + 0.75rem)" }}
      >
        {leftTabs.map(renderTab)}

        {/* Bouton central + → /today (pick du jour Premium) */}
        <div className="flex justify-center -mt-7 relative">
          {/* Halo pulse derrière le bouton quand pending pick */}
          {hasPendingPick && !todayActive && (
            <span
              aria-hidden
              className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-accent-green/40 animate-ping-slow"
            />
          )}
          <Link
            href="/today"
            className={`relative w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white ring-4 ring-bg-base transition ${
              todayActive
                ? "bg-gradient-to-br from-accent-green to-accent-blue shadow-accent-green/30"
                : hasPendingPick
                  ? "bg-gradient-to-br from-accent-green to-accent-blue shadow-accent-green/40"
                  : "bg-gradient-to-br from-accent-blue to-purple-500 shadow-purple-500/30"
            }`}
            aria-label={hasPendingPick ? t("nav.todayPickPending") : t("nav.todayPick")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-7 h-7">
              <path strokeLinecap="round" d="M12 5v14M5 12h14" />
            </svg>
            {/* Petit point indicateur si pending */}
            {hasPendingPick && (
              <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-yellow-400 ring-2 ring-bg-base" />
            )}
          </Link>
        </div>

        {rightTabs.map(renderTab)}
      </div>
    </nav>
  );
}
