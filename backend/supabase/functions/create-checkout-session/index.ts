// ============================================================================
// Edge Function : create-checkout-session
// ============================================================================
// Appelée par le frontend quand l'utilisateur clique "Choisir mensuel/annuel"
// sur la page /premium. Crée une session Stripe Checkout et renvoie l'URL
// hosted pour rediriger l'utilisateur.
//
// Endpoint : POST https://<project>.supabase.co/functions/v1/create-checkout-session
// Headers   : Authorization: Bearer <user_jwt>
// Body      : { "plan": "monthly" | "yearly" }
// Response  : { "sessionId": "cs_xxx", "url": "https://checkout.stripe.com/..." }
//
// Variables d'env requises (à configurer dans Supabase dashboard
// → Edge Functions → Secrets) :
//   - STRIPE_SECRET_KEY        (sk_test_ ou sk_live_)
//   - STRIPE_PRICE_MONTHLY     (price_xxx pour le plan mensuel)
//   - STRIPE_PRICE_YEARLY      (price_xxx pour le plan annuel)
//   - PUBLIC_SITE_URL          (URL du frontend, ex: https://cronobots.github.io/PRONOSTICS)
// ============================================================================

// @ts-ignore — Deno imports
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
// @ts-ignore
import Stripe from "https://esm.sh/stripe@17?target=deno";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";

// @ts-ignore — Deno globals
const env = (key: string): string => {
  // @ts-ignore
  const value = Deno.env.get(key);
  if (!value) throw new Error(`Missing env var: ${key}`);
  return value;
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  // Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    // 1. Auth : vérifier le JWT user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Missing auth header" }, 401);
    }
    const jwt = authHeader.replace("Bearer ", "");
    const supabase = createClient(
      env("SUPABASE_URL"),
      env("SUPABASE_ANON_KEY"),
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !user) {
      return json({ error: "Invalid token" }, 401);
    }

    // 2. Lire le plan demandé
    const body = await req.json();
    const plan = body.plan as "monthly" | "yearly";
    if (plan !== "monthly" && plan !== "yearly") {
      return json({ error: "Invalid plan (monthly|yearly)" }, 400);
    }
    const priceId = plan === "monthly"
      ? env("STRIPE_PRICE_MONTHLY")
      : env("STRIPE_PRICE_YEARLY");

    // 3. Récupérer ou créer le customer Stripe
    const stripe = new Stripe(env("STRIPE_SECRET_KEY"), {
      apiVersion: "2024-06-20",
    });

    // Cherche un customer existant pour ce user (via metadata)
    const adminClient = createClient(
      env("SUPABASE_URL"),
      env("SUPABASE_SERVICE_ROLE_KEY"),
    );
    const { data: existingSub } = await adminClient
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .not("stripe_customer_id", "is", null)
      .limit(1)
      .maybeSingle();

    let customerId = existingSub?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email!,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
    }

    // 4. Créer la session Checkout
    const siteUrl = env("PUBLIC_SITE_URL");
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/compte/?checkout=success`,
      cancel_url: `${siteUrl}/premium/?checkout=cancel`,
      metadata: {
        supabase_user_id: user.id,
        plan,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          plan,
        },
      },
      // Auto-collecte de la TVA selon le pays du client (utile EU)
      automatic_tax: { enabled: true },
      // Permet au client de saisir un code promo
      allow_promotion_codes: true,
    });

    return json({ sessionId: session.id, url: session.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[create-checkout-session]", msg);
    return json({ error: msg }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
