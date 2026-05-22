/**
 * Preferences provider — format de cote, devise, notif email, etc.
 *
 * Persistance localStorage, single source of truth pour l'affichage
 * des cotes et montants à travers l'app.
 */

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type OddsFormat = "decimal" | "fractional" | "american";
export type Currency = "EUR" | "USD" | "GBP" | "CHF";
export type BetDisplay = "compact" | "detailed";

interface Preferences {
  oddsFormat: OddsFormat;
  currency: Currency;
  betDisplay: BetDisplay;
  emailNotif: boolean;
}

const DEFAULT_PREFS: Preferences = {
  oddsFormat: "decimal",
  currency: "EUR",
  betDisplay: "detailed",
  emailNotif: true,
};

const STORAGE_KEY = "pronostics.prefs";

interface PreferencesContextType extends Preferences {
  setOddsFormat: (f: OddsFormat) => void;
  setCurrency: (c: Currency) => void;
  setBetDisplay: (d: BetDisplay) => void;
  setEmailNotif: (b: boolean) => void;
  formatOdds: (decimal: number) => string;
  formatMoney: (amount: number, opts?: { decimals?: number }) => string;
  currencySymbol: string;
}

const PreferencesContext = createContext<PreferencesContextType | null>(null);

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  EUR: "€",
  USD: "$",
  GBP: "£",
  CHF: "CHF",
};

// Approximation : on n'effectue PAS de conversion FX réelle (juste un changement
// de symbole pour l'instant). Une vraie conversion nécessiterait une source FX.
function symbolFor(c: Currency): string {
  return CURRENCY_SYMBOLS[c];
}

function formatOddsImpl(decimal: number, format: OddsFormat): string {
  if (!Number.isFinite(decimal) || decimal <= 1) return decimal.toFixed(2);
  if (format === "decimal") return decimal.toFixed(2);
  if (format === "fractional") {
    const f = decimal - 1;
    // Approximation rationnelle simple (dénominateur ≤ 100)
    let bestNum = 1;
    let bestDen = 1;
    let bestErr = Math.abs(f - 1);
    for (let den = 1; den <= 100; den++) {
      const num = Math.round(f * den);
      if (num < 1) continue;
      const err = Math.abs(f - num / den);
      if (err < bestErr) {
        bestErr = err;
        bestNum = num;
        bestDen = den;
        if (err < 1e-6) break;
      }
    }
    return `${bestNum}/${bestDen}`;
  }
  // american
  if (decimal >= 2) {
    return `+${Math.round((decimal - 1) * 100)}`;
  }
  return `${Math.round(-100 / (decimal - 1))}`;
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Preferences>;
        setPrefs((p) => ({ ...p, ...parsed }));
      }
    } catch {
      /* ignore */
    }
  }, []);

  const persist = useCallback((next: Preferences) => {
    setPrefs(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const setOddsFormat = useCallback(
    (oddsFormat: OddsFormat) => persist({ ...prefs, oddsFormat }),
    [prefs, persist],
  );
  const setCurrency = useCallback(
    (currency: Currency) => persist({ ...prefs, currency }),
    [prefs, persist],
  );
  const setBetDisplay = useCallback(
    (betDisplay: BetDisplay) => persist({ ...prefs, betDisplay }),
    [prefs, persist],
  );
  const setEmailNotif = useCallback(
    (emailNotif: boolean) => persist({ ...prefs, emailNotif }),
    [prefs, persist],
  );

  const formatOdds = useCallback(
    (d: number) => formatOddsImpl(d, prefs.oddsFormat),
    [prefs.oddsFormat],
  );

  const currencySymbol = useMemo(() => symbolFor(prefs.currency), [prefs.currency]);

  const formatMoney = useCallback(
    (amount: number, opts?: { decimals?: number }) => {
      const d = opts?.decimals ?? 2;
      const sign = amount < 0 ? "-" : "";
      const abs = Math.abs(amount).toFixed(d);
      return `${sign}${abs} ${currencySymbol}`;
    },
    [currencySymbol],
  );

  const value: PreferencesContextType = {
    ...prefs,
    setOddsFormat,
    setCurrency,
    setBetDisplay,
    setEmailNotif,
    formatOdds,
    formatMoney,
    currencySymbol,
  };

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be inside PreferencesProvider");
  return ctx;
}
