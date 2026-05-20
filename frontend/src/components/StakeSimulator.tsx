import { useMemo, useState } from "react";

import { HistoryPick } from "@/lib/types";

interface Props {
  picks: HistoryPick[];
  defaultStake: number;
  defaultStartingBankroll: number;
}

function simulate(
  picks: HistoryPick[],
  startingBankroll: number,
  stake: number,
): { finalBankroll: number; profit: number; roi: number } {
  let bankroll = startingBankroll;
  let totalStake = 0;
  let profit = 0;
  const settled = picks.filter((p) => p.outcome === "win" || p.outcome === "loss");
  for (const p of settled) {
    totalStake += stake;
    if (p.outcome === "win") {
      const gain = stake * (p.odds - 1);
      bankroll += gain;
      profit += gain;
    } else {
      bankroll -= stake;
      profit -= stake;
    }
  }
  const roi = totalStake > 0 ? (profit / totalStake) * 100 : 0;
  return { finalBankroll: bankroll, profit, roi };
}

export function StakeSimulator({ picks, defaultStake, defaultStartingBankroll }: Props) {
  // State en string pour autoriser le champ vide pendant l'édition
  const [startingStr, setStartingStr] = useState("");
  const [stakeStr, setStakeStr] = useState("");

  const starting = Number(startingStr) || defaultStartingBankroll;
  const stake = Number(stakeStr) || defaultStake;

  const result = useMemo(
    () => simulate(picks, starting, stake),
    [picks, starting, stake],
  );

  const positive = result.profit >= 0;
  const toneClass = positive ? "text-accent-green" : "text-accent-red";
  const settled = picks.filter((p) => p.outcome !== "pending").length;

  return (
    <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-5 md:p-6 shadow-card">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-sm md:text-base font-semibold uppercase tracking-wider text-white/70">
          Simulateur de mise
        </h2>
        <span className="text-[11px] text-white/40">
          Recalcule sur {settled} pari{settled > 1 ? "s" : ""} réglé{settled > 1 ? "s" : ""}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-4 mb-5">
        <label className="block">
          <span className="text-[10px] md:text-xs text-white/50 uppercase tracking-wider">
            Bankroll de départ
          </span>
          <div className="mt-1.5 flex items-center bg-bg-elevated border border-white/5 rounded-lg overflow-hidden focus-within:border-accent-green/40 transition">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step={10}
              value={startingStr}
              placeholder={String(defaultStartingBankroll)}
              onChange={(e) => setStartingStr(e.target.value)}
              className="bg-transparent w-full px-3 py-2.5 text-sm focus:outline-none placeholder:text-white/30"
            />
            <span className="px-3 text-white/40 text-sm">€</span>
          </div>
        </label>

        <label className="block">
          <span className="text-[10px] md:text-xs text-white/50 uppercase tracking-wider">
            Mise par pari
          </span>
          <div className="mt-1.5 flex items-center bg-bg-elevated border border-white/5 rounded-lg overflow-hidden focus-within:border-accent-green/40 transition">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step={1}
              value={stakeStr}
              placeholder={String(defaultStake)}
              onChange={(e) => setStakeStr(e.target.value)}
              className="bg-transparent w-full px-3 py-2.5 text-sm focus:outline-none placeholder:text-white/30"
            />
            <span className="px-3 text-white/40 text-sm">€</span>
          </div>
        </label>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-bg-elevated rounded-xl p-3">
          <div className="text-[10px] uppercase tracking-wider text-white/40">
            Bankroll finale
          </div>
          <div className={`text-base md:text-lg font-bold mt-1 tabular-nums ${toneClass}`}>
            {result.finalBankroll.toFixed(2)} €
          </div>
        </div>
        <div className="bg-bg-elevated rounded-xl p-3">
          <div className="text-[10px] uppercase tracking-wider text-white/40">Profit</div>
          <div className={`text-base md:text-lg font-bold mt-1 tabular-nums ${toneClass}`}>
            {positive ? "+" : ""}
            {result.profit.toFixed(2)} €
          </div>
        </div>
        <div className="bg-bg-elevated rounded-xl p-3">
          <div className="text-[10px] uppercase tracking-wider text-white/40">ROI</div>
          <div className={`text-base md:text-lg font-bold mt-1 tabular-nums ${toneClass}`}>
            {positive ? "+" : ""}
            {result.roi.toFixed(2)}%
          </div>
        </div>
      </div>
    </div>
  );
}
