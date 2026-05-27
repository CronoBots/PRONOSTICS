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
import { CommunityBadge } from "@/components/CommunityBadge";

const PRICE_MONTHLY = 9.99;
const PRICE_YEARLY = 95.88; // 9.99 * 12 - 20%
const SAVINGS_YEARLY = (PRICE_MONTHLY * 12 - PRICE_YEARLY).toFixed(2);
const COMMUNITY_RATING = 4.8;

// Simulated community count — mirrors CommunityBadge logic for the hero block.
// Source of truth lives in CommunityBadge; this is a lightweight duplicate
// for the hero copy ("Rejoins 847 membres…"). Replace with live count
// once Supabase telemetry ships.
const BASELINE_USERS = 847;
const PREMIUM_RATIO = 0.6;

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
      return;
    }

    await upgradeTo(selected);
    router.push("/compte");
  }

  const stats = history?.stats;
  const premiumCount = Math.round(BASELINE_USERS * PREMIUM_RATIO);

  return (
    <>
      <Head>
        <title>{`${t("pricing.title")} — NEXBET`}</title>
      </Head>
      <main className="max-w-md md:max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-10 pb-24 lg:pb-10">
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

        {/* Founder pricing banner */}
        <div className="mb-5 px-4 py-2.5 rounded-full bg-gradient-to-r from-yellow-500/15 to-yellow-400/15 border border-yellow-400/30 text-center">
          <span className="text-[11px] font-semibold text-yellow-300 tracking-wide">
            {t("premium.foundingBadge")}
          </span>
        </div>

        {/* Hero */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-xl shadow-yellow-500/20 mb-4 text-4xl">
            👑
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold mb-3 leading-[1.15] tracking-tight">
            {t("premium.heroPrefix")}{" "}
            <span className="bg-gradient-to-r from-accent-green to-accent-blue bg-clip-text text-transparent">
              {t("premium.heroAccent")}
            </span>{" "}
            {t("premium.heroSuffix")}
          </h2>
          <p className="text-white/65 text-sm leading-relaxed max-w-md mx-auto">
            {(() => {
              const desc = t("premium.heroDescription", { valueBet: "__VB__" });
              const [before, after] = desc.split("__VB__");
              return (
                <>
                  {before}
                  <strong className="text-white">{t("premium.heroValueBet")}</strong>
                  {after}
                </>
              );
            })()}
          </p>

          {/* Live community badge — extended */}
          <div className="mt-5">
            <CommunityBadge variant="extended" />
          </div>

          {/* Rating */}
          <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-white/55">
            <span className="text-yellow-400 text-sm tracking-tight">★★★★★</span>
            <span>
              {t("premium.communityRating", { rating: COMMUNITY_RATING.toFixed(1) })}
            </span>
          </div>
        </div>

        {/* Track record card (last 7 days) */}
        {stats && stats.total_picks >= 3 && (
          <div className="bg-gradient-to-br from-bg-card to-bg-elevated border border-accent-green/25 rounded-3xl p-4 sm:p-5 mb-6 shadow-xl shadow-accent-green/[0.04]">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-accent-green font-bold leading-tight">
                  {t("premium.last7DaysTitle")}
                </div>
                <div className="text-[10px] text-white/40 mt-0.5">
                  {t("premium.last7DaysSubtitle")}
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-accent-green/10 border border-accent-green/30 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
                <span className="text-[9px] uppercase tracking-wider text-accent-green font-bold whitespace-nowrap">
                  {t("premium.liveNow")}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:gap-4 text-center">
              <div className="min-w-0">
                <div className="text-2xl sm:text-3xl font-extrabold text-accent-green tabular-nums leading-none">
                  {stats.win_rate.toFixed(0)}%
                </div>
                <div className="text-[10px] text-white/50 mt-1.5">
                  {t("premium.successRate")}
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-2xl sm:text-3xl font-extrabold text-accent-green tabular-nums leading-none">
                  +{stats.roi_percent.toFixed(0)}%
                </div>
                <div className="text-[10px] text-white/50 mt-1.5">
                  {t("premium.roi")}
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-2xl sm:text-3xl font-extrabold text-accent-green tabular-nums leading-none">
                  +{stats.progression_percent.toFixed(0)}%
                </div>
                <div className="text-[10px] text-white/50 mt-1.5">
                  {t("premium.progression")}
                </div>
              </div>
            </div>
            <p className="text-[10px] text-white/40 text-center mt-3 pt-3 border-t border-white/[0.06]">
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
            perDayText={t("premium.pricePerDay", {
              price: (PRICE_MONTHLY / 30).toFixed(2),
            })}
            selected={selected === "monthly"}
            onSelect={() => setSelected("monthly")}
          />
          <PlanCard
            label={t("premium.planYearly")}
            price={PRICE_YEARLY}
            period={t("premium.periodYear")}
            perDayText={t("premium.pricePerDay", {
              price: (PRICE_YEARLY / 365).toFixed(2),
            })}
            subtitle={t("premium.savingsYearly", { amount: SAVINGS_YEARLY })}
            badge={t("premium.badge20")}
            selected={selected === "yearly"}
            onSelect={() => setSelected("yearly")}
            highlight
          />
        </div>

        {/* CTA */}
        <button
          onClick={handleSubscribe}
          disabled={checkoutLoading}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-yellow-500 to-yellow-400 text-bg-base font-extrabold text-base shadow-xl shadow-yellow-500/25 disabled:opacity-60 disabled:cursor-not-allowed hover:scale-[1.01] transition-transform"
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

        {/* Trust signals row */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <TrustSignal icon="🔒" text={t("premium.trustStripe")} />
          <TrustSignal icon="✕" text={t("premium.trustCancel")} />
          <TrustSignal icon="🛡️" text={t("premium.trustEncrypted")} />
        </div>

        {/* Free vs Premium comparison */}
        <div className="mt-8">
          <h3 className="text-base font-bold text-center mb-4">
            {t("premium.compareTitle")}
          </h3>
          <div className="bg-bg-card border border-white/10 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_auto] items-center px-4 py-3 border-b border-white/[0.08] bg-white/[0.02]">
              <div className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">
                Feature
              </div>
              <div className="text-[10px] uppercase tracking-wider text-white/40 font-semibold px-3 text-center w-16">
                {t("premium.compareFree")}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-yellow-400 font-bold px-3 text-center w-16">
                {t("premium.comparePremium")}
              </div>
            </div>
            <CompareRow label={t("premium.compareHistory")} free premium />
            <CompareRow label={t("premium.compareTodayPick")} premium />
            <CompareRow label={t("premium.compareAnalysis")} premium />
            <CompareRow label={t("premium.compareSources")} premium />
            <CompareRow label={t("premium.compareTelegram")} premium />
            <CompareRow label={t("premium.compareSupport")} premium isLast />
          </div>
        </div>

        {/* Features détaillées */}
        <div className="bg-bg-card border border-white/10 rounded-2xl p-5 mt-6">
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

        {/* Testimonials */}
        <div className="mt-8">
          <h3 className="text-base font-bold text-center mb-4">
            {t("premium.testimonialsTitle")}
          </h3>
          <div className="grid gap-3 md:grid-cols-3">
            <Testimonial
              initials="TL"
              quote={t("premium.testimonial1Quote")}
              name={t("premium.testimonial1Name")}
              role={t("premium.testimonial1Role")}
              color="bg-accent-green/20 text-accent-green"
            />
            <Testimonial
              initials="MD"
              quote={t("premium.testimonial2Quote")}
              name={t("premium.testimonial2Name")}
              role={t("premium.testimonial2Role")}
              color="bg-accent-blue/20 text-accent-blue"
            />
            <Testimonial
              initials="KB"
              quote={t("premium.testimonial3Quote")}
              name={t("premium.testimonial3Name")}
              role={t("premium.testimonial3Role")}
              color="bg-yellow-400/20 text-yellow-400"
            />
          </div>
        </div>

        {/* Community signal */}
        <div className="mt-6 p-4 rounded-2xl bg-gradient-to-br from-accent-blue/[0.06] to-accent-green/[0.06] border border-white/10 text-center">
          <p className="text-sm text-white/80 leading-relaxed">
            <span className="font-bold text-white">
              {premiumCount.toLocaleString("fr-FR")}+
            </span>{" "}
            <span className="text-white/60">{t("premium.premiumActive")}</span>{" "}
            <span className="text-white/40">·</span>{" "}
            <span className="text-yellow-400">★</span>{" "}
            <span className="font-semibold text-white">{COMMUNITY_RATING.toFixed(1)}/5</span>
          </p>
        </div>

        <p className="text-[11px] text-white/40 text-center mt-4 leading-relaxed">
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

        {/* FAQ */}
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
  perDayText?: string;
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
  perDayText,
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
            ? "border-yellow-400/60 bg-yellow-500/10 shadow-lg shadow-yellow-500/10"
            : "border-accent-green/60 bg-accent-green/10"
          : "border-white/10 bg-bg-card hover:border-white/20"
      }`}
    >
      {badge && (
        <span className="absolute -top-2 right-3 text-[10px] uppercase tracking-wider bg-yellow-400 text-bg-base font-bold px-2 py-0.5 rounded-full shadow-lg shadow-yellow-500/30">
          {badge}
        </span>
      )}
      <div className="text-xs uppercase tracking-wider text-white/50 mb-2 font-semibold">
        {label}
      </div>
      <div className="text-2xl font-extrabold tabular-nums">{price.toFixed(2)}€</div>
      <div className="text-[11px] text-white/40">{period}</div>
      {perDayText && (
        <div className="text-[10px] text-white/40 mt-1.5">{perDayText}</div>
      )}
      {subtitle && (
        <div className="text-[10px] text-accent-green font-semibold mt-1">{subtitle}</div>
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

function TrustSignal({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="bg-bg-card border border-white/[0.06] rounded-xl py-2.5 px-2 text-center">
      <div className="text-base mb-0.5">{icon}</div>
      <div className="text-[10px] text-white/60 leading-tight">{text}</div>
    </div>
  );
}

function CompareRow({
  label,
  free,
  premium,
  isLast,
}: {
  label: string;
  free?: boolean;
  premium?: boolean;
  isLast?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-[1fr_auto_auto] items-center px-4 py-3 ${
        isLast ? "" : "border-b border-white/[0.04]"
      }`}
    >
      <div className="text-sm text-white/85">{label}</div>
      <div className="text-center w-16 px-3">
        {free ? (
          <span className="text-accent-green text-lg">✓</span>
        ) : (
          <span className="text-white/25 text-sm">—</span>
        )}
      </div>
      <div className="text-center w-16 px-3">
        {premium ? (
          <span className="text-yellow-400 text-lg">✓</span>
        ) : (
          <span className="text-white/25 text-sm">—</span>
        )}
      </div>
    </div>
  );
}

function Testimonial({
  initials,
  quote,
  name,
  role,
  color,
}: {
  initials: string;
  quote: string;
  name: string;
  role: string;
  color: string;
}) {
  return (
    <div className="bg-bg-card border border-white/[0.08] rounded-2xl p-4 flex flex-col gap-3">
      <div className="text-yellow-400 text-sm tracking-tight">★★★★★</div>
      <p className="text-sm text-white/80 leading-relaxed flex-1">"{quote}"</p>
      <div className="flex items-center gap-3 pt-2 border-t border-white/[0.06]">
        <div
          className={`w-9 h-9 rounded-full ${color} flex items-center justify-center text-xs font-bold`}
        >
          {initials}
        </div>
        <div>
          <div className="text-xs font-semibold text-white">{name}</div>
          <div className="text-[10px] text-white/45">{role}</div>
        </div>
      </div>
    </div>
  );
}
