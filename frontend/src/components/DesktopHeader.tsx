import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

import { Avatar } from "@/components/Avatar";
import { BrandLogo } from "@/components/BrandLogo";
import { useAuth } from "@/lib/auth";
import { fetchHistory } from "@/lib/dataSource";
import { useI18n } from "@/lib/i18n";

interface NavItem {
  href: string;
  labelKey: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", labelKey: "nav.home" },
  { href: "/paris", labelKey: "nav.paris" },
  { href: "/stats", labelKey: "nav.stats" },
  { href: "/analyzer", labelKey: "home.analyzer" },
  { href: "/calendrier", labelKey: "home.calendar" },
  { href: "/demain", labelKey: "demain.title" },
  { href: "/mes-paris", labelKey: "perso.title" },
  { href: "/plus", labelKey: "nav.plus" },
];

/**
 * Top bar pour tablette/desktop (>= lg). Cachée sur mobile (le BottomNav prend
 * le relais en dessous de lg). Sticky en haut, fond bg-card semi-transparent
 * avec backdrop-blur pour cohérence avec BottomNav.
 *
 * Structure : [Logo NΞXBΞT] · [Streak indicator] · [Menu horizontal] · [Pick du
 * jour CTA] · [Compte]
 */
export function DesktopHeader() {
  const router = useRouter();
  const { t } = useI18n();
  const { user } = useAuth();
  const [hasPendingPick, setHasPendingPick] = useState(false);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchHistory()
      .then((h) => {
        if (cancelled || !h) return;
        setHasPendingPick(h.picks.some((p) => p.outcome === "pending"));
        setStreak(h.stats?.current_streak ?? 0);
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
  }, [router.asPath]);

  const todayActive = router.pathname === "/today";

  return (
    <header className="hidden lg:block sticky top-0 z-40 bg-bg-card/90 backdrop-blur border-b border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-6 xl:px-8 h-16 flex items-center gap-6">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-lg shrink-0"
          aria-label="NΞXBΞT"
        >
          <BrandLogo size={36} />
          <span className="text-accent-green">NΞXBΞT</span>
        </Link>

        {/* Streak indicator (à côté du logo) */}
        {streak !== 0 && (
          <div
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold tabular-nums border ${
              streak > 0
                ? "bg-accent-green/10 text-accent-green border-accent-green/30"
                : "bg-accent-red/10 text-accent-red border-accent-red/30"
            }`}
            title={t("home.streakInProgress")}
          >
            <span>{streak > 0 ? "🔥" : "🥶"}</span>
            <span>
              {streak > 0 ? "+" : ""}
              {streak}
            </span>
          </div>
        )}

        {/* Menu horizontal centré */}
        <nav className="flex-1 flex items-center justify-center gap-1">
          {NAV_ITEMS.map((item) => {
            const active = router.pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                  active
                    ? "bg-white/[0.06] text-white"
                    : "text-white/55 hover:text-white hover:bg-white/[0.03]"
                }`}
              >
                {t(item.labelKey)}
              </Link>
            );
          })}
        </nav>

        {/* CTA Pick du jour */}
        <Link
          href="/today"
          className={`relative inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-lg shrink-0 transition ${
            todayActive
              ? "bg-gradient-to-br from-accent-green to-accent-blue shadow-accent-green/30"
              : hasPendingPick
                ? "bg-gradient-to-br from-accent-green to-accent-blue shadow-accent-green/40"
                : "bg-gradient-to-br from-accent-green to-accent-blue shadow-accent-green/30 hover:shadow-accent-green/50"
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
            <path strokeLinecap="round" d="M12 5v14M5 12h14" />
          </svg>
          <span>{hasPendingPick ? t("nav.todayPickPending") : t("nav.todayPick")}</span>
          {hasPendingPick && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-yellow-400 ring-2 ring-bg-card" />
          )}
        </Link>

        {/* Avatar / Compte */}
        <Link
          href="/compte"
          className="shrink-0 hover:opacity-80 transition"
          aria-label={t("nav.account")}
        >
          <Avatar
            initial={user?.pseudo?.slice(0, 1) ?? "?"}
            size={36}
          />
        </Link>
      </div>
    </header>
  );
}
