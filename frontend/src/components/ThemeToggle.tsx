/**
 * Toggle theme light ↔ dark, style switch iOS animé (slide gauche / droite).
 *
 * Le 3e mode "system" n'est pas exposé ici (le menu /compte garde ce choix
 * avancé). Sur la Home, un simple toggle binaire est suffisant.
 */

import { useTheme } from "@/lib/theme";

interface Props {
  size?: "sm" | "md";
}

export function ThemeToggle({ size = "md" }: Props) {
  const { resolved, setTheme } = useTheme();
  const isDark = resolved === "dark";

  const dims =
    size === "sm"
      ? { track: "w-12 h-7", thumb: "w-5 h-5", thumbShift: 20 }
      : { track: "w-14 h-8", thumb: "w-6 h-6", thumbShift: 24 };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={!isDark}
      aria-label={isDark ? "Activer le thème clair" : "Activer le thème sombre"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`relative ${dims.track} rounded-full border transition-colors duration-300 ${
        isDark
          ? "bg-bg-elevated border-white/15"
          : "bg-accent-green/30 border-accent-green/60"
      }`}
    >
      {/* Icônes lune & soleil aux extrémités */}
      <span
        className={`absolute left-1.5 top-1/2 -translate-y-1/2 transition-opacity ${
          isDark ? "opacity-80" : "opacity-30"
        }`}
        aria-hidden
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-white/80">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
        </svg>
      </span>
      <span
        className={`absolute right-1.5 top-1/2 -translate-y-1/2 transition-opacity ${
          isDark ? "opacity-30" : "opacity-80"
        }`}
        aria-hidden
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-yellow-400">
          <circle cx="12" cy="12" r="4" />
          <path strokeLinecap="round" d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" />
        </svg>
      </span>

      {/* Pouce qui slide */}
      <span
        className={`absolute top-1/2 -translate-y-1/2 ${dims.thumb} rounded-full bg-white shadow-md transition-transform duration-300 ease-out`}
        style={{
          left: 3,
          transform: `translate(${isDark ? 0 : dims.thumbShift}px, -50%)`,
        }}
        aria-hidden
      />
    </button>
  );
}
