// ============================================================================
// Edge Function : stripe-webhook
// ============================================================================
// Reçoit les events Stripe et synchronise la table subscriptions.
//
// Endpoint : POST https://<project>.supabase.co/functions/v1/stripe-webhook
// Headers   : Stripe-Signature: t=... (vérifié pour authentifier)
// Body      : event Stripe brut
//
// Events traités :
//   - checkout.session.completed   → 1er paiement réussi, crée la subscription
//   - customer.subscription.updated → renouvellement, changement plan, etc.
//   - customer.subscription.deleted → annulation effective
//   - invoice.payment_failed       → past_due
//
// Variables d'env requises :
//   - STRIPE_SECRET_KEY
//   - STRIPE_WEBHOOK_SECRET   (whsec_xxx — généré quand on crée l'endpoint
//                              dans Stripe dashboard)
//   - SUPABASE_URL
//   - SUPABASE_SERVICE_ROLE_KEY  (clé secrète service_role, pour bypasser RLS)
// ============================================================================

// @ts-ignore
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
// @ts-ignore
import Stripe from "https://esm.sh/stripe@17?target=deno";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";

const env = (key: string): string => {
  // @ts-ignore
  const value = Deno.env.get(key);
  if (!value) throw new Error(`Missing env var: ${key}`);
  return value;
};

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const signature = req.headers.get("Stripe-Signature");
  if (!signature) {
    return new Response("Missing Stripe-Signature", { status: 400 });
  }

  const stripe = new Stripe(env("STRIPE_SECRET_KEY"), {
    apiVersion: "2024-06-20",
  });

  // 1. Vérification de signature webhook
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      env("STRIPE_WEBHOOK_SECRET"),
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[stripe-webhook] signature verification failed:", msg);
    return new Response(`Webhook signature error: ${msg}`, { status: 400 });
  }

  // 2. Client Supabase admin (service_role = bypass RLS pour écrire subscriptions)
  const supabase = createClient(
    env("SUPABASE_URL"),
    env("SUPABASE_SERVICE_ROLE_KEY"),
  );

  // 3. Dispatch sur le type d'event
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(stripe, supabase, session);
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(supabase, subscription);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          const sub = await stripe.subscriptions.retrieve(
            invoice.subscription as string,
          );
          await handleSubscriptionUpdate(supabase, sub);
        }
        break;
      }
      default:
        // Event non géré (200 OK pour ne pas que Stripe retry indéfiniment)
        console.log(`[stripe-webhook] event ignoré: ${event.type}`);
    }
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[stripe-webhook] processing error:", msg);
    // 500 → Stripe retry (utile pour les pannes DB temporaires)
    return new Response(`Processing error: ${msg}`, { status: 500 });
  }
});

async function handleCheckoutCompleted(
  stripe: Stripe,
  supabase: ReturnType<typeof createClient>,
  session: Stripe.Checkout.Session,
) {
  const userId = session.metadata?.supabase_user_id;
  const plan = session.metadata?.plan as "monthly" | "yearly" | undefined;
  if (!userId || !plan) {
    console.warn("[stripe-webhook] checkout.completed sans metadata user/plan", session.id);
    return;
  }
  if (!session.subscription) {
    console.warn("[stripe-webhook] checkout.completed sans subscription", session.id);
    return;
  }
  // Fetch full subscription pour avoir current_period_end etc.
  const subscription = await stripe.subscriptions.retrieve(
    session.subscription as string,
  );
  await upsertSubscription(supabase, subscription, userId, plan);
}

async function handleSubscriptionUpdate(
  supabase: ReturnType<typeof createClient>,
  subscription: Stripe.Subscription,
) {
  const userId = subscription.metadata?.supabase_user_id;
  const plan = subscription.metadata?.plan as "monthly" | "yearly" | undefined;
  if (!userId) {
    console.warn("[stripe-webhook] subscription sans metadata user", subscription.id);
    return;
  }
  await upsertSubscription(supabase, subscription, userId, plan ?? "monthly");
}

async function upsertSubscription(
  supabase: ReturnType<typeof createClient>,
  sub: Stripe.Subscription,
  userId: string,
  plan: "monthly" | "yearly",
) {
  const status = mapStripeStatus(sub.status);
  const row = {
    user_id: userId,
    status,
    plan,
    stripe_customer_id: sub.customer as string,
    stripe_subscription_id: sub.id,
    current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
    current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    cancel_at_period_end: sub.cancel_at_period_end ?? false,
    updated_at: new Date().toISOString(),
  };

  // Upsert sur stripe_subscription_id (unique dans la DB)
  const { error } = await supabase
    .from("subscriptions")
    .upsert(row, { onConflict: "stripe_subscription_id" });

  if (error) {
    throw new Error(`Supabase upsert error: ${error.message}`);
  }
  console.log(`[stripe-webhook] subscription ${sub.id} → ${status}`);
}

function mapStripeStatus(
  s: Stripe.Subscription.Status,
): "active" | "cancelled" | "expired" | "past_due" | "incomplete" {
  switch (s) {
    case "active":
    case "trialing":
      return "active";
    case "canceled":
      return "cancelled";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "incomplete":
    case "incomplete_expired":
      return "incomplete";
    default:
      return "expired";
  }
}
