/**
 * DailyStatusCard — composant central de la Home.
 *
 * Transforme la Home en moment de check-in quotidien.
 * 5 états possibles selon l'historique :
 *
 *   1. PENDING       — un pari est en cours (jambes visibles + countdown)
 *   2. WON_YESTERDAY — on vient de gagner (célébration, +bankroll)
 *   3. LOST_YESTERDAY— défaite hier (empathie, lesson learned)
 *   4. NEW_PICK      — pick du jour disponible (CTA vers /today)
 *   5. NO_PICK       — aucun pari du jour (discipline reminder)
 */

import Link from "next/link";

import { useAuth } from "@/lib/auth";
import { localeForLang, useI18n } from "@/lib/i18n";
import { HistoryPick, History } from "@/lib/types";

interface Props {
  history: History;
  hasPickToday: boolean;
}

function isWithinHours(iso: string, hours: number): boolean {
  if (!iso) return false;
  const now = Date.now();
  const ts = new Date(iso).getTime();
  const diffH = (now - ts) / (1000 * 60 * 60);
  return diffH >= 0 && diffH <= hours;
}

type TFn = (key: string, vars?: Record<string, string | number>) => string;

function timeUntil(iso: string, t: TFn): string {
  const ts = new Date(iso).getTime();
  const now = Date.now();
  const diffM = Math.round((ts - now) / (1000 * 60));
  if (diffM < 0) return t("time.live");
  if (diffM < 60) return t("time.inMinutes", { n: diffM });
  const h = Math.floor(diffM / 60);
  const m = diffM % 60;
  if (h < 24) return t("time.inHoursMinutes", { h, m: m.toString().padStart(2, "0") });
  const d = Math.floor(h / 24);
  return t("time.inDays", { n: d });
}

function fmtDateRelative(iso: string, t: TFn, locale: string): string {
  const d = new Date(iso + "T12:00:00Z");
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const pickDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((today.getTime() - pickDay.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return t("time.today");
  if (diffDays === 1) return t("time.yesterday");
  if (diffDays < 7) return t("time.daysAgo", { n: diffDays });
  return d.toLocaleDateString(locale, { day: "numeric", month: "short" });
}

export function DailyStatusCard({ history, hasPickToday }: Props) {
  const picks = history.picks;
  const pending = picks.find((p) => p.outcome === "pending");

  // Dernière issue réglée dans les 24h
  const lastSettled = [...picks]
    .reverse()
    .find((p) => p.outcome === "win" || p.outcome === "loss");
  const recentSettled =
    lastSettled && isWithinHours(`${lastSettled.date}T23:00:00Z`, 36)
      ? lastSettled
      : null;

  // === STATE 1 : pari en cours ===
  if (pending) {
    return <PendingState pick={pending} />;
  }

  // === STATE 2 / 3 : résultat récent (gagné/perdu hier) ===
  if (recentSettled) {
    return recentSettled.outcome === "win" ? (
      <WonState pick={recentSettled} stats={history.stats} />
    ) : (
      <LostState pick={recentSettled} stats={history.stats} />
    );
  }

  // === STATE 4 : pick du jour dispo (rien en cours) ===
  if (hasPickToday) {
    return <NewPickState />;
  }

  // === STATE 5 : aucun pick aujourd'hui ===
  return <NoPickState />;
}

// ============================================================================
// State 1 : PENDING
// ============================================================================

function PendingState({ pick }: { pick: HistoryPick }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const isPremium = !!user?.isPremium;
  const stake = pick.stake;
  const potentialGain = stake * (pick.odds - 1);
  const isCombo = pick.match.sport === "combo" && pick.legs && pick.legs.length > 0;

  // Premier kickoff parmi les jambes (pour countdown)
  const latestKickoff = isCombo
    ? pick.legs!.reduce((max, l) => (l.kickoff > max ? l.kickoff : max), pick.legs![0].kickoff)
    : pick.match.kickoff;

  // Gating Premium : pour les non-Premium on masque les noms d'équipes (qui révèleraient
  // le pari complet). On garde les stats agrégées (cote, mise, gain potentiel, countdown).
  const titleText = isPremium
    ? (isCombo ? t("status.combinedLegs", { n: pick.legs!.length }) : pick.pick)
    : t("status.pendingLockedTitle");

  return (
    <Link
      href={isPremium ? "/paris" : "/premium"}
      className="block bg-gradient-to-br from-yellow-400/10 to-accent-blue/10 border-2 border-yellow-400/30 rounded-2xl p-4 hover:border-yellow-400/50 transition animate-fade-in"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-wider text-yellow-400 font-bold mb-0.5 flex items-center gap-1.5">
            <span>{t("status.pendingLabel")}</span>
            {!isPremium && <span className="text-white/40 normal-case">🔒</span>}
          </div>
          <div className="text-base font-bold leading-tight truncate">{titleText}</div>
          {!isPremium && (
            <div className="text-[11px] text-white/40 mt-0.5">
              {t("status.pendingLockedHint")}
            </div>
          )}
        </div>
        <div className="text-right shrink-0 ml-3">
          <div className="text-[10px] text-white/40">{t("status.cote")}</div>
          <div className="text-base font-bold tabular-nums">{pick.odds.toFixed(2)}</div>
        </div>
      </div>

      {/* Jambes individuelles : visibles UNIQUEMENT pour Premium (révèlent les équipes pariées) */}
      {isPremium && isCombo && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {pick.legs!.map((leg, i) => {
            const isWin = leg.outcome === "win";
            const isLoss = leg.outcome === "loss";
            return (
              <span
                key={i}
                className={`text-[10px] px-2 py-0.5 rounded-full border ${
                  isWin
                    ? "text-accent-green bg-accent-green/10 border-accent-green/30"
                    : isLoss
                      ? "text-accent-red bg-accent-red/10 border-accent-red/30"
                      : "text-yellow-400 bg-yellow-400/10 border-yellow-400/30"
                }`}
              >
                {isWin ? "✓ " : isLoss ? "✕ " : "⏳ "}
                {leg.pick.substring(0, 28)}
                {leg.pick.length > 28 ? "…" : ""}
              </span>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between text-xs">
        <div className="text-white/60">
          {t("status.stake")} <strong className="text-white">{stake.toFixed(2)}€</strong> ·{" "}
          {t("status.potentialGain")}{" "}
          <strong className="text-accent-green">+{potentialGain.toFixed(2)}€</strong>
        </div>
        <div className="text-yellow-400 font-semibold">{timeUntil(latestKickoff, t)}</div>
      </div>
    </Link>
  );
}

// ============================================================================
// State 2 : WON yesterday
// ============================================================================

function WonState({ pick, stats }: { pick: HistoryPick; stats: History["stats"] }) {
  const { t, lang } = useI18n();
  const locale = localeForLang(lang);
  return (
    <Link
      href="/paris"
      className="block bg-gradient-to-br from-accent-green/15 to-accent-green/5 border-2 border-accent-green/40 rounded-2xl p-4 hover:border-accent-green/60 transition animate-fade-in relative overflow-hidden"
    >
      {/* Confettis stylisés */}
      <div className="absolute top-2 right-2 text-3xl opacity-50">🎉</div>

      <div className="text-[10px] uppercase tracking-wider text-accent-green font-bold mb-1">
        {t("status.wonLabel", { date: fmtDateRelative(pick.date, t, locale) })}
      </div>
      <div className="text-base font-bold leading-tight mb-2">
        {pick.match.sport === "combo" ? t("status.combinedWon") : pick.pick}
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-bg-base/40 rounded-lg p-2">
          <div className="text-[10px] text-white/40">{t("status.gain")}</div>
          <div className="text-base font-bold text-accent-green tabular-nums">
            +{pick.profit.toFixed(2)}€
          </div>
        </div>
        <div className="bg-bg-base/40 rounded-lg p-2">
          <div className="text-[10px] text-white/40">{t("status.bankroll")}</div>
          <div className="text-base font-bold tabular-nums">{pick.bankroll_after.toFixed(2)}€</div>
        </div>
        <div className="bg-bg-base/40 rounded-lg p-2">
          <div className="text-[10px] text-white/40">{t("status.streak")}</div>
          <div className="text-base font-bold text-accent-green tabular-nums">
            +{stats.current_streak}
          </div>
        </div>
      </div>
    </Link>
  );
}

// ============================================================================
// State 3 : LOST yesterday
// ============================================================================

function LostState({ pick, stats }: { pick: HistoryPick; stats: History["stats"] }) {
  const { t, lang } = useI18n();
  const locale = localeForLang(lang);
  return (
    <Link
      href="/paris"
      className="block bg-gradient-to-br from-accent-red/10 to-bg-card border-2 border-accent-red/30 rounded-2xl p-4 hover:border-accent-red/50 transition animate-fade-in"
    >
      <div className="text-[10px] uppercase tracking-wider text-accent-red font-bold mb-1">
        {t("status.lostLabel", { date: fmtDateRelative(pick.date, t, locale) })}
      </div>
      <div className="text-base font-bold leading-tight mb-2">
        {pick.match.sport === "combo" ? t("status.combinedLost") : pick.pick}
      </div>

      <p className="text-xs text-white/60 leading-relaxed mb-3">
        {t("status.varianceMessage")}
      </p>

      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="bg-bg-base/40 rounded-lg p-2">
          <div className="text-[10px] text-white/40">{t("status.bankroll")}</div>
          <div className="text-base font-bold tabular-nums">{pick.bankroll_after.toFixed(2)}€</div>
        </div>
        <div className="bg-bg-base/40 rounded-lg p-2">
          <div className="text-[10px] text-white/40">{t("status.seasonRoi")}</div>
          <div
            className={`text-base font-bold tabular-nums ${
              stats.roi_percent >= 0 ? "text-accent-green" : "text-accent-red"
            }`}
          >
            {stats.roi_percent >= 0 ? "+" : ""}
            {stats.roi_percent.toFixed(0)}%
          </div>
        </div>
      </div>
    </Link>
  );
}

// ============================================================================
// State 4 : NEW PICK available today
// ============================================================================

function NewPickState() {
  const { t } = useI18n();
  return (
    <Link
      href="/today"
      className="block bg-gradient-to-br from-accent-green/20 to-accent-blue/15 border-2 border-accent-blue/40 rounded-2xl p-4 hover:border-accent-blue/60 transition animate-fade-in relative overflow-hidden group"
    >
      <span
        aria-hidden
        className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-accent-blue/20 blur-2xl group-hover:bg-accent-blue/30 transition"
      />
      <div className="text-[10px] uppercase tracking-wider text-accent-blue font-bold mb-1 relative">
        {t("status.newPickBadge")}
      </div>
      <div className="text-base font-bold leading-tight mb-1 relative">
        {t("status.newPickAvailable")}
      </div>
      <p className="text-xs text-white/60 leading-relaxed mb-3 relative">
        {t("status.newPickDescription")}
      </p>
      <div className="inline-flex items-center gap-1.5 text-sm font-bold text-accent-blue relative">
        {t("status.seePick")}
      </div>
    </Link>
  );
}

// ============================================================================
// State 5 : NO PICK today
// ============================================================================

function NoPickState() {
  const { t } = useI18n();
  return (
    <div className="bg-bg-card border border-white/10 rounded-2xl p-4 animate-fade-in">
      <div className="text-[10px] uppercase tracking-wider text-white/40 font-bold mb-1">
        {t("status.noPickBadge")}
      </div>
      <p className="text-sm text-white/70 leading-relaxed">
        {t("status.noPickBody")}
      </p>
      <p className="text-[11px] text-white/40 italic mt-2">
        {t("status.discipline")}
      </p>
    </div>
  );
}
