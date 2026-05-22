import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";

import { PickDetail, pickFromSafe } from "@/components/PickDetail";
import { Skeleton } from "@/components/Skeleton";
import { useAuth } from "@/lib/auth";
import { fetchDay, fetchHistory } from "@/lib/dataSource";
import { localeForLang, useI18n } from "@/lib/i18n";
import { DayPayload, History, SPORT_EMOJIS, SPORT_LABELS } from "@/lib/types";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function TodayPage() {
  const [day, setDay] = useState<DayPayload | null>(null);
  const [history, setHistory] = useState<History | null>(null);
  const [date, setDate] = useState(todayIso());
  const [loading, setLoading] = useState(true);
  const { user, ready } = useAuth();
  const { t } = useI18n();

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchHistory(), fetchDay(date)]).then(([h, d]) => {
      if (cancelled) return;
      setDay(d);
      setHistory(h);
      if (!d?.safe_pick && h) {
        const lastPending = [...h.picks].reverse().find((p) => p.outcome === "pending");
        if (lastPending) setDate(lastPending.date);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [date]);

  const isPremium = ready && user?.isPremium;
  const isLocked = ready && (!user || !user.isPremium);

  return (
    <>
      <Head>
        <title>{t("today.titleTab")}</title>
      </Head>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-10">
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/"
            className="w-9 h-9 rounded-full bg-bg-card border border-white/5 flex items-center justify-center text-white/60 hover:text-white transition"
            aria-label={t("common.back")}
          >
            ←
          </Link>
          <h1 className="text-lg font-bold tracking-tight">{t("today.title")}</h1>
        </div>

        {loading && (
          <div className="space-y-4 animate-fade-in">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
        )}

        {!loading && !day?.safe_pick && <NoPickToday />}

        {!loading && day?.safe_pick && isLocked && (
          <PremiumGate pick={day.safe_pick} history={history} />
        )}

        {!loading && day?.safe_pick && isPremium && (
          <PickDetail pick={pickFromSafe(day.safe_pick)} variant="today" />
        )}
      </main>
    </>
  );
}

function NoPickToday() {
  const { t } = useI18n();
  return (
    <div className="bg-bg-card border border-white/10 rounded-2xl p-8 text-center">
      <div className="text-5xl mb-3">🧘</div>
      <p className="text-base font-semibold mb-2">{t("today.noPickTitle")}</p>
      <p className="text-sm text-white/50 leading-relaxed max-w-sm mx-auto">
        {t("today.noPickBody")}
      </p>
      <p className="text-xs text-white/40 mt-4 italic">
        {t("today.noPickFooter")}
      </p>
    </div>
  );
}

function PremiumGate({
  pick,
  history,
}: {
  pick: NonNullable<DayPayload["safe_pick"]>;
  history: History | null;
}) {
  const { t, lang } = useI18n();
  const stats = history?.stats;
  const isCombo = pick.sport === "combo";
  const sportEmoji = isCombo ? "🎯" : SPORT_EMOJIS[pick.sport] || "🎯";
  const sportLabel = isCombo
    ? t("today.comboLabel")
    : SPORT_LABELS[pick.sport] || pick.sport;
  const kickoffDate = new Date(pick.kickoff);
  const kickoffText = kickoffDate.toLocaleString(localeForLang(lang), {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Pour les combinés on masque league + matchup (qui dévoileraient les noms d'équipes
  // donc le pari complet). On affiche juste un compteur générique de jambes + sports.
  // Pour un pick simple, "Équipe A vs Équipe B" ne révèle pas qui on mise → OK d'afficher.

  return (
    <div className="space-y-4">
      {/* Card teaser — révèle les infos non-confidentielles, masque le pick */}
      <div className="relative bg-bg-card border-2 border-yellow-400/30 rounded-3xl overflow-hidden">
        {/* Header avec sport + kickoff */}
        <div className="bg-gradient-to-r from-accent-green/10 to-accent-blue/10 px-5 py-3 border-b border-white/5">
          <div className="flex items-center gap-2 text-xs text-white/70">
            <span className="text-base">{sportEmoji}</span>
            <span className="font-semibold">{sportLabel}</span>
            <span className="text-white/30">·</span>
            <span className="capitalize">{kickoffText}</span>
          </div>
          {!isCombo && (
            <div className="text-xs text-white/50 mt-0.5">{pick.league}</div>
          )}
        </div>

        {/* Match teaser — masqué pour les combinés (révélerait les équipes pariées) */}
        <div className="px-5 py-5">
          {!isCombo ? (
            <div className="text-xl font-bold leading-tight mb-3">
              {pick.home_team}{" "}
              <span className="text-white/30 text-base font-normal">vs</span>{" "}
              {pick.away_team}
            </div>
          ) : (
            <div className="mb-3 flex items-center gap-3 bg-bg-elevated/30 rounded-xl p-3">
              <div className="text-2xl">🎯🔒</div>
              <div className="flex-1">
                <div className="text-sm font-bold leading-tight">
                  {t("today.comboTeaserTitle")}
                </div>
                <div className="text-[11px] text-white/50 mt-0.5">
                  {t("today.comboTeaserHint")}
                </div>
              </div>
            </div>
          )}

          {/* Stats publiques */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-bg-elevated/40 rounded-lg p-2 text-center">
              <div className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">
                {t("pick.cote")}
              </div>
              <div className="text-sm font-bold tabular-nums">
                {pick.odds.toFixed(2)}
              </div>
            </div>
            <div className="bg-bg-elevated/40 rounded-lg p-2 text-center">
              <div className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">
                {t("today.confidence")}
              </div>
              <div className="text-sm font-bold text-accent-green tabular-nums">
                {(pick.model_probability * 100).toFixed(0)}%
              </div>
            </div>
            <div className="bg-bg-elevated/40 rounded-lg p-2 text-center">
              <div className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">
                {t("today.ev")}
              </div>
              <div className="text-sm font-bold text-accent-green tabular-nums">
                +{(pick.expected_value * 100).toFixed(0)}%
              </div>
            </div>
          </div>

          {/* Section masquée — le pick + analyse */}
          <div className="relative">
            <div className="bg-bg-elevated/30 rounded-xl p-4 select-none filter blur-sm">
              <div className="text-[10px] uppercase tracking-wider text-accent-green/80 font-bold mb-1">
                {t("today.thePick")}
              </div>
              <div className="text-lg font-extrabold mb-2">▓▓▓▓▓▓ ▓▓▓▓▓▓▓</div>
              <div className="text-xs text-white/60 leading-relaxed">
                {"▓".repeat(60)} {"▓".repeat(45)} {"▓".repeat(80)}
              </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-3xl">🔒</div>
            </div>
          </div>

          {/* Liste des bonus Premium */}
          <ul className="text-xs text-white/70 mt-4 space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-accent-green">✓</span>
              <span>
                <strong className="text-white/90">
                  {t("today.analysisPoints", { n: pick.rationale?.length ?? 45 })}
                </strong>{" "}
                {t("today.analysisPointsStructured")}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent-green">✓</span>
              <span>
                <strong className="text-white/90">
                  {t("today.webSources", { n: pick.sources?.length ?? 3 })}
                </strong>{" "}
                {t("today.webSourcesVerifiable")}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent-green">✓</span>
              <span>{t("today.top5Excluded")}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent-green">✓</span>
              <span>{t("today.bookmakerLinks")}</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Social proof (track record) */}
      {stats && stats.total_picks >= 3 && (
        <div className="bg-bg-card border border-accent-green/20 rounded-2xl p-4">
          <div className="text-[10px] uppercase tracking-wider text-accent-green font-bold mb-2 text-center">
            {t("today.trackRecord")}
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-xl font-bold text-accent-green tabular-nums">
                {stats.win_rate.toFixed(0)}%
              </div>
              <div className="text-[10px] text-white/50">{t("today.successRate")}</div>
            </div>
            <div>
              <div className="text-xl font-bold text-accent-green tabular-nums">
                +{stats.roi_percent.toFixed(0)}%
              </div>
              <div className="text-[10px] text-white/50">{t("today.roi")}</div>
            </div>
            <div>
              <div className="text-xl font-bold text-accent-green tabular-nums">
                ×{(stats.current_bankroll / stats.starting_bankroll).toFixed(1)}
              </div>
              <div className="text-[10px] text-white/50">{t("today.bankrollMultiplier")}</div>
            </div>
          </div>
          <p className="text-[10px] text-white/40 text-center mt-2">
            {t("today.historyLine", {
              won: stats.won,
              lost: stats.lost,
              total: stats.total_picks,
            })}{" "}
            <Link href="/paris" className="text-accent-blue hover:underline">
              {t("today.viewFullHistory")}
            </Link>
          </p>
        </div>
      )}

      {/* CTA Premium */}
      <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-400/5 border border-yellow-400/30 rounded-2xl p-5">
        <div className="text-center mb-4">
          <div className="text-3xl mb-2">👑</div>
          <h3 className="text-lg font-bold mb-1">{t("today.discoverFullPick")}</h3>
          <p className="text-xs text-white/60">
            {t("today.premiumReserved")}
          </p>
        </div>
        <Link
          href="/premium"
          className="block py-3.5 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-400 text-bg-base font-extrabold text-center"
        >
          {t("today.ctaPremium")}
        </Link>
        <p className="text-[10px] text-white/40 text-center mt-3">
          {t("today.footerNote")}
        </p>
      </div>

      {/* Lien historique secondaire */}
      <Link
        href="/paris"
        className="block text-center text-sm text-white/40 hover:text-white py-2"
      >
        {t("today.viewHistoryLink")}
      </Link>
    </div>
  );
}
