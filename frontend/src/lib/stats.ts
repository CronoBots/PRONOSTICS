/**
 * Helpers d'agrégation côté frontend : à partir de la liste des picks,
 * calcule les vues stats utilisées par l'Analyzer et le Calendrier.
 */

import { HistoryPick, SPORT_EMOJIS, SPORT_LABELS } from "./types";

const DAY_ORDER = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
];

const DAY_FROM_JS = [
  "Dimanche", // 0
  "Lundi", // 1
  "Mardi", // 2
  "Mercredi", // 3
  "Jeudi", // 4
  "Vendredi", // 5
  "Samedi", // 6
];

export interface StateBreakdown {
  state: "win" | "loss" | "pending" | "void";
  label: string;
  count: number;
  total_stake: number;
  avg_stake: number;
  color: string;
}

const STATE_META: Record<
  StateBreakdown["state"],
  { label: string; color: string }
> = {
  win: { label: "Gagné", color: "#26e0a4" },
  loss: { label: "Perdu", color: "#ff5470" },
  pending: { label: "En attente", color: "#9aa3b2" },
  void: { label: "Remboursé", color: "#5b8def" },
};

export function breakdownByState(picks: HistoryPick[]): StateBreakdown[] {
  const acc: Record<string, { count: number; stake_sum: number }> = {
    win: { count: 0, stake_sum: 0 },
    loss: { count: 0, stake_sum: 0 },
    pending: { count: 0, stake_sum: 0 },
    void: { count: 0, stake_sum: 0 },
  };
  for (const p of picks) {
    const key = p.outcome;
    if (!acc[key]) continue;
    acc[key].count += 1;
    acc[key].stake_sum += p.stake;
  }
  return (Object.keys(STATE_META) as StateBreakdown["state"][]).map((state) => ({
    state,
    label: STATE_META[state].label,
    color: STATE_META[state].color,
    count: acc[state].count,
    total_stake: round2(acc[state].stake_sum),
    avg_stake: acc[state].count > 0 ? round2(acc[state].stake_sum / acc[state].count) : 0,
  }));
}

export interface DayOfWeekStats {
  day: string;
  paris: number;
  won: number;
  lost: number;
  void_count: number;
  profit: number;
  roi: number;
  win_rate: number;
  total_stake: number;
}

export function statsByDayOfWeek(picks: HistoryPick[]): DayOfWeekStats[] {
  const byDay: Record<string, DayOfWeekStats> = {};
  for (const d of DAY_ORDER) {
    byDay[d] = {
      day: d,
      paris: 0,
      won: 0,
      lost: 0,
      void_count: 0,
      profit: 0,
      roi: 0,
      win_rate: 0,
      total_stake: 0,
    };
  }
  for (const p of picks) {
    const jsDay = new Date(p.date + "T12:00:00Z").getUTCDay();
    const day = DAY_FROM_JS[jsDay];
    const row = byDay[day];
    row.paris += 1;
    row.total_stake += p.stake;
    if (p.outcome === "win") {
      row.won += 1;
      row.profit += p.profit;
    } else if (p.outcome === "loss") {
      row.lost += 1;
      row.profit += p.profit;
    } else if (p.outcome === "void") {
      row.void_count += 1;
    }
  }
  for (const row of Object.values(byDay)) {
    const settled_stake = (row.won + row.lost) * (row.total_stake / Math.max(row.paris, 1));
    row.profit = round2(row.profit);
    row.roi = settled_stake > 0 ? round2((row.profit / settled_stake) * 100) : 0;
    row.win_rate =
      row.won + row.lost > 0 ? round2((row.won / (row.won + row.lost)) * 100) : 0;
    row.total_stake = round2(row.total_stake);
  }
  return DAY_ORDER.map((d) => byDay[d]);
}

export interface SportStats {
  sport: string;
  label: string;
  emoji: string;
  paris: number;
  won: number;
  lost: number;
  pending: number;
  profit: number;
}

export function statsBySport(picks: HistoryPick[]): SportStats[] {
  const map = new Map<string, SportStats>();
  for (const p of picks) {
    const s = p.match.sport;
    if (!map.has(s)) {
      map.set(s, {
        sport: s,
        label: SPORT_LABELS[s] || s,
        emoji: SPORT_EMOJIS[s] || "•",
        paris: 0,
        won: 0,
        lost: 0,
        pending: 0,
        profit: 0,
      });
    }
    const row = map.get(s)!;
    row.paris += 1;
    if (p.outcome === "win") {
      row.won += 1;
      row.profit += p.profit;
    } else if (p.outcome === "loss") {
      row.lost += 1;
      row.profit += p.profit;
    } else if (p.outcome === "pending") {
      row.pending += 1;
    }
  }
  return Array.from(map.values())
    .map((r) => ({ ...r, profit: round2(r.profit) }))
    .sort((a, b) => b.profit - a.profit);
}

export interface DayCell {
  date: string;        // YYYY-MM-DD
  day: number;         // jour du mois (1-31)
  inMonth: boolean;
  profit: number;
  picks: number;
  isToday: boolean;
}

export function buildMonthGrid(picks: HistoryPick[], year: number, monthIdx0: number): {
  cells: DayCell[];
  monthProfit: number;
  monthPicks: number;
} {
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);

  // Map date → totaux
  const byDate: Record<string, { profit: number; count: number }> = {};
  let monthProfit = 0;
  let monthPicks = 0;
  for (const p of picks) {
    const d = new Date(p.date + "T12:00:00Z");
    if (d.getUTCFullYear() === year && d.getUTCMonth() === monthIdx0) {
      monthPicks += 1;
      const settled = p.outcome === "win" || p.outcome === "loss";
      if (settled) {
        monthProfit += p.profit;
      }
      if (!byDate[p.date]) byDate[p.date] = { profit: 0, count: 0 };
      byDate[p.date].count += 1;
      if (settled) byDate[p.date].profit += p.profit;
    }
  }

  // Construction de la grille (lundi=1er jour de la semaine)
  const firstOfMonth = new Date(Date.UTC(year, monthIdx0, 1));
  const lastOfMonth = new Date(Date.UTC(year, monthIdx0 + 1, 0));
  // getUTCDay: 0=Sun, 1=Mon, ...  → on veut Lundi en colonne 0
  const firstDow = (firstOfMonth.getUTCDay() + 6) % 7;
  const lastDow = (lastOfMonth.getUTCDay() + 6) % 7;

  const cells: DayCell[] = [];
  // Pad début (mois précédent)
  for (let i = 0; i < firstDow; i++) {
    const d = new Date(firstOfMonth);
    d.setUTCDate(d.getUTCDate() - (firstDow - i));
    const iso = d.toISOString().slice(0, 10);
    cells.push({
      date: iso,
      day: d.getUTCDate(),
      inMonth: false,
      profit: 0,
      picks: 0,
      isToday: false,
    });
  }
  // Mois courant
  for (let day = 1; day <= lastOfMonth.getUTCDate(); day++) {
    const iso = `${year}-${String(monthIdx0 + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const stats = byDate[iso] ?? { profit: 0, count: 0 };
    cells.push({
      date: iso,
      day,
      inMonth: true,
      profit: round2(stats.profit),
      picks: stats.count,
      isToday: iso === todayIso,
    });
  }
  // Pad fin (mois suivant)
  for (let i = lastDow + 1; i < 7; i++) {
    const d = new Date(lastOfMonth);
    d.setUTCDate(d.getUTCDate() + (i - lastDow));
    const iso = d.toISOString().slice(0, 10);
    cells.push({
      date: iso,
      day: d.getUTCDate(),
      inMonth: false,
      profit: 0,
      picks: 0,
      isToday: false,
    });
  }

  return { cells, monthProfit: round2(monthProfit), monthPicks };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const WEEKDAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

// ============== Nouvelles stats Analyses ==============

export interface ProfitFactorStats {
  factor: number;        // gains / pertes
  totalGains: number;
  totalLosses: number;   // valeur absolue
}

export function computeProfitFactor(picks: HistoryPick[]): ProfitFactorStats {
  let gains = 0;
  let losses = 0;
  for (const p of picks) {
    if (p.outcome === "win") gains += p.profit;
    else if (p.outcome === "loss") losses += Math.abs(p.profit);
  }
  const factor = losses > 0 ? gains / losses : gains > 0 ? Infinity : 0;
  return { factor, totalGains: round2(gains), totalLosses: round2(losses) };
}

export interface StakeRatioStats {
  ratio: number;        // mise totale / |profit|
  totalStake: number;
  profit: number;
}

export function computeStakeRatio(picks: HistoryPick[]): StakeRatioStats {
  const settled = picks.filter((p) => p.outcome === "win" || p.outcome === "loss");
  const totalStake = settled.reduce((s, p) => s + p.stake, 0);
  const profit = settled.reduce((s, p) => s + p.profit, 0);
  const ratio = profit !== 0 ? Math.abs(totalStake / profit) : 0;
  return { ratio, totalStake: round2(totalStake), profit: round2(profit) };
}

const STAKE_BUCKETS: [number, number, string][] = [
  [0, 2.99, "0.00 - 2.99 €"],
  [3, 5.99, "3.00 - 5.99 €"],
  [6, 8.99, "6.00 - 8.99 €"],
  [9, 11.99, "9.00 - 11.99 €"],
  [12, 50, "12.00 - 50.00 €"],
  [50, 999999, "50.00 € +"],
];

export interface StakeBucketStats {
  label: string;
  count: number;
  totalStake: number;
  profit: number;
  pending: number;
  won: number;
  lost: number;
}

export function statsByStakeBucket(picks: HistoryPick[]): StakeBucketStats[] {
  return STAKE_BUCKETS.map(([min, max, label]) => {
    const inBucket = picks.filter((p) => p.stake >= min && p.stake <= max);
    return {
      label,
      count: inBucket.length,
      totalStake: round2(inBucket.reduce((s, p) => s + p.stake, 0)),
      profit: round2(
        inBucket
          .filter((p) => p.outcome === "win" || p.outcome === "loss")
          .reduce((s, p) => s + p.profit, 0),
      ),
      pending: inBucket.filter((p) => p.outcome === "pending").length,
      won: inBucket.filter((p) => p.outcome === "win").length,
      lost: inBucket.filter((p) => p.outcome === "loss").length,
    };
  }).filter((b) => b.count > 0);
}
