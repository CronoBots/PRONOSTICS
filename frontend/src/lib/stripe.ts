/**
 * Helper Stripe — lazy-load du client publique côté browser.
 *
 * Le flow de checkout en static export (pas de server Next.js) :
 *   1. User clique "Choisir mensuel/annuel" sur /premium
 *   2. Frontend appelle Supabase Edge Function 'create-checkout-session'
 *      (avec le JWT user pour identifier le caller)
 *   3. Edge Function crée la session Stripe Checkout via Stripe API
 *   4. Edge Function retourne le sessionId
 *   5. Frontend redirige vers Stripe.checkout via stripe.redirectToCheckout
 *   6. User paie sur Stripe (page hébergée)
 *   7. Stripe → webhook → Supabase Edge Function 'stripe-webhook'
 *      → insert/update subscription dans la DB
 *   8. User redirigé vers /compte avec ?success=true
 *
 * Variable d'env requise :
 *   - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (commence par pk_test_ ou pk_live_)
 */

import { loadStripe, type Stripe } from "@stripe/stripe-js";

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  const key =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
      : undefined;
  if (!key) {
    // Pas de clé = Stripe non configuré (dev local sans .env, ou prod sans secret)
    return Promise.resolve(null);
  }
  if (!stripePromise) {
    stripePromise = loadStripe(key);
  }
  return stripePromise;
}

export function isStripeEnabled(): boolean {
  const key =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
      : undefined;
  return !!key;
}

/**
 * Déclenche le flow checkout : appelle l'Edge Function Supabase qui crée
 * la session Stripe, puis redirige le user vers la page hosted Stripe.
 *
 * @param plan "monthly" | "yearly"
 * @param accessToken JWT Supabase de l'utilisateur courant
 * @param supabaseUrl Project URL Supabase (pour invoke l'Edge Function)
 */
export async function startCheckout(
  plan: "monthly" | "yearly",
  accessToken: string,
  supabaseUrl: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/create-checkout-session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ plan }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `Edge Function: ${res.status} ${body}` };
    }
    const { url } = await res.json();
    if (!url) {
      return { ok: false, error: "No checkout URL returned" };
    }
    // Stripe Checkout retourne toujours une URL directe — on redirige
    window.location.href = url;
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}
