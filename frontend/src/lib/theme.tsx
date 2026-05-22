/**
 * Theme provider — light / dark / system.
 *
 * Applique `data-theme="light"` ou `data-theme="dark"` sur <html>.
 * Le palette est swapped via CSS variables dans globals.css.
 *
 * - "system" suit prefers-color-scheme (default au premier load)
 * - Persistance localStorage
 * - Sync inter-onglets via `storage` event
 */

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type ThemeChoice = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "pronostics.theme";

interface ThemeContextType {
  theme: ThemeChoice;
  resolved: ResolvedTheme;
  setTheme: (t: ThemeChoice) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

function resolveTheme(choice: ThemeChoice): ResolvedTheme {
  if (choice === "light" || choice === "dark") return choice;
  if (typeof window === "undefined") return "dark";
  try {
    return window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  } catch {
    return "dark";
  }
}

function applyTheme(resolved: ResolvedTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", resolved);
  // theme-color iOS PWA aligné sur le bg-base courant
  const themeColor = resolved === "light" ? "#f6f7fb" : "#0a0b1e";
  let meta = document.querySelector(
    'meta[name="theme-color"]',
  ) as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  meta.content = themeColor;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeChoice>("system");
  const [resolved, setResolved] = useState<ResolvedTheme>("dark");

  // Hydratation initiale (côté client uniquement)
  useEffect(() => {
    let initial: ThemeChoice = "system";
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as ThemeChoice | null;
      if (stored === "light" || stored === "dark" || stored === "system") {
        initial = stored;
      }
    } catch {
      /* ignore */
    }
    setThemeState(initial);
    const r = resolveTheme(initial);
    setResolved(r);
    applyTheme(r);
  }, []);

  // Suit le système si choix = "system"
  useEffect(() => {
    if (theme !== "system" || typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-color-scheme: light)");
    const handler = () => {
      const r = resolveTheme("system");
      setResolved(r);
      applyTheme(r);
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [theme]);

  // Sync inter-onglets
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      const v = e.newValue as ThemeChoice;
      if (v === "light" || v === "dark" || v === "system") {
        setThemeState(v);
        const r = resolveTheme(v);
        setResolved(r);
        applyTheme(r);
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const setTheme = useCallback((t: ThemeChoice) => {
    setThemeState(t);
    const r = resolveTheme(t);
    setResolved(r);
    applyTheme(r);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be inside ThemeProvider");
  return ctx;
}
