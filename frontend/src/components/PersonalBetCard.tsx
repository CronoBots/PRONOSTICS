import { useState } from "react";

import { showToast } from "@/components/Toast";
import { useI18n, localeForLang } from "@/lib/i18n";
import { deleteBet, PersonalBet, PersonalOutcome, setOutcome } from "@/lib/personalBets";
import { SPORT_EMOJIS } from "@/lib/types";

interface Props {
  bet: PersonalBet;
  onEdit: () => void;
  onChanged: (next: PersonalBet | null) => void;
}

// Configuration visuelle par outcome — bordure latérale + badge status
const STATUS_CONFIG: Record<
  PersonalOutcome,
  { border: string; badge: string; key: string; icon: string }
> = {
  win: {
    border: "border-l-accent-green",
    badge: "bg-accent-green/15 text-accent-green border-accent-green/30",
    key: "perso.outcomeWin",
    icon: "✓",
  },
  loss: {
    border: "border-l-accent-red",
    badge: "bg-accent-red/15 text-accent-red border-accent-red/30",
    key: "perso.outcomeLoss",
    icon: "✕",
  },
  pending: {
    border: "border-l-yellow-400/60",
    badge: "bg-yellow-400/10 text-yellow-300 border-yellow-400/30",
    key: "perso.outcomePending",
    icon: "⏳",
  },
  void: {
    border: "border-l-accent-blue",
    badge: "bg-accent-blue/15 text-accent-blue border-accent-blue/30",
    key: "perso.outcomeVoid",
    icon: "○",
  },
};

export function PersonalBetCard({ bet, onEdit, onChanged }: Props) {
  const { t, lang } = useI18n();
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const emoji = SPORT_EMOJIS[bet.sport] || "🎯";

  const dateLabel = new Date(bet.pick_date + "T12:00:00Z").toLocaleDateString(
    localeForLang(lang),
    { day: "numeric", month: "short" },
  );

  async function mark(outcome: PersonalOutcome) {
    setBusy(true);
    const updated = await setOutcome(bet.id, outcome);
    setBusy(false);
    if (!updated) {
      showToast(t("perso.saveError"), { type: "error" });
      return;
    }
    onChanged(updated);
    showToast(t(`perso.markedAs.${outcome}`), { type: outcome === "win" ? "success" : outcome === "loss" ? "error" : "info" });
  }

  async function handleDelete() {
    setBusy(true);
    const ok = await deleteBet(bet.id);
    setBusy(false);
    if (!ok) {
      showToast(t("perso.saveError"), { type: "error" });
      return;
    }
    onChanged(null);
    showToast(t("perso.deleted"), { type: "info" });
  }

  const isPending = bet.outcome === "pending";
  const isWin = bet.outcome === "win";
  const isLoss = bet.outcome === "loss";
  const status = STATUS_CONFIG[bet.outcome];
  const potentialWin = bet.stake * bet.odds;

  return (
    <div
      className={`bg-bg-card border border-white/[0.06] border-l-4 ${status.border} rounded-2xl overflow-hidden shadow-card hover:border-white/15 transition-colors`}
    >
      <div className="p-3.5 lg:p-4">
        {/* HEADER : date + sport + bookmaker (gauche) | status badge (droite) */}
        <div className="flex items-start gap-2 mb-2.5">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1">
            <span className="text-[10px] font-mono text-white/70 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">
              {dateLabel}
            </span>
            <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded border text-accent-blue bg-accent-blue/10 border-accent-blue/20 flex items-center gap-1">
              <span>{emoji}</span>
              <span>{t(`perso.sport.${bet.sport}`)}</span>
            </span>
            {bet.bookmaker && (
              <span className="text-[10px] text-white/60 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded truncate max-w-[140px]">
                {bet.bookmaker}
              </span>
            )}
          </div>
          <span
            className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border whitespace-nowrap ${status.badge} flex items-center gap-1`}
          >
            <span>{status.icon}</span>
            <span>{t(status.key)}</span>
          </span>
        </div>

        {/* MAIN : label + match */}
        <div className="mb-3">
          <div className="text-sm lg:text-base font-bold leading-tight">{bet.label}</div>
          {bet.match_label && (
            <div className="text-xs text-white/55 mt-0.5 truncate">{bet.match_label}</div>
          )}
        </div>

        {/* FINANCIAL ROW : 3 colonnes alignées */}
        <div className="grid grid-cols-3 gap-2 mb-3 text-center">
          <FinancialBox
            label={t("perso.cardOdds")}
            value={bet.odds.toFixed(2)}
            valueClass="text-white/90"
          />
          <FinancialBox
            label={t("perso.cardStake")}
            value={`${bet.stake.toFixed(2)} €`}
            valueClass="text-white/90"
          />
          <FinancialBox
            label={
              isPending
                ? t("perso.cardPotential")
                : isWin
                  ? t("perso.cardWin")
                  : isLoss
                    ? t("perso.cardLoss")
                    : t("perso.cardReturn")
            }
            value={
              isPending
                ? `${potentialWin.toFixed(2)} €`
                : isWin
                  ? `+${bet.profit.toFixed(2)} €`
                  : isLoss
                    ? `${bet.profit.toFixed(2)} €`
                    : `${bet.stake.toFixed(2)} €`
            }
            valueClass={
              isPending
                ? "text-yellow-300"
                : isWin
                  ? "text-accent-green"
                  : isLoss
                    ? "text-accent-red"
                    : "text-accent-blue"
            }
          />
        </div>

        {bet.notes && (
          <div className="text-xs text-white/45 italic mb-3 line-clamp-2 leading-relaxed">
            &ldquo;{bet.notes}&rdquo;
          </div>
        )}

        {/* ACTIONS : 2 zones — primary actions (gauche) + secondary (droite) */}
        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-white/5">
          {isPending && (
            <>
              <ActionBtn
                onClick={() => mark("win")}
                disabled={busy}
                className="bg-accent-green/15 text-accent-green border-accent-green/30 hover:bg-accent-green/25"
                label={`✓ ${t("perso.markWin")}`}
              />
              <ActionBtn
                onClick={() => mark("loss")}
                disabled={busy}
                className="bg-accent-red/15 text-accent-red border-accent-red/30 hover:bg-accent-red/25"
                label={`✕ ${t("perso.markLoss")}`}
              />
              <ActionBtn
                onClick={() => mark("void")}
                disabled={busy}
                className="bg-accent-blue/15 text-accent-blue border-accent-blue/30 hover:bg-accent-blue/25"
                label={t("perso.markVoid")}
              />
            </>
          )}
          {!isPending && (
            <ActionBtn
              onClick={() => mark("pending")}
              disabled={busy}
              className="bg-white/5 text-white/50 border-white/10 hover:bg-white/10"
              label={`↺ ${t("perso.reopen")}`}
            />
          )}
          <div className="ml-auto flex gap-1.5">
            <ActionBtn
              onClick={onEdit}
              disabled={busy}
              className="bg-white/5 text-white/60 border-white/10 hover:bg-white/10"
              label={`✎ ${t("common.edit")}`}
            />
            {!confirmDel ? (
              <ActionBtn
                onClick={() => setConfirmDel(true)}
                disabled={busy}
                className="bg-white/5 text-white/40 border-white/10 hover:bg-accent-red/10 hover:text-accent-red"
                label="🗑"
              />
            ) : (
              <>
                <ActionBtn
                  onClick={handleDelete}
                  disabled={busy}
                  className="bg-accent-red/20 text-accent-red border-accent-red/40"
                  label={t("perso.confirmDelete")}
                />
                <ActionBtn
                  onClick={() => setConfirmDel(false)}
                  disabled={busy}
                  className="bg-white/5 text-white/60 border-white/10"
                  label={t("common.cancel")}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FinancialBox({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass: string;
}) {
  return (
    <div className="bg-bg-elevated/60 border border-white/[0.04] rounded-lg py-1.5 px-2">
      <div className="text-[9px] uppercase tracking-wider text-white/40 font-semibold mb-0.5">
        {label}
      </div>
      <div className={`text-sm font-bold tabular-nums ${valueClass}`}>{value}</div>
    </div>
  );
}

function ActionBtn({
  onClick,
  disabled,
  className,
  label,
}: {
  onClick: () => void;
  disabled: boolean;
  className: string;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-lg border transition disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    >
      {label}
    </button>
  );
}
