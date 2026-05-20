import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";

import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

const FEATURES: string[] = [
  "pricing.featurePick",
  "pricing.featureAnalysis",
  "pricing.featureSources",
  "pricing.featureNotif",
  "pricing.featureHistory",
  "pricing.featureCancel",
];

const PRICE_MONTHLY = 9.99;
const PRICE_YEARLY = 95.88; // 9.99 * 12 - 20% ≈ 95.88

export default function PremiumPage() {
  const { user, upgradeTo } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [selected, setSelected] = useState<"monthly" | "yearly">("yearly");

  function handleSubscribe() {
    if (!user) {
      router.push("/login");
      return;
    }
    // Phase 1 : on simule l'abonnement (Phase 2 → Stripe Checkout)
    upgradeTo(selected);
    router.push("/compte");
  }

  return (
    <>
      <Head>
        <title>{t("pricing.title")} — WTF</title>
      </Head>
      <main className="max-w-md mx-auto px-4 md:px-6 py-6 md:py-10">
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/"
            className="w-9 h-9 rounded-full bg-bg-card border border-white/5 flex items-center justify-center text-white/60"
            aria-label="Retour"
          >
            ←
          </Link>
          <h1 className="text-lg font-bold tracking-tight flex-1">{t("pricing.title")}</h1>
        </div>

        <div className="text-center mb-6">
          <div className="text-5xl mb-2">👑</div>
          <p className="text-white/60 text-sm">{t("pricing.subtitle")}</p>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <PlanCard
            label={t("pricing.monthly")}
            price={PRICE_MONTHLY}
            period={t("premium.month")}
            selected={selected === "monthly"}
            onSelect={() => setSelected("monthly")}
          />
          <PlanCard
            label={t("pricing.yearly")}
            price={PRICE_YEARLY}
            period={t("premium.year")}
            badge={t("pricing.save")}
            selected={selected === "yearly"}
            onSelect={() => setSelected("yearly")}
            highlight
          />
        </div>

        {/* Features */}
        <ul className="bg-bg-card border border-white/10 rounded-2xl p-4 mb-6 space-y-2.5">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm">
              <span className="text-accent-green mt-0.5">✓</span>
              <span className="text-white/80">{t(f)}</span>
            </li>
          ))}
        </ul>

        <button
          onClick={handleSubscribe}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-400 text-bg-base font-bold text-base"
        >
          👑 {t("pricing.cta")}
        </button>

        <p className="text-[11px] text-white/30 text-center mt-4">
          Phase 1 démo — aucun paiement réel n'est effectué. Phase 2 intégrera Stripe.
        </p>
      </main>
    </>
  );
}

interface PlanProps {
  label: string;
  price: number;
  period: string;
  badge?: string;
  selected: boolean;
  highlight?: boolean;
  onSelect: () => void;
}

function PlanCard({ label, price, period, badge, selected, highlight, onSelect }: PlanProps) {
  return (
    <button
      onClick={onSelect}
      className={`relative text-left rounded-2xl p-4 border transition ${
        selected
          ? highlight
            ? "border-yellow-400/60 bg-yellow-500/10"
            : "border-accent-green/60 bg-accent-green/10"
          : "border-white/10 bg-bg-card hover:border-white/20"
      }`}
    >
      {badge && (
        <span className="absolute -top-2 right-3 text-[10px] uppercase tracking-wider bg-yellow-400 text-bg-base font-bold px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
      <div className="text-xs uppercase tracking-wider text-white/50 mb-2">{label}</div>
      <div className="text-2xl font-bold tabular-nums">{price.toFixed(2)}€</div>
      <div className="text-[11px] text-white/40">{period}</div>
    </button>
  );
}
