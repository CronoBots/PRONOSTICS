import { useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";

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
        <title>Filtres — WTF</title>
      </Head>
      <main className="max-w-md mx-auto px-4 pt-6 pb-32">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full flex items-center justify-center text-accent-blue hover:bg-white/5"
            aria-label="Retour"
          >
            ←
          </button>
          <h1 className="text-lg font-bold tracking-tight">Filtres</h1>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FieldDate
            label="Date de début"
            value={form.dateStart}
            onChange={(v) => update("dateStart", v)}
          />
          <FieldDate
            label="Date de fin"
            value={form.dateEnd}
            onChange={(v) => update("dateEnd", v)}
          />

          <div className="col-span-2">
            <FieldText
              label="Intitulé du pari"
              placeholder="Ex: Real Madrid - Bayer"
              value={form.label}
              onChange={(v) => update("label", v)}
            />
          </div>

          <FieldSelect
            label="État"
            value={form.status}
            options={["Gagné", "Perdu", "En attente", "Remboursé"]}
            onChange={(v) => update("status", v)}
          />
          <FieldSelect
            label="Type"
            value={form.type}
            options={["Simple", "Combiné", "Système"]}
            onChange={(v) => update("type", v)}
          />

          <FieldSelect
            label="Sport"
            value={form.sport}
            options={["Football", "Tennis", "Basketball", "Baseball", "Hockey", "NFL"]}
            onChange={(v) => update("sport", v)}
          />
          <FieldSelect
            label="Bookmaker"
            value={form.bookmaker}
            options={["bwin", "Unibet", "Winamax", "Betclic", "PMU"]}
            onChange={(v) => update("bookmaker", v)}
          />

          <FieldSelect
            label="Tipster"
            value={form.tipster}
            options={["WTF (Win The Future)", "Moi-même"]}
            onChange={(v) => update("tipster", v)}
          />
          <FieldText
            label="Mise min (€)"
            placeholder="Ex: 1"
            value={form.stakeMin}
            onChange={(v) => update("stakeMin", v)}
            numeric
          />

          <FieldText
            label="Mise max (€)"
            placeholder="Ex: 50"
            value={form.stakeMax}
            onChange={(v) => update("stakeMax", v)}
            numeric
          />
          <FieldText
            label="Cote min"
            placeholder="Ex: 1.10"
            value={form.oddsMin}
            onChange={(v) => update("oddsMin", v)}
            numeric
          />

          <FieldText
            label="Cote max"
            placeholder="Ex: 5.00"
            value={form.oddsMax}
            onChange={(v) => update("oddsMax", v)}
            numeric
          />
          <FieldSelect
            label="Catégorie"
            value={form.category}
            options={["Pré-match", "Live", "Outright"]}
            onChange={(v) => update("category", v)}
          />

          <FieldSelect
            label="Compétition"
            value={form.competition}
            options={["NBA", "MLB", "ATP", "WTA", "NHL", "Ligue 1", "Premier League"]}
            onChange={(v) => update("competition", v)}
          />
          <FieldSelect
            label="Type de pari"
            value={form.betType}
            options={["Vainqueur", "Spread", "Total", "Both teams to score"]}
            onChange={(v) => update("betType", v)}
          />

          <FieldSelect
            label="Dépôt/Retrait"
            value={form.depositWithdrawal}
            options={["Dépôt", "Retrait", "Bonus"]}
            onChange={(v) => update("depositWithdrawal", v)}
          />
          <div />
        </div>

        <ToggleRow
          icon="📺"
          label="Pari live"
          value={form.live}
          onChange={(v) => update("live", v)}
        />
        <ToggleRow
          icon="🎟️"
          label="Pari gratuit"
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
            Retirer filtres
          </button>
          <button
            onClick={onApply}
            className="py-3.5 rounded-xl bg-gradient-to-r from-accent-blue to-purple-500 text-white font-semibold"
          >
            Filtrer
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
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="bg-bg-card border border-white/[0.06] rounded-xl px-3 py-2.5 block relative">
      <span className="text-[11px] text-white/40 uppercase tracking-wider">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-sm focus:outline-none mt-1 appearance-none pr-4"
      >
        <option value="">Sélectionner</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
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
}: {
  icon: string;
  label: string;
  value: "oui" | "non" | "tous";
  onChange: (v: "oui" | "non" | "tous") => void;
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
            {v === "oui" ? "Oui" : v === "non" ? "Non" : "Tous"}
          </button>
        ))}
      </div>
    </div>
  );
}
