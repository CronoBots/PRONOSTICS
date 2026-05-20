/**
 * Contexte d'authentification — Phase 1 (mock, localStorage).
 *
 * État stocké : email, pseudo, isPremium, subscriptionEnd (ISO).
 * Phase 2 remplacera ça par Supabase Auth + Stripe webhook.
 */

import { createContext, ReactNode, useContext, useEffect, useState } from "react";

export interface AuthUser {
  email: string;
  pseudo: string;
  isPremium: boolean;
  plan: "free" | "monthly" | "yearly";
  subscriptionEnd: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (
    pseudo: string,
    email: string,
    password: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  upgradeTo: (plan: "monthly" | "yearly") => void;
  cancelSubscription: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = "pronostics.auth.user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  function persist(u: AuthUser | null) {
    setUser(u);
    if (typeof window !== "undefined") {
      if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
      else localStorage.removeItem(STORAGE_KEY);
    }
  }

  async function login(email: string, password: string) {
    if (!email.includes("@") || password.length < 6) {
      return { ok: false, error: "Email ou mot de passe invalide" };
    }
    persist({
      email,
      pseudo: email.split("@")[0],
      isPremium: false,
      plan: "free",
      subscriptionEnd: null,
    });
    return { ok: true };
  }

  async function register(pseudo: string, email: string, password: string) {
    if (!pseudo.trim()) return { ok: false, error: "Pseudo requis" };
    if (!email.includes("@")) return { ok: false, error: "Email invalide" };
    if (password.length < 6) {
      return { ok: false, error: "Mot de passe : 6 caractères minimum" };
    }
    persist({
      email,
      pseudo: pseudo.trim(),
      isPremium: false,
      plan: "free",
      subscriptionEnd: null,
    });
    return { ok: true };
  }

  function logout() {
    persist(null);
  }

  function upgradeTo(plan: "monthly" | "yearly") {
    if (!user) return;
    const end = new Date();
    end.setMonth(end.getMonth() + (plan === "yearly" ? 12 : 1));
    persist({
      ...user,
      isPremium: true,
      plan,
      subscriptionEnd: end.toISOString(),
    });
  }

  function cancelSubscription() {
    if (!user) return;
    persist({
      ...user,
      isPremium: false,
      plan: "free",
      subscriptionEnd: null,
    });
  }

  return (
    <AuthContext.Provider
      value={{ user, ready, login, register, logout, upgradeTo, cancelSubscription }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
