import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";

import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { fetchHistory } from "@/lib/dataSource";
import { History } from "@/lib/types";
import { isStripeEnabled, startCheckout } from "@/lib/stripe";
import { supabase } from "@/lib/supabase";

const PRICE_MONTHLY = 9.99;
const PRICE_YEARLY = 95.88; // 9.99 * 12 - 20% ≈ 95.88

export default function PremiumPage() {
  const { user, mode, upgradeTo } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [selected, setSelected] = useState<"monthly" | "yearly">("yearly");
  const [history, setHistory] = useState<History | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    fetchHistory().then(setHistory);
  }, []);

  async function handleSubscribe() {
    if (!user) {
      router.push("/login");
      return;
    }
    setCheckoutError(null);

    // Mode Supabase + Stripe activé → vrai checkout
    if (mode === "supabase" && isStripeEnabled() && supabase) {
      setCheckoutLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      if (!session?.access_token) {
        setCheckoutError(t("premium.checkoutSessionExpired"));
        setCheckoutLoading(false);
        return;
      }
      const result = await startCheckout(selected, session.access_token, supabaseUrl);
      if (!result.ok) {
        setCheckoutError(result.error ?? t("premium.checkoutError"));
        setCheckoutLoading(false);
      }
      // Si OK : window.location.href est déjà déclenché vers Stripe
      return;
    }

    // Mode mock (dev sans Stripe) → simulation locale
    await upgradeTo(selected);
    router.push("/compte");
  }

  const stats = history?.stats;

  return (
    <>
      <Head>
        <title>{`${t("pricing.title")} — WTF`}</title>
      </Head>
      <main className="max-w-md md:max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-10">
        <div className="flex items-center gap-3 mb-4">
          <Link
            href="/"
            className="lg:hidden w-9 h-9 rounded-full bg-bg-card border border-white/5 flex items-center justify-center text-white/60"
            aria-label={t("common.back")}
          >
            ←
          </Link>
          <h1 className="text-lg lg:text-2xl font-bold tracking-tight flex-1">
            {t("premium.pageTitle")}
          </h1>
        </div>

        {/* Hero */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-3">👑</div>
          <h2 className="text-2xl font-extrabold mb-2 leading-tight">
            {t("premium.heroPrefix")}{" "}
            <span className="bg-gradient-to-r from-accent-green to-accent-blue bg-clip-text text-transparent">
              {t("premium.heroAccent")}
            </span>{" "}
            {t("premium.heroSuffix")}
          </h2>
          <p className="text-white/60 text-sm leading-relaxed">
            {(() => {
              const desc = t("premium.heroDescription", {
                valueBet: "__VB__",
              });
              const [before, after] = desc.split("__VB__");
              return (
                <>
                  {before}
                  <strong className="text-white/90">{t("premium.heroValueBet")}</strong>
                  {after}
                </>
              );
            })()}
          </p>
        </div>

        {/* Track record (social proof) */}
        {stats && stats.total_picks >= 3 && (
          <div className="bg-bg-card border border-accent-green/20 rounded-2xl p-4 mb-6">
            <div className="text-[10px] uppercase tracking-wider text-accent-green font-bold mb-2 text-center">
              {t("premium.trackRecord")}
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-2xl font-bold text-accent-green tabular-nums">
                  {stats.win_rate.toFixed(0)}%
                </div>
                <div className="text-[10px] text-white/50">{t("premium.successRate")}</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-accent-green tabular-nums">
                  +{stats.roi_percent.toFixed(0)}%
                </div>
                <div className="text-[10px] text-white/50">{t("premium.roi")}</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-accent-green tabular-nums">
                  +{stats.progression_percent.toFixed(0)}%
                </div>
                <div className="text-[10px] text-white/50">{t("premium.progression")}</div>
              </div>
            </div>
            <p className="text-[10px] text-white/40 text-center mt-2">
              {t("premium.trackLine", {
                won: stats.won,
                lost: stats.lost,
                total: stats.total_picks,
              })}{" "}
              <Link href="/paris" className="text-accent-blue hover:underline">
                {t("premium.viewHistory")}
              </Link>
            </p>
          </div>
        )}

        {/* Plans */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <PlanCard
            label={t("premium.planMonthly")}
            price={PRICE_MONTHLY}
            period={t("premium.periodMonth")}
            selected={selected === "monthly"}
            onSelect={() => setSelected("monthly")}
          />
          <PlanCard
            label={t("premium.planYearly")}
            price={PRICE_YEARLY}
            period={t("premium.periodYear")}
            subtitle={t("premium.yearlySubtitle", { price: (PRICE_YEARLY / 12).toFixed(2) })}
            badge={t("premium.badge20")}
            selected={selected === "yearly"}
            onSelect={() => setSelected("yearly")}
            highlight
          />
        </div>

        {/* Features détaillées */}
        <div className="bg-bg-card border border-white/10 rounded-2xl p-5 mb-5">
          <ul className="space-y-3">
            <Feature
              icon="🎯"
              title={t("premium.featureSafePickTitle")}
              text={t("premium.featureSafePickText")}
            />
            <Feature
              icon="🧠"
              title={t("premium.featureAnalysisTitle")}
              text={t("premium.featureAnalysisText")}
            />
            <Feature
              icon="🔗"
              title={t("premium.featureSourcesTitle")}
              text={t("premium.featureSourcesText")}
            />
            <Feature
              icon="🎯"
              title={t("premium.featureComparisonTitle")}
              text={t("premium.featureComparisonText")}
            />
            <Feature
              icon="🔓"
              title={t("premium.featureNoCommitTitle")}
              text={t("premium.featureNoCommitText")}
            />
            <Feature
              icon="🇫🇷"
              title={t("premium.featureLangTitle")}
              text={t("premium.featureLangText")}
            />
          </ul>
        </div>

        {/* CTA */}
        <button
          onClick={handleSubscribe}
          disabled={checkoutLoading}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-yellow-500 to-yellow-400 text-bg-base font-extrabold text-base shadow-lg shadow-yellow-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {checkoutLoading
            ? t("premium.checkoutLoading")
            : t("premium.ctaChoose", {
                plan:
                  selected === "yearly"
                    ? t("premium.ctaChooseYearly")
                    : t("premium.ctaChooseMonthly"),
                price: (selected === "yearly" ? PRICE_YEARLY : PRICE_MONTHLY).toFixed(2),
              })}
        </button>

        {checkoutError && (
          <div className="mt-3 p-3 rounded-xl bg-accent-red/10 border border-accent-red/30 text-xs text-accent-red">
            ⚠️ {checkoutError}
          </div>
        )}

        <p className="text-[11px] text-white/40 text-center mt-3 leading-relaxed">
          {t("premium.paymentSecure")}
          <br />
          {t("premium.cancelAnytime")}
        </p>

        <p className="text-[10px] text-white/30 text-center mt-3">
          {t("premium.demoNotice")}
        </p>

        {/* Jeu responsable */}
        <div className="mt-6 p-3 rounded-xl bg-accent-red/[0.06] border border-accent-red/20">
          <p className="text-[11px] text-white/70 leading-relaxed text-center">
            <strong className="text-accent-red">{t("premium.responsibleGaming")}</strong>{" "}
            {t("premium.responsibleGamingText")}
          </p>
          <p className="text-[10px] text-white/50 text-center mt-2">
            {t("premium.helpline")}{" "}
            <Link href="/plus" className="text-accent-blue hover:underline">
              {t("premium.learnMore")}
            </Link>
          </p>
        </div>

        {/* FAQ rapide */}
        <div className="mt-8">
          <h3 className="text-xs uppercase tracking-wider text-white/40 font-semibold mb-3 px-1">
            {t("premium.faqTitle")}
          </h3>
          <FAQ q={t("premium.faqQ1")} a={t("premium.faqA1")} />
          <FAQ q={t("premium.faqQ2")} a={t("premium.faqA2")} />
          <FAQ q={t("premium.faqQ3")} a={t("premium.faqA3")} />
          <FAQ q={t("premium.faqQ4")} a={t("premium.faqA4")} />
        </div>
      </main>
    </>
  );
}

interface PlanProps {
  label: string;
  price: number;
  period: string;
  subtitle?: string;
  badge?: string;
  selected: boolean;
  highlight?: boolean;
  onSelect: () => void;
}

function PlanCard({
  label,
  price,
  period,
  subtitle,
  badge,
  selected,
  highlight,
  onSelect,
}: PlanProps) {
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
      {subtitle && (
        <div className="text-[10px] text-accent-green/80 mt-1">{subtitle}</div>
      )}
    </button>
  );
}

function Feature({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <li className="flex gap-3">
      <span className="text-xl shrink-0">{icon}</span>
      <div className="flex-1">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-white/60 leading-relaxed">{text}</div>
      </div>
    </li>
  );
}

function FAQ({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-bg-card border border-white/[0.06] rounded-xl mb-2 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 text-left flex items-center justify-between gap-3 hover:bg-white/[0.02]"
      >
        <span className="text-sm font-medium">{q}</span>
        <span className={`text-white/40 transition-transform ${open ? "rotate-90" : ""}`}>
          ›
        </span>
      </button>
      {open && (
        <div className="px-4 pb-3 text-xs text-white/60 leading-relaxed">{a}</div>
      )}
    </div>
  );
}
