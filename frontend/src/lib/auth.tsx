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
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string; needsConfirmation?: boolean }>;
  register: (
    pseudo: string,
    email: string,
    password: string,
  ) => Promise<{ ok: boolean; error?: string; needsConfirmation?: boolean }>;
  logout: () => Promise<void>;
  upgradeTo: (plan: "monthly" | "yearly") => Promise<void>;
  cancelSubscription: () => Promise<void>;
  refreshUser: () => Promise<void>;
  resendConfirmation: (email: string) => Promise<{ ok: boolean; error?: string }>;
  requestPasswordReset: (email: string) => Promise<{ ok: boolean; error?: string }>;
  /** Dev-only : force-flip Premium status sans passer par login/checkout.
   *  Persiste dans localStorage et override l'auth réelle. */
  devTogglePremium: () => void;
  /** Dev-only : set the override to a specific state directly. */
  devSetPremium: (next: "premium" | "free" | null) => void;
  /** True quand l'override dev est actif (UI peut afficher un badge). */
  devOverride: "premium" | "free" | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = "pronostics.auth.user";
const DEV_OVERRIDE_KEY = "pronostics.dev.premiumOverride";

function readDevOverride(): "premium" | "free" | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(DEV_OVERRIDE_KEY);
    if (v === "premium" || v === "free") return v;
    return null;
  } catch {
    return null;
  }
}

function writeDevOverride(v: "premium" | "free" | null): void {
  if (typeof window === "undefined") return;
  try {
    if (v) localStorage.setItem(DEV_OVERRIDE_KEY, v);
    else localStorage.removeItem(DEV_OVERRIDE_KEY);
  } catch {
    /* ignore */
  }
}

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
  const [rawUser, setRawUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [devOverride, setDevOverride] = useState<"premium" | "free" | null>(null);
  const mode = isSupabaseEnabled() ? "supabase" : "mock";

  // Compose the effective user: if a dev override is active, layer it on top
  // of the real auth state. If no real user but override = "premium", spawn
  // a synthetic dev user so the Premium UI can be exercised without login.
  const user: AuthUser | null = (() => {
    if (!devOverride) return rawUser;
    if (rawUser) {
      return { ...rawUser, isPremium: devOverride === "premium" };
    }
    if (devOverride === "premium") {
      return {
        id: "dev-preview",
        email: "dev@nexbet.local",
        pseudo: "Dev preview",
        isPremium: true,
        plan: "monthly",
        subscriptionEnd: null,
      };
    }
    return null;
  })();

  // Aliased setter so existing code paths in the bootstrap / login fns
  // continue to work unchanged.
  const setUser = setRawUser;

  useEffect(() => {
    setDevOverride(readDevOverride());
  }, []);

  function devTogglePremium() {
    const current = readDevOverride();
    let next: "premium" | "free" | null;
    if (current === null) next = "premium";
    else if (current === "premium") next = "free";
    else next = null;
    writeDevOverride(next);
    setDevOverride(next);
  }

  function devSetPremium(next: "premium" | "free" | null) {
    writeDevOverride(next);
    setDevOverride(next);
  }

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
      if (error) {
        // Supabase renvoie le code "email_not_confirmed" + message dans error.code
        // ou un message contenant "Email not confirmed" sur certaines versions.
        const code = (error as { code?: string }).code;
        const needsConfirmation =
          code === "email_not_confirmed" ||
          /email\s*not\s*confirmed/i.test(error.message);
        return { ok: false, error: error.message, needsConfirmation };
      }
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
      // i18n: caller does t("auth.error.passwordTooShort") if it wants the
      // localised string; the error code is also returned for non-UI consumers.
      return { ok: false, error: "auth.error.passwordTooShort" };
    }

    if (mode === "supabase" && supabase) {
      const emailRedirectTo =
        typeof window !== "undefined" ? `${window.location.origin}/login` : undefined;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { pseudo },  // → raw_user_meta_data, lu par le trigger handle_new_user
          emailRedirectTo,
        },
      });
      if (error) return { ok: false, error: error.message };
      // En mode "Email confirmation OFF", session est dispo immédiatement.
      // En mode ON, data.session === null et l'utilisateur doit cliquer le mail.
      if (data.session) {
        const u = await loadAuthUserFromSupabase(data.session);
        setUser(u);
        return { ok: true };
      }
      // Pas de session → confirmation email requise
      return { ok: true, needsConfirmation: true };
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

  async function resendConfirmation(email: string) {
    email = email.trim();
    if (!email.includes("@")) return { ok: false, error: "Email invalide" };
    if (mode === "supabase" && supabase) {
      const emailRedirectTo =
        typeof window !== "undefined" ? `${window.location.origin}/login` : undefined;
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: emailRedirectTo ? { emailRedirectTo } : undefined,
      });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }
    // Mode mock : no-op, succeed silently
    return { ok: true };
  }

  async function requestPasswordReset(email: string) {
    email = email.trim();
    if (!email.includes("@")) return { ok: false, error: "Email invalide" };
    if (mode === "supabase" && supabase) {
      const redirectTo =
        typeof window !== "undefined" ? `${window.location.origin}/login` : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }
    return { ok: true };
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
        resendConfirmation,
        requestPasswordReset,
        devTogglePremium,
        devSetPremium,
        devOverride,
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
