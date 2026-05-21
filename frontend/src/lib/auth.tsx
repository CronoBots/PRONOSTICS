/**
 * Contexte d'authentification — hybride Supabase + mock localStorage.
 *
 * Mode "Supabase" (production avec NEXT_PUBLIC_SUPABASE_URL + ANON_KEY) :
 *   - supabase.auth.signUp / signInWithPassword / signOut
 *   - Profile lu depuis la table 'profiles'
 *   - Premium status calculé via la view 'active_subscriptions'
 *   - Update real-time via supabase.auth.onAuthStateChange
 *
 * Mode "mock" (dev local sans config Supabase) :
 *   - localStorage only, pas de vrai backend
 *   - Permet de tester l'UI sans setup Supabase
 *
 * Le mode est détecté automatiquement via isSupabaseEnabled().
 */

import { createContext, ReactNode, useContext, useEffect, useState } from "react";

import { supabase, isSupabaseEnabled, type Session } from "@/lib/supabase";

export interface AuthUser {
  id?: string;  // uuid Supabase, absent en mode mock
  email: string;
  pseudo: string;
  isPremium: boolean;
  plan: "free" | "monthly" | "yearly";
  subscriptionEnd: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  ready: boolean;
  mode: "supabase" | "mock";
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (
    pseudo: string,
    email: string,
    password: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  upgradeTo: (plan: "monthly" | "yearly") => Promise<void>;
  cancelSubscription: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = "pronostics.auth.user";

// ============================================================================
// Helpers Supabase
// ============================================================================

async function loadAuthUserFromSupabase(session: Session): Promise<AuthUser> {
  const userId = session.user.id;
  const email = session.user.email ?? "";

  // Profile (pseudo)
  let pseudo = email.split("@")[0];
  if (supabase) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("pseudo")
      .eq("id", userId)
      .maybeSingle();
    if (profile?.pseudo) pseudo = profile.pseudo;
  }

  // Active subscription (la plus récente s'il y en a plusieurs)
  let isPremium = false;
  let plan: AuthUser["plan"] = "free";
  let subscriptionEnd: string | null = null;
  if (supabase) {
    const { data: sub } = await supabase
      .from("active_subscriptions")
      .select("plan, current_period_end")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (sub) {
      isPremium = true;
      plan = sub.plan as AuthUser["plan"];
      subscriptionEnd = sub.current_period_end;
    }
  }

  return {
    id: userId,
    email,
    pseudo,
    isPremium,
    plan,
    subscriptionEnd,
  };
}

// ============================================================================
// AuthProvider
// ============================================================================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const mode = isSupabaseEnabled() ? "supabase" : "mock";

  // Initialisation : récupère la session existante + écoute les changements
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (mode === "supabase" && supabase) {
        // Récupère la session courante (cookie ou localStorage Supabase)
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const u = await loadAuthUserFromSupabase(session);
          if (!cancelled) setUser(u);
        }
        if (!cancelled) setReady(true);

        // Subscribe aux changements (signin, signout, refresh token)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (event === "SIGNED_OUT" || !session) {
              setUser(null);
            } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
              const u = await loadAuthUserFromSupabase(session);
              setUser(u);
            }
          },
        );
        return () => subscription.unsubscribe();
      } else {
        // Mode mock
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw && !cancelled) setUser(JSON.parse(raw));
        } catch {
          /* ignore */
        }
        if (!cancelled) setReady(true);
      }
    }

    const cleanup = bootstrap();
    return () => {
      cancelled = true;
      Promise.resolve(cleanup).then((fn) => fn && fn());
    };
  }, [mode]);

  // ============================================================================
  // Mock helpers (persist via localStorage)
  // ============================================================================

  function persistMock(u: AuthUser | null) {
    setUser(u);
    if (typeof window !== "undefined") {
      if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
      else localStorage.removeItem(STORAGE_KEY);
    }
  }

  // ============================================================================
  // Actions publiques
  // ============================================================================

  async function login(email: string, password: string) {
    email = email.trim();
    if (!email.includes("@") || password.length < 6) {
      return { ok: false, error: "Email ou mot de passe invalide" };
    }

    if (mode === "supabase" && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return { ok: false, error: error.message };
      if (data.session) {
        const u = await loadAuthUserFromSupabase(data.session);
        setUser(u);
      }
      return { ok: true };
    }

    // Mode mock
    persistMock({
      email,
      pseudo: email.split("@")[0],
      isPremium: false,
      plan: "free",
      subscriptionEnd: null,
    });
    return { ok: true };
  }

  async function register(pseudo: string, email: string, password: string) {
    pseudo = pseudo.trim();
    email = email.trim();
    if (!pseudo) return { ok: false, error: "Pseudo requis" };
    if (!email.includes("@")) return { ok: false, error: "Email invalide" };
    if (password.length < 6) {
      return { ok: false, error: "Mot de passe : 6 caractères minimum" };
    }

    if (mode === "supabase" && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { pseudo },  // → raw_user_meta_data, lu par le trigger handle_new_user
        },
      });
      if (error) return { ok: false, error: error.message };
      // En mode "Email confirmation OFF", session est dispo immédiatement
      if (data.session) {
        const u = await loadAuthUserFromSupabase(data.session);
        setUser(u);
      }
      return { ok: true };
    }

    // Mode mock
    persistMock({
      email,
      pseudo,
      isPremium: false,
      plan: "free",
      subscriptionEnd: null,
    });
    return { ok: true };
  }

  async function logout() {
    if (mode === "supabase" && supabase) {
      await supabase.auth.signOut();
      setUser(null);
      return;
    }
    persistMock(null);
  }

  async function upgradeTo(plan: "monthly" | "yearly") {
    if (mode === "supabase") {
      // En production avec Stripe, ça redirige vers Stripe Checkout.
      // Phase 1B (sans Stripe) : on log un avertissement.
      console.warn(
        "[auth] upgradeTo() en mode Supabase nécessite Stripe Checkout (Phase 2). " +
        "Pour l'instant, simuler un upgrade via SQL Editor Supabase :\n" +
        "  insert into subscriptions (user_id, status, plan, current_period_end)\n" +
        "  values ('<user_id>', 'active', '" + plan + "', now() + interval '" +
        (plan === "yearly" ? "12" : "1") + " months');",
      );
      return;
    }

    // Mode mock : simulation locale
    if (!user) return;
    const end = new Date();
    end.setMonth(end.getMonth() + (plan === "yearly" ? 12 : 1));
    persistMock({
      ...user,
      isPremium: true,
      plan,
      subscriptionEnd: end.toISOString(),
    });
  }

  async function cancelSubscription() {
    if (mode === "supabase") {
      console.warn(
        "[auth] cancelSubscription() en mode Supabase nécessite une Edge Function Stripe (Phase 2).",
      );
      return;
    }

    // Mode mock
    if (!user) return;
    persistMock({
      ...user,
      isPremium: false,
      plan: "free",
      subscriptionEnd: null,
    });
  }

  async function refreshUser() {
    if (mode === "supabase" && supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const u = await loadAuthUserFromSupabase(session);
        setUser(u);
      }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        ready,
        mode,
        login,
        register,
        logout,
        upgradeTo,
        cancelSubscription,
        refreshUser,
      }}
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
