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
  const [starting, setStarting] = useState(defaultStartingBankroll);
  const [stake, setStake] = useState(defaultStake);

  const result = useMemo(
    () => simulate(picks, starting, stake),
    [picks, starting, stake],
  );

  const positive = result.profit >= 0;
  const toneClass = positive ? "text-accent-green" : "text-accent-red";

  return (
    <div className="bg-bg-card border border-white/5 rounded-2xl p-5 md:p-6 shadow-card">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-base font-semibold">Simulateur de mise</h2>
        <span className="text-xs text-white/40">
          Recalcule sur {picks.filter((p) => p.outcome !== "pending").length} paris réglés
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-4 mb-5">
        <label className="block">
          <span className="text-xs text-white/50 uppercase tracking-wider">
            Bankroll de départ
          </span>
          <div className="mt-1 flex items-center bg-bg-elevated border border-white/5 rounded-lg overflow-hidden">
            <input
              type="number"
              min={1}
              step={10}
              value={starting}
              onChange={(e) => setStarting(Math.max(1, Number(e.target.value) || 0))}
              className="bg-transparent w-full px-3 py-2 text-sm focus:outline-none"
            />
            <span className="px-3 text-white/40 text-sm">€</span>
          </div>
        </label>

        <label className="block">
          <span className="text-xs text-white/50 uppercase tracking-wider">
            Mise par pari
          </span>
          <div className="mt-1 flex items-center bg-bg-elevated border border-white/5 rounded-lg overflow-hidden">
            <input
              type="number"
              min={1}
              step={1}
              value={stake}
              onChange={(e) => setStake(Math.max(1, Number(e.target.value) || 0))}
              className="bg-transparent w-full px-3 py-2 text-sm focus:outline-none"
            />
            <span className="px-3 text-white/40 text-sm">€</span>
          </div>
        </label>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-bg-elevated rounded-lg p-3">
          <div className="text-[10px] uppercase tracking-wider text-white/40">
            Bankroll finale
          </div>
          <div className={`text-lg font-semibold mt-1 ${toneClass}`}>
            {result.finalBankroll.toFixed(2)} €
          </div>
        </div>
        <div className="bg-bg-elevated rounded-lg p-3">
          <div className="text-[10px] uppercase tracking-wider text-white/40">
            Profit
          </div>
          <div className={`text-lg font-semibold mt-1 ${toneClass}`}>
            {positive ? "+" : ""}
            {result.profit.toFixed(2)} €
          </div>
        </div>
        <div className="bg-bg-elevated rounded-lg p-3">
          <div className="text-[10px] uppercase tracking-wider text-white/40">ROI</div>
          <div className={`text-lg font-semibold mt-1 ${toneClass}`}>
            {positive ? "+" : ""}
            {result.roi.toFixed(2)}%
          </div>
        </div>
      </div>
    </div>
  );
}
