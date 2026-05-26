import { useEffect, useState } from "react";

import { Sheet } from "@/components/Sheet";
import { showToast } from "@/components/Toast";
import { useI18n } from "@/lib/i18n";
import { createBet, PersonalBet, PersonalBetInput, PersonalOutcome, updateBet } from "@/lib/personalBets";
import { SPORT_EMOJIS } from "@/lib/types";

const SPORT_OPTIONS = ["football", "basketball", "tennis", "nfl", "mlb", "nhl", "combo", "autre"];

// Bookmakers suggérés (datalist non-restrictive — le user peut taper n'importe quoi)
const BOOKMAKER_SUGGESTIONS = [
  "Unibet Belgique",
  "Bet365",
  "Betclic",
  "bwin",
  "Ladbrokes",
  "Napoleon Sports",
  "ZEturf",
  "Winamax",
  "FDJ",
  "Pinnacle",
];

const DEFAULT_BOOKMAKER = "Unibet Belgique";

const INPUT_CLS =
  "w-full bg-bg-elevated border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-accent-green/40 placeholder:text-white/25";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (bet: PersonalBet) => void;
  editing?: PersonalBet | null;
}

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function PersonalBetForm({ open, onClose, onSaved, editing }: Props) {
  const { t } = useI18n();
  const [date, setDate] = useState(todayISO());
  const [sport, setSport] = useState("football");
  const [label, setLabel] = useState("");
  const [matchLabel, setMatchLabel] = useState("");
  const [odds, setOdds] = useState("");
  const [stake, setStake] = useState("");
  const [outcome, setOutcome] = useState<PersonalOutcome>("pending");
  const [notes, setNotes] = useState("");
  const [bookmaker, setBookmaker] = useState(DEFAULT_BOOKMAKER);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setDate(editing.pick_date);
      setSport(editing.sport || "football");
      setLabel(editing.label);
      setMatchLabel(editing.match_label);
      setOdds(String(editing.odds));
      setStake(String(editing.stake));
      setOutcome(editing.outcome);
      setNotes(editing.notes);
      setBookmaker(editing.bookmaker || DEFAULT_BOOKMAKER);
    } else {
      setDate(todayISO());
      setSport("football");
      setLabel("");
      setMatchLabel("");
      setOdds("");
      setStake("");
      setOutcome("pending");
      setNotes("");
      setBookmaker(DEFAULT_BOOKMAKER);
    }
    setError(null);
  }, [open, editing]);

  async function handleSave() {
    setError(null);
    const oddsNum = Number(odds.replace(",", "."));
    const stakeNum = Number(stake.replace(",", "."));
    if (!label.trim()) {
      setError(t("perso.errLabel"));
      return;
    }
    if (!Number.isFinite(oddsNum) || oddsNum <= 1) {
      setError(t("perso.errOdds"));
      return;
    }
    if (!Number.isFinite(stakeNum) || stakeNum <= 0) {
      setError(t("perso.errStake"));
      return;
    }

    const input: PersonalBetInput = {
      pick_date: date,
      sport,
      label: label.trim(),
      match_label: matchLabel.trim(),
      odds: oddsNum,
      stake: stakeNum,
      outcome,
      notes: notes.trim(),
      bookmaker: bookmaker.trim(),
    };

    setSaving(true);
    const saved = editing
      ? await updateBet(editing.id, input)
      : await createBet(input);
    setSaving(false);

    if (!saved) {
      showToast(t("perso.saveError"), { type: "error" });
      return;
    }
    showToast(editing ? t("perso.updated") : t("perso.created"), { type: "success" });
    onSaved(saved);
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title={editing ? t("perso.editTitle") : t("perso.newTitle")}>
      <div className="space-y-3 pb-2 max-h-[70vh] overflow-y-auto">
        <Field label={t("perso.sport")}>
          <div className="flex flex-wrap gap-1.5">
            {SPORT_OPTIONS.map((s) => {
              const active = s === sport;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSport(s)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition flex items-center gap-1 ${
                    active
                      ? "bg-accent-green/15 border-accent-green/50 text-accent-green"
                      : "bg-bg-elevated border-white/10 text-white/60"
                  }`}
                >
                  <span>{SPORT_EMOJIS[s] || "🎯"}</span>
                  <span className="capitalize">{t(`perso.sport.${s}`)}</span>
                </button>
              );
            })}
          </div>
        </Field>

        <Field label={t("perso.label")}>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={t("perso.labelPlaceholder")}
            className={INPUT_CLS}
            autoFocus={!editing}
          />
        </Field>

        <Field label={t("perso.matchLabel")} optional>
          <input
            type="text"
            value={matchLabel}
            onChange={(e) => setMatchLabel(e.target.value)}
            placeholder={t("perso.matchLabelPlaceholder")}
            className={INPUT_CLS}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t("perso.odds")}>
            <input
              type="text"
              inputMode="decimal"
              value={odds}
              onChange={(e) => setOdds(e.target.value)}
              placeholder="2.10"
              className={`${INPUT_CLS} tabular-nums`}
            />
          </Field>
          <Field label={t("perso.stake")}>
            <input
              type="text"
              inputMode="decimal"
              value={stake}
              onChange={(e) => setStake(e.target.value)}
              placeholder="5.00"
              className={`${INPUT_CLS} tabular-nums`}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t("perso.date")}>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={INPUT_CLS}
            />
          </Field>
          <Field label={t("perso.outcome")}>
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as PersonalOutcome)}
              className={INPUT_CLS}
            >
              <option value="pending">{t("perso.outcomePending")}</option>
              <option value="win">{t("perso.outcomeWin")}</option>
              <option value="loss">{t("perso.outcomeLoss")}</option>
              <option value="void">{t("perso.outcomeVoid")}</option>
            </select>
          </Field>
        </div>

        <Field label={t("perso.bookmaker")} optional>
          <input
            type="text"
            value={bookmaker}
            onChange={(e) => setBookmaker(e.target.value)}
            placeholder={DEFAULT_BOOKMAKER}
            list="bookmaker-suggestions"
            className={INPUT_CLS}
          />
          <datalist id="bookmaker-suggestions">
            {BOOKMAKER_SUGGESTIONS.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
        </Field>

        {odds && stake && (
          <PreviewRow
            stake={Number(stake.replace(",", ".")) || 0}
            odds={Number(odds.replace(",", ".")) || 0}
            outcome={outcome}
          />
        )}

        <Field label={t("perso.notes")} optional>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("perso.notesPlaceholder")}
            rows={3}
            className={`${INPUT_CLS} resize-none`}
          />
        </Field>

        {error && (
          <div className="text-xs text-accent-red bg-accent-red/10 border border-accent-red/30 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-bg-elevated border border-white/10 text-sm text-white/70 hover:bg-white/5"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-br from-accent-green to-accent-blue text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "…" : editing ? t("common.update") : t("common.add")}
          </button>
        </div>
      </div>
    </Sheet>
  );
}

function Field({
  label,
  optional,
  children,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-wider text-white/40 font-semibold mb-1.5">
        {label}
        {optional && (
          <span className="ml-1 normal-case text-white/30 tracking-normal">({t("perso.optional")})</span>
        )}
      </label>
      {children}
    </div>
  );
}

function PreviewRow({
  stake,
  odds,
  outcome,
}: {
  stake: number;
  odds: number;
  outcome: PersonalOutcome;
}) {
  const { t } = useI18n();
  if (!Number.isFinite(stake) || !Number.isFinite(odds) || stake <= 0 || odds <= 1) return null;
  const winProfit = stake * (odds - 1);
  const winReturn = stake * odds;

  let bg = "bg-white/[0.04] border-white/10 text-white/60";
  let main = `${t("perso.previewPotential")}: +${winProfit.toFixed(2)} €`;
  let sub = `${t("perso.previewReturn")}: ${winReturn.toFixed(2)} €`;
  if (outcome === "win") {
    bg = "bg-accent-green/10 border-accent-green/30 text-accent-green";
    main = `${t("perso.previewProfit")}: +${winProfit.toFixed(2)} €`;
    sub = `${t("perso.previewReturn")}: ${winReturn.toFixed(2)} €`;
  } else if (outcome === "loss") {
    bg = "bg-accent-red/10 border-accent-red/30 text-accent-red";
    main = `${t("perso.previewLoss")}: −${stake.toFixed(2)} €`;
    sub = t("perso.previewLossSub");
  } else if (outcome === "void") {
    bg = "bg-accent-blue/10 border-accent-blue/30 text-accent-blue";
    main = `${t("perso.previewVoid")}: ${stake.toFixed(2)} €`;
    sub = t("perso.previewVoidSub");
  }
  return (
    <div className={`text-xs rounded-xl px-3 py-2 border ${bg}`}>
      <div className="font-semibold">{main}</div>
      <div className="text-[11px] opacity-75 mt-0.5">{sub}</div>
    </div>
  );
}
