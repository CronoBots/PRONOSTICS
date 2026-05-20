import Link from "next/link";
import { useRouter } from "next/router";
import { ReactNode } from "react";

interface Tab {
  href: string;
  label: string;
  icon: ReactNode;
}

const tabs: Tab[] = [
  {
    href: "/",
    label: "Home",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12 12 3l9 9M5 10v10h4v-6h6v6h4V10" />
      </svg>
    ),
  },
  {
    href: "/paris",
    label: "Paris",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h10" />
      </svg>
    ),
  },
  {
    href: "/stats",
    label: "Stats",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 20V10M9 20V4M15 20v-8M21 20v-4" />
      </svg>
    ),
  },
  {
    href: "/compte",
    label: "Compte",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <circle cx="12" cy="8" r="4" />
        <path strokeLinecap="round" d="M4 21c0-4 4-7 8-7s8 3 8 7" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const router = useRouter();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-bg-card/95 backdrop-blur border-t border-white/[0.06]">
      <div
        className="max-w-md mx-auto grid grid-cols-4"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {tabs.map((t) => {
          const active = router.pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-col items-center gap-1 py-2.5 transition ${
                active ? "text-accent-green" : "text-white/40 hover:text-white/70"
              }`}
            >
              {t.icon}
              <span className="text-[10px] font-medium tracking-wider uppercase">
                {t.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
