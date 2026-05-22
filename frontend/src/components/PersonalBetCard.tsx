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

const STATUS_BAR: Record<PersonalOutcome, { bg: string; text: string; key: string }> = {
  win: { bg: "bg-accent-green/15", text: "text-accent-green", key: "perso.outcomeWin" },
  loss: { bg: "bg-accent-red/15", text: "text-accent-red", key: "perso.outcomeLoss" },
  pending: { bg: "bg-white/[0.07]", text: "text-white/60", key: "perso.outcomePending" },
  void: { bg: "bg-accent-blue/15", text: "text-accent-blue", key: "perso.outcomeVoid" },
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
  const status = STATUS_BAR[bet.outcome];

  return (
    <div className="bg-bg-card border border-white/[0.06] rounded-2xl overflow-hidden">
      <div className="flex items-stretch">
        <div className="flex-1 p-3 min-w-0">
          {/* Header row */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-[11px] font-mono text-white/70 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">
              {dateLabel}
            </span>
            <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded border text-accent-blue bg-accent-blue/10 border-accent-blue/20 flex items-center gap-1">
              <span>{emoji}</span>
              <span>{t(`perso.sport.${bet.sport}`)}</span>
            </span>
            <span className="text-[10px] text-white/40 ml-auto tabular-nums">
              {t("perso.cardOdds")} {bet.odds.toFixed(2)}
            </span>
          </div>

          {/* Label + match */}
          <div className="text-sm font-medium truncate">{bet.label}</div>
          {bet.match_label && (
            <div className="text-[11px] text-white/45 truncate mt-0.5">{bet.match_label}</div>
          )}

          {/* Stake / profit row */}
          <div className="flex items-center gap-3 mt-2 text-[11px]">
            <span className="text-white/50">
              {t("perso.cardStake")} <span className="text-white/80 tabular-nums">{bet.stake.toFixed(2)} €</span>
            </span>
            {isPending ? (
              <span className="text-yellow-400 tabular-nums">
                → {(bet.stake * bet.odds).toFixed(2)} €
              </span>
            ) : isWin ? (
              <span className="text-accent-green font-semibold tabular-nums">
                +{bet.profit.toFixed(2)} €
              </span>
            ) : isLoss ? (
              <span className="text-accent-red font-semibold tabular-nums">
                {bet.profit.toFixed(2)} €
              </span>
            ) : (
              <span className="text-accent-blue tabular-nums">±0.00 €</span>
            )}
          </div>

          {bet.notes && (
            <div className="text-[11px] text-white/40 mt-2 italic line-clamp-2">"{bet.notes}"</div>
          )}

          {/* Actions */}
          <div className="flex gap-1.5 mt-3 flex-wrap">
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
        <div
          className={`${status.bg} ${status.text} flex items-center justify-center px-2 self-stretch min-w-[28px]`}
        >
          <span
            className="text-[10px] font-semibold tracking-wider uppercase"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            {t(status.key)}
          </span>
        </div>
      </div>
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
