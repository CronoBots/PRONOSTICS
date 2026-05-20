import { useMemo, useState } from "react";

/**
 * Calculateur de Kelly Criterion — formule classique pour optimiser
 * la mise selon ton edge réel sur un pari.
 *
 * Kelly % = (b × p − q) / b
 *   b = cote décimale − 1
 *   p = probabilité estimée de victoire
 *   q = 1 − p (probabilité de perte)
 *
 * Beaucoup de pros recommandent du "fractional Kelly" (¼ ou ½) pour
 * lisser la variance. Le slider permet de choisir la fraction.
 */
export function KellyCalculator() {
  const [bankroll, setBankroll] = useState("1000");
  const [odds, setOdds] = useState("2.10");
  const [probability, setProbability] = useState("55");
  const [fraction, setFraction] = useState("0.25");

  const result = useMemo(() => {
    const B = Number(bankroll) || 0;
    const o = Number(odds) || 0;
    const p = (Number(probability) || 0) / 100;
    const f = Number(fraction) || 0;
    if (B <= 0 || o <= 1 || p <= 0 || p > 1) return null;
    const b = o - 1;
    const q = 1 - p;
    const kellyFull = (b * p - q) / b; // peut être négatif
    const kellyApplied = Math.max(0, kellyFull) * f;
    const stake = B * kellyApplied;
    const ev = p * (o - 1) - q;
    return {
      kellyFull,
      stake,
      stakePct: kellyApplied * 100,
      ev: ev * 100,
    };
  }, [bankroll, odds, probability, fraction]);

  return (
    <section className="bg-bg-card border border-white/[0.06] rounded-2xl p-5 shadow-card">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-white/70 mb-1">
        Calculateur Kelly
      </h3>
      <p className="text-xs text-white/40 mb-4">
        Mise optimale en fonction de ta bankroll et de l'edge réel sur le pari.
      </p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Field
          label="Bankroll"
          suffix="€"
          value={bankroll}
          onChange={setBankroll}
        />
        <Field label="Cote" suffix="" value={odds} onChange={setOdds} step="0.01" />
        <Field
          label="Proba estimée"
          suffix="%"
          value={probability}
          onChange={setProbability}
        />
        <FractionSelect value={fraction} onChange={setFraction} />
      </div>

      {result && (
        <div className="bg-bg-elevated rounded-xl p-4">
          {result.kellyFull <= 0 ? (
            <div className="text-center">
              <div className="text-accent-red text-sm font-semibold mb-1">
                ⚠️ EV négative : ne pas miser
              </div>
              <div className="text-xs text-white/50">
                Le pari a une espérance de gain de {result.ev.toFixed(1)}%. Kelly suggère 0€.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider">
                  Mise conseillée
                </div>
                <div className="text-lg font-bold text-accent-green mt-1 tabular-nums">
                  {result.stake.toFixed(2)} €
                </div>
              </div>
              <div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider">
                  % bankroll
                </div>
                <div className="text-lg font-bold mt-1 tabular-nums">
                  {result.stakePct.toFixed(2)}%
                </div>
              </div>
              <div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider">EV</div>
                <div className="text-lg font-bold text-accent-green mt-1 tabular-nums">
                  +{result.ev.toFixed(1)}%
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Field({
  label,
  suffix,
  value,
  onChange,
  step,
}: {
  label: string;
  suffix: string;
  value: string;
  onChange: (v: string) => void;
  step?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] text-white/50 uppercase tracking-wider">{label}</span>
      <div className="mt-1 flex items-center bg-bg-elevated border border-white/5 rounded-lg overflow-hidden focus-within:border-accent-green/40">
        <input
          type="number"
          inputMode="decimal"
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-transparent w-full px-3 py-2 text-sm focus:outline-none"
        />
        {suffix && <span className="px-2 text-white/40 text-sm">{suffix}</span>}
      </div>
    </label>
  );
}

const FRACTIONS: { value: string; label: string }[] = [
  { value: "1", label: "Kelly plein (agressif)" },
  { value: "0.5", label: "½ Kelly (équilibré)" },
  { value: "0.25", label: "¼ Kelly (recommandé)" },
  { value: "0.1", label: "⅒ Kelly (très prudent)" },
];

function FractionSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[10px] text-white/50 uppercase tracking-wider">
        Fraction Kelly
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full bg-bg-elevated border border-white/5 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-accent-green/40"
      >
        {FRACTIONS.map((f) => (
          <option key={f.value} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>
    </label>
  );
}
