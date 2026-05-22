import { useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";

import { useI18n } from "@/lib/i18n";

interface FormState {
  dateStart: string;
  dateEnd: string;
  label: string;
  status: string;
  type: string;
  sport: string;
  bookmaker: string;
  tipster: string;
  stakeMin: string;
  stakeMax: string;
  oddsMin: string;
  oddsMax: string;
  category: string;
  competition: string;
  betType: string;
  depositWithdrawal: string;
  live: "oui" | "non" | "tous";
  free: "oui" | "non" | "tous";
}

const EMPTY: FormState = {
  dateStart: "",
  dateEnd: "",
  label: "",
  status: "",
  type: "",
  sport: "",
  bookmaker: "",
  tipster: "",
  stakeMin: "",
  stakeMax: "",
  oddsMin: "",
  oddsMax: "",
  category: "",
  competition: "",
  betType: "",
  depositWithdrawal: "",
  live: "tous",
  free: "tous",
};

export default function FiltresPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [form, setForm] = useState<FormState>(EMPTY);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onReset() {
    setForm(EMPTY);
  }

  function onApply() {
    // Phase 1 : on stocke en localStorage, on rentre sur Home. Le filtrage
    // réel sera branché plus tard quand on aura plus de données.
    try {
      localStorage.setItem("pronostics.filters", JSON.stringify(form));
    } catch {
      /* ignore */
    }
    router.push("/");
  }

  return (
    <>
      <Head>
        <title>{t("filtres.titleTab")}</title>
      </Head>
      <main className="max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-4 md:px-6 lg:px-8 pt-6 pb-32">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="lg:hidden w-9 h-9 rounded-full flex items-center justify-center text-accent-blue hover:bg-white/5"
            aria-label={t("common.back")}
          >
            ←
          </button>
          <h1 className="text-lg lg:text-2xl font-bold tracking-tight">{t("filtres.title")}</h1>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FieldDate
            label={t("filtres.dateStart")}
            value={form.dateStart}
            onChange={(v) => update("dateStart", v)}
          />
          <FieldDate
            label={t("filtres.dateEnd")}
            value={form.dateEnd}
            onChange={(v) => update("dateEnd", v)}
          />

          <div className="col-span-2">
            <FieldText
              label={t("filtres.label")}
              placeholder={t("filtres.labelPh")}
              value={form.label}
              onChange={(v) => update("label", v)}
            />
          </div>

          <FieldSelect
            label={t("filtres.status")}
            placeholder={t("filtres.select")}
            value={form.status}
            options={[
              { value: "won", label: t("filtres.statusWon") },
              { value: "lost", label: t("filtres.statusLost") },
              { value: "pending", label: t("filtres.statusPending") },
              { value: "refunded", label: t("filtres.statusRefunded") },
            ]}
            onChange={(v) => update("status", v)}
          />
          <FieldSelect
            label={t("filtres.type")}
            placeholder={t("filtres.select")}
            value={form.type}
            options={[
              { value: "simple", label: t("filtres.typeSimple") },
              { value: "combo", label: t("filtres.typeCombo") },
              { value: "system", label: t("filtres.typeSystem") },
            ]}
            onChange={(v) => update("type", v)}
          />

          <FieldSelect
            label={t("filtres.sport")}
            placeholder={t("filtres.select")}
            value={form.sport}
            options={[
              { value: "football", label: "Football" },
              { value: "tennis", label: "Tennis" },
              { value: "basketball", label: "Basketball" },
              { value: "baseball", label: "Baseball" },
              { value: "hockey", label: "Hockey" },
              { value: "nfl", label: "NFL" },
            ]}
            onChange={(v) => update("sport", v)}
          />
          <FieldSelect
            label={t("filtres.bookmaker")}
            placeholder={t("filtres.select")}
            value={form.bookmaker}
            options={[
              { value: "bwin", label: "bwin" },
              { value: "unibet", label: "Unibet" },
              { value: "winamax", label: "Winamax" },
              { value: "betclic", label: "Betclic" },
              { value: "pmu", label: "PMU" },
            ]}
            onChange={(v) => update("bookmaker", v)}
          />

          <FieldSelect
            label={t("filtres.tipster")}
            placeholder={t("filtres.select")}
            value={form.tipster}
            options={[
              { value: "wtf", label: "WTF (Win The Future)" },
              { value: "self", label: t("filtres.tipsterMe") },
            ]}
            onChange={(v) => update("tipster", v)}
          />
          <FieldText
            label={t("filtres.stakeMin")}
            placeholder={t("filtres.stakeMinPh")}
            value={form.stakeMin}
            onChange={(v) => update("stakeMin", v)}
            numeric
          />

          <FieldText
            label={t("filtres.stakeMax")}
            placeholder={t("filtres.stakeMaxPh")}
            value={form.stakeMax}
            onChange={(v) => update("stakeMax", v)}
            numeric
          />
          <FieldText
            label={t("filtres.oddsMin")}
            placeholder={t("filtres.oddsMinPh")}
            value={form.oddsMin}
            onChange={(v) => update("oddsMin", v)}
            numeric
          />

          <FieldText
            label={t("filtres.oddsMax")}
            placeholder={t("filtres.oddsMaxPh")}
            value={form.oddsMax}
            onChange={(v) => update("oddsMax", v)}
            numeric
          />
          <FieldSelect
            label={t("filtres.category")}
            placeholder={t("filtres.select")}
            value={form.category}
            options={[
              { value: "pre", label: t("filtres.catPreMatch") },
              { value: "live", label: t("filtres.catLive") },
              { value: "outright", label: t("filtres.catOutright") },
            ]}
            onChange={(v) => update("category", v)}
          />

          <FieldSelect
            label={t("filtres.competition")}
            placeholder={t("filtres.select")}
            value={form.competition}
            options={[
              { value: "nba", label: "NBA" },
              { value: "mlb", label: "MLB" },
              { value: "atp", label: "ATP" },
              { value: "wta", label: "WTA" },
              { value: "nhl", label: "NHL" },
              { value: "l1", label: "Ligue 1" },
              { value: "epl", label: "Premier League" },
            ]}
            onChange={(v) => update("competition", v)}
          />
          <FieldSelect
            label={t("filtres.betType")}
            placeholder={t("filtres.select")}
            value={form.betType}
            options={[
              { value: "winner", label: t("filtres.betWinner") },
              { value: "spread", label: t("filtres.betSpread") },
              { value: "total", label: t("filtres.betTotal") },
              { value: "btts", label: t("filtres.betBtts") },
            ]}
            onChange={(v) => update("betType", v)}
          />

          <FieldSelect
            label={t("filtres.depositWithdrawal")}
            placeholder={t("filtres.select")}
            value={form.depositWithdrawal}
            options={[
              { value: "deposit", label: t("filtres.depDeposit") },
              { value: "withdrawal", label: t("filtres.depWithdrawal") },
              { value: "bonus", label: t("filtres.depBonus") },
            ]}
            onChange={(v) => update("depositWithdrawal", v)}
          />
          <div />
        </div>

        <ToggleRow
          icon="📺"
          label={t("filtres.live")}
          labels={{
            yes: t("filtres.toggleYes"),
            no: t("filtres.toggleNo"),
            all: t("filtres.toggleAll"),
          }}
          value={form.live}
          onChange={(v) => update("live", v)}
        />
        <ToggleRow
          icon="🎟️"
          label={t("filtres.free")}
          labels={{
            yes: t("filtres.toggleYes"),
            no: t("filtres.toggleNo"),
            all: t("filtres.toggleAll"),
          }}
          value={form.free}
          onChange={(v) => update("free", v)}
        />
      </main>

      {/* Sticky footer buttons */}
      <div className="fixed bottom-20 left-0 right-0 px-4 z-30">
        <div className="max-w-md mx-auto bg-bg-base/95 backdrop-blur border-t border-white/5 pt-3 grid grid-cols-2 gap-3">
          <button
            onClick={onReset}
            className="py-3.5 rounded-xl bg-bg-card border border-white/10 font-semibold hover:bg-white/5"
          >
            {t("filtres.reset")}
          </button>
          <button
            onClick={onApply}
            className="py-3.5 rounded-xl bg-gradient-to-r from-accent-blue to-purple-500 text-white font-semibold"
          >
            {t("filtres.apply")}
          </button>
        </div>
      </div>
    </>
  );
}

function FieldDate({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="bg-bg-card border border-white/[0.06] rounded-xl px-3 py-2.5 block">
      <span className="text-[11px] text-white/40 uppercase tracking-wider">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-sm text-white focus:outline-none mt-1"
      />
    </label>
  );
}

function FieldText({
  label,
  placeholder,
  value,
  onChange,
  numeric,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  numeric?: boolean;
}) {
  return (
    <label className="bg-bg-card border border-white/[0.06] rounded-xl px-3 py-2.5 block">
      <span className="text-[11px] text-white/40 uppercase tracking-wider">{label}</span>
      <input
        type={numeric ? "number" : "text"}
        inputMode={numeric ? "decimal" : "text"}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-sm focus:outline-none mt-1 placeholder:text-white/30"
      />
    </label>
  );
}

function FieldSelect({
  label,
  options,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="bg-bg-card border border-white/[0.06] rounded-xl px-3 py-2.5 block relative">
      <span className="text-[11px] text-white/40 uppercase tracking-wider">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-sm focus:outline-none mt-1 appearance-none pr-4"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span className="absolute right-3 bottom-2.5 text-white/40 text-xs pointer-events-none">
        ▾
      </span>
    </label>
  );
}

function ToggleRow({
  icon,
  label,
  value,
  onChange,
  labels,
}: {
  icon: string;
  label: string;
  value: "oui" | "non" | "tous";
  onChange: (v: "oui" | "non" | "tous") => void;
  labels: { yes: string; no: string; all: string };
}) {
  return (
    <div className="bg-bg-card border border-white/[0.06] rounded-xl p-3 mt-3 flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-sm font-medium">
        <span>{icon}</span>
        <span>{label}</span>
      </span>
      <div className="flex gap-1.5">
        {(["oui", "non", "tous"] as const).map((v) => (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider border transition ${
              value === v
                ? "border-accent-blue text-accent-blue bg-accent-blue/10"
                : "border-white/10 text-white/60 hover:bg-white/5"
            }`}
          >
            {v === "oui" ? labels.yes : v === "non" ? labels.no : labels.all}
          </button>
        ))}
      </div>
    </div>
  );
}
