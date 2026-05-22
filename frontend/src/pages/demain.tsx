import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";

import { Skeleton } from "@/components/Skeleton";
import { fetchAvailableDates, fetchDay } from "@/lib/dataSource";
import { localeForLang, useI18n } from "@/lib/i18n";
import { DayPayload, SPORT_EMOJIS, SPORT_LABELS } from "@/lib/types";

function tomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Page /demain — preview des matches et opportunités du lendemain.
 *
 * Comportement :
 * - Tente de charger les prédictions de demain (peut exister à l'avance)
 * - Si data dispo : affiche un teaser des matches (équipes, sport, kickoff,
 *   cote, EV) mais MASQUE le pick exact (réservé Premium + suspense)
 * - Si pas de data : message "L'analyse de demain sera disponible le matin"
 */
export default function DemainPage() {
  const { t, lang } = useI18n();
  const [day, setDay] = useState<DayPayload | null>(null);
  const [hasData, setHasData] = useState(true);
  const [loading, setLoading] = useState(true);
  const date = tomorrowIso();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const idx = await fetchAvailableDates();
      const dates = idx?.dates ?? [];
      if (!dates.includes(date)) {
        if (!cancelled) {
          setHasData(false);
          setLoading(false);
        }
        return;
      }
      const d = await fetchDay(date);
      if (!cancelled) {
        setDay(d);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [date]);

  const dateLabel = new Date(date + "T12:00:00Z").toLocaleDateString(
    localeForLang(lang),
    { weekday: "long", day: "numeric", month: "long" },
  );

  return (
    <>
      <Head>
        <title>{t("demain.titleTab")}</title>
      </Head>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-10">
        <div className="flex items-center gap-3 mb-4">
          <Link
            href="/"
            className="lg:hidden w-9 h-9 rounded-full bg-bg-card border border-white/5 flex items-center justify-center text-white/60 hover:text-white transition"
            aria-label={t("common.back")}
          >
            ←
          </Link>
          <div>
            <h1 className="text-lg lg:text-2xl font-bold tracking-tight">
              {t("demain.title")}
            </h1>
            <p className="text-xs lg:text-sm text-white/50 capitalize">{dateLabel}</p>
          </div>
        </div>

        {loading && (
          <div className="space-y-3 animate-fade-in">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
          </div>
        )}

        {!loading && !hasData && <NotReadyYet />}

        {!loading && hasData && day && <TeaserView day={day} />}
      </main>
    </>
  );
}

function NotReadyYet() {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      <div className="bg-bg-card border border-white/[0.06] shadow-card rounded-2xl p-6 text-center">
        <div className="text-5xl mb-3">🔮</div>
        <h2 className="text-base font-semibold mb-2">{t("demain.notReadyTitle")}</h2>
        <p className="text-sm text-white/60 leading-relaxed max-w-md mx-auto">
          {t("demain.notReadyBody")}
        </p>
      </div>

      <div className="bg-bg-card border border-white/[0.06] shadow-card rounded-2xl p-5">
        <h3 className="text-xs uppercase tracking-wider text-white/50 font-semibold mb-3">
          {t("demain.scopeTitle")}
        </h3>
        <ul className="space-y-2 text-sm">
          <ScopeRow emoji="⚽" label={t("demain.sportFootball")} />
          <ScopeRow emoji="🎾" label={t("demain.sportTennis")} />
          <ScopeRow emoji="🏀" label={t("demain.sportBasket")} />
          <ScopeRow emoji="🏈" label={t("demain.sportNfl")} />
          <ScopeRow emoji="⚾" label={t("demain.sportMlb")} />
          <ScopeRow emoji="🏒" label={t("demain.sportNhl")} />
        </ul>
      </div>

      <div className="bg-gradient-to-br from-accent-green/10 to-accent-blue/10 border border-accent-green/30 rounded-2xl p-5 text-center">
        <p className="text-sm text-white/80 leading-relaxed mb-3">
          {t("demain.criteriaLine1")}
        </p>
        <p className="text-xs text-white/60">{t("demain.criteriaLine2")}</p>
      </div>

      <Link
        href="/today"
        className="block bg-bg-card border border-accent-green/30 shadow-card rounded-2xl p-4 text-center hover:border-accent-green/50 transition"
      >
        <div className="text-xs uppercase tracking-wider text-accent-green font-semibold mb-1">
          {t("demain.cta")}
        </div>
        <div className="text-sm text-white/70">{t("demain.ctaSub")}</div>
      </Link>
    </div>
  );
}

function ScopeRow({ emoji, label }: { emoji: string; label: string }) {
  return (
    <li className="flex items-center gap-3">
      <span className="text-xl">{emoji}</span>
      <span className="text-white/80">{label}</span>
    </li>
  );
}

function TeaserView({ day }: { day: DayPayload }) {
  const { t, lang } = useI18n();
  const pick = day.safe_pick;
  const valuePicks = day.value_picks ?? [];

  if (!pick && valuePicks.length === 0) return <NotReadyYet />;

  return (
    <div className="space-y-4">
      {pick && (
        <div className="bg-bg-card border border-accent-green/30 shadow-card rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-accent-green/15 to-accent-blue/10 px-5 py-3 border-b border-white/5 flex items-center gap-2">
            <span className="text-base">{SPORT_EMOJIS[pick.sport] || "🎯"}</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-accent-green">
              {t("demain.previewBadge")}
            </span>
          </div>
          <div className="p-5">
            <div className="text-xs text-white/50 mb-1">
              {SPORT_LABELS[pick.sport] || pick.sport} · {pick.league}
            </div>
            <div className="text-base font-bold mb-3">
              {pick.home_team}{" "}
              <span className="text-white/40 text-sm font-normal">vs</span>{" "}
              {pick.away_team}
            </div>
            <div className="text-[11px] text-white/40 mb-3">
              {new Date(pick.kickoff).toLocaleString(localeForLang(lang), {
                weekday: "long",
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <Stat label={t("pick.cote")} value={pick.odds.toFixed(2)} />
              <Stat
                label={t("today.confidence")}
                value={`${(pick.model_probability * 100).toFixed(0)}%`}
                tone="green"
              />
              <Stat
                label={t("today.ev")}
                value={`+${(pick.expected_value * 100).toFixed(0)}%`}
                tone="green"
              />
            </div>
            <div className="bg-bg-elevated/40 rounded-xl p-3 select-none">
              <div className="text-[10px] uppercase tracking-wider text-accent-green/80 font-bold mb-1">
                {t("today.thePick")}
              </div>
              <div className="text-base font-extrabold filter blur-sm">
                ▓▓▓▓▓▓ ▓▓▓▓▓▓▓
              </div>
              <div className="text-[11px] text-white/50 mt-1">
                {t("demain.lockedHint")}
              </div>
            </div>
          </div>
        </div>
      )}

      {valuePicks.length > 0 && (
        <div className="bg-bg-card border border-white/[0.06] shadow-card rounded-2xl p-5">
          <h3 className="text-xs uppercase tracking-wider text-white/50 font-semibold mb-3">
            {t("demain.otherOpportunities", { n: valuePicks.length })}
          </h3>
          <div className="space-y-2">
            {valuePicks.slice(0, 5).map((vp, i) => (
              <div
                key={i}
                className="bg-bg-elevated/40 rounded-xl p-3 flex items-center gap-3"
              >
                <span className="text-xl">{SPORT_EMOJIS[vp.sport] || "🎯"}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {vp.home_team} vs {vp.away_team}
                  </div>
                  <div className="text-[11px] text-white/40 truncate">
                    {vp.league} ·{" "}
                    {new Date(vp.kickoff).toLocaleTimeString(localeForLang(lang), {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold tabular-nums">
                    @ {vp.odds.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-accent-green tabular-nums">
                    EV +{(vp.expected_value * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-gradient-to-br from-accent-green/10 to-accent-blue/10 border border-accent-green/30 rounded-2xl p-5 text-center">
        <p className="text-sm text-white/80 leading-relaxed">{t("demain.finalNote")}</p>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "green";
}) {
  return (
    <div className="bg-bg-elevated/40 rounded-lg p-2 text-center">
      <div className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">
        {label}
      </div>
      <div
        className={`text-sm font-bold tabular-nums ${
          tone === "green" ? "text-accent-green" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
