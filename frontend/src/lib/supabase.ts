/**
 * Client Supabase — singleton accessible depuis tout le frontend.
 *
 * Configuration via variables d'env Next.js (préfixe NEXT_PUBLIC_ pour
 * être bundled dans le static export) :
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * Si les variables sont absentes (dev local sans .env), le client est `null`
 * et l'app retombe sur le mock localStorage (cf. auth.tsx fallback).
 */

import { createClient, SupabaseClient, type Session, type User } from "@supabase/supabase-js";

const supabaseUrl =
  typeof process !== "undefined" ? process.env.NEXT_PUBLIC_SUPABASE_URL : undefined;
const supabaseAnonKey =
  typeof process !== "undefined" ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : undefined;

let _supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  _supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,  // pour magic links + OAuth callbacks
    },
  });
}

export const supabase = _supabase;

export const isSupabaseEnabled = (): boolean => _supabase !== null;

// Re-export types pratiques
export type { Session, User } from "@supabase/supabase-js";

// Profil utilisateur (table profiles dans Supabase, jointe à auth.users)
export interface DbProfile {
  id: string;
  pseudo: string | null;
  created_at: string;
  updated_at: string;
}

// Abonnement (table subscriptions)
export interface DbSubscription {
  id: string;
  user_id: string;
  status: "active" | "cancelled" | "expired" | "past_due" | "incomplete";
  plan: "monthly" | "yearly";
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}
