/**
 * Tracker de paris personnels — table `personal_bets` (Supabase) + fallback localStorage.
 *
 * Différent du track record officiel WTF (qui vient des JSON statiques publics) :
 * c'est ICI que l'utilisateur log SES propres paris, séparément des picks WTF.
 *
 * Mode Supabase : CRUD via la table public.personal_bets (RLS user_id = auth.uid()).
 * Mode mock (dev local ou utilisateur non connecté) : localStorage key `pronostics.personal_bets`.
 *
 * Les helpers de stats sont synchrones (calcul côté client à partir du tableau retourné),
 * la liste utilisateur restant petite (qq dizaines à qq centaines de paris).
 */

import { isSupabaseEnabled, supabase } from "./supabase";

export type PersonalOutcome = "pending" | "win" | "loss" | "void";

export interface PersonalBet {
  id: string;
  pick_date: string;       // YYYY-MM-DD
  sport: string;           // football, basketball, tennis, nfl, mlb, nhl, combo, autre
  label: string;           // "Ruud vainqueur", "Over 2.5 buts"
  match_label: string;     // "Ruud vs Popyrin"
  odds: number;            // cote décimale
  stake: number;           // mise en €
  outcome: PersonalOutcome;
  profit: number;          // gain/perte (signed). Calculé au moment du settlement.
  notes: string;
  created_at: string;      // ISO timestamp
}

export interface PersonalBetInput {
  pick_date: string;
  sport: string;
  label: string;
  match_label: string;
  odds: number;
  stake: number;
  outcome: PersonalOutcome;
  notes: string;
}

export interface PersonalStats {
  total: number;
  pending: number;
  settled: number;
  won: number;
  lost: number;
  void: number;
  total_staked: number;     // sum stake sur paris settled (win + loss, hors pending/void)
  total_profit: number;     // sum profit sur paris settled
  pending_stake: number;    // somme des mises pending
  pending_potential: number;// somme des gains potentiels pending
  roi_percent: number;      // (profit / staked) * 100
  win_rate: number;         // won / (won+loss) * 100
  avg_odds: number;         // moyenne sur settled
  current_streak: number;   // série actuelle (positive = wins, négative = losses)
}

// ============================================================================
// Stockage local (mock)
// ============================================================================

const LOCAL_KEY = "pronostics.personal_bets";

function readLocal(): PersonalBet[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data as PersonalBet[];
  } catch {
    return [];
  }
}

function writeLocal(bets: PersonalBet[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(bets));
  } catch {
    /* quota / private mode : ignore */
  }
}

function uuid(): string {
  // Minimal UUID v4 — pas de crypto requis (usage local uniquement, pas de sécurité)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ============================================================================
// Helpers de calcul
// ============================================================================

export function computeProfit(stake: number, odds: number, outcome: PersonalOutcome): number {
  if (outcome === "win") return round2(stake * (odds - 1));
  if (outcome === "loss") return -round2(stake);
  // pending + void => 0 (void rembourse, donc profit = 0)
  return 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function computeStats(bets: PersonalBet[]): PersonalStats {
  const stats: PersonalStats = {
    total: bets.length,
    pending: 0,
    settled: 0,
    won: 0,
    lost: 0,
    void: 0,
    total_staked: 0,
    total_profit: 0,
    pending_stake: 0,
    pending_potential: 0,
    roi_percent: 0,
    win_rate: 0,
    avg_odds: 0,
    current_streak: 0,
  };

  let oddsSum = 0;
  for (const b of bets) {
    if (b.outcome === "pending") {
      stats.pending += 1;
      stats.pending_stake += b.stake;
      stats.pending_potential += b.stake * b.odds;
    } else if (b.outcome === "void") {
      stats.void += 1;
    } else {
      stats.settled += 1;
      stats.total_staked += b.stake;
      stats.total_profit += b.profit;
      oddsSum += b.odds;
      if (b.outcome === "win") stats.won += 1;
      else if (b.outcome === "loss") stats.lost += 1;
    }
  }

  if (stats.total_staked > 0) {
    stats.roi_percent = round2((stats.total_profit / stats.total_staked) * 100);
  }
  const decided = stats.won + stats.lost;
  if (decided > 0) {
    stats.win_rate = round2((stats.won / decided) * 100);
    stats.avg_odds = round2(oddsSum / decided);
  }
  stats.total_staked = round2(stats.total_staked);
  stats.total_profit = round2(stats.total_profit);
  stats.pending_stake = round2(stats.pending_stake);
  stats.pending_potential = round2(stats.pending_potential);

  // Série actuelle : on parcourt par date desc, on s'arrête au premier changement.
  const settled = bets
    .filter((b) => b.outcome === "win" || b.outcome === "loss")
    .sort((a, b) => b.pick_date.localeCompare(a.pick_date) || b.created_at.localeCompare(a.created_at));
  if (settled.length > 0) {
    const first = settled[0].outcome;
    let count = 0;
    for (const b of settled) {
      if (b.outcome !== first) break;
      count += 1;
    }
    stats.current_streak = first === "win" ? count : -count;
  }

  return stats;
}

// ============================================================================
// Mode détection
// ============================================================================

export function isCloudMode(): boolean {
  return isSupabaseEnabled();
}

async function getUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

// ============================================================================
// API publique
// ============================================================================

/**
 * Récupère tous les paris perso, triés par date desc puis created_at desc.
 * Renvoie [] si non authentifié (en mode cloud) ou si rien stocké.
 */
export async function listBets(): Promise<PersonalBet[]> {
  if (isCloudMode()) {
    const uid = await getUserId();
    if (!uid || !supabase) return readLocal();
    const { data, error } = await supabase
      .from("personal_bets")
      .select("*")
      .eq("user_id", uid)
      .order("pick_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error || !data) return [];
    return data.map(rowToBet);
  }
  return readLocal().sort(
    (a, b) =>
      b.pick_date.localeCompare(a.pick_date) ||
      b.created_at.localeCompare(a.created_at),
  );
}

export async function createBet(input: PersonalBetInput): Promise<PersonalBet | null> {
  const profit = computeProfit(input.stake, input.odds, input.outcome);

  if (isCloudMode()) {
    const uid = await getUserId();
    if (!uid || !supabase) {
      // Pas connecté : fallback local
      return createLocal(input, profit);
    }
    const { data, error } = await supabase
      .from("personal_bets")
      .insert({
        user_id: uid,
        pick_date: input.pick_date,
        sport: input.sport,
        label: input.label,
        match_label: input.match_label,
        odds: input.odds,
        stake: input.stake,
        outcome: input.outcome,
        profit,
        notes: input.notes,
      })
      .select()
      .single();
    if (error || !data) return null;
    return rowToBet(data);
  }
  return createLocal(input, profit);
}

function createLocal(input: PersonalBetInput, profit: number): PersonalBet {
  const bet: PersonalBet = {
    id: uuid(),
    pick_date: input.pick_date,
    sport: input.sport,
    label: input.label,
    match_label: input.match_label,
    odds: input.odds,
    stake: input.stake,
    outcome: input.outcome,
    profit,
    notes: input.notes,
    created_at: new Date().toISOString(),
  };
  const all = readLocal();
  all.push(bet);
  writeLocal(all);
  return bet;
}

export async function updateBet(id: string, input: PersonalBetInput): Promise<PersonalBet | null> {
  const profit = computeProfit(input.stake, input.odds, input.outcome);

  if (isCloudMode()) {
    const uid = await getUserId();
    if (uid && supabase) {
      const { data, error } = await supabase
        .from("personal_bets")
        .update({
          pick_date: input.pick_date,
          sport: input.sport,
          label: input.label,
          match_label: input.match_label,
          odds: input.odds,
          stake: input.stake,
          outcome: input.outcome,
          profit,
          notes: input.notes,
        })
        .eq("id", id)
        .eq("user_id", uid)
        .select()
        .single();
      if (error || !data) return null;
      return rowToBet(data);
    }
  }

  const all = readLocal();
  const idx = all.findIndex((b) => b.id === id);
  if (idx === -1) return null;
  all[idx] = {
    ...all[idx],
    pick_date: input.pick_date,
    sport: input.sport,
    label: input.label,
    match_label: input.match_label,
    odds: input.odds,
    stake: input.stake,
    outcome: input.outcome,
    profit,
    notes: input.notes,
  };
  writeLocal(all);
  return all[idx];
}

export async function setOutcome(id: string, outcome: PersonalOutcome): Promise<PersonalBet | null> {
  if (isCloudMode()) {
    const uid = await getUserId();
    if (uid && supabase) {
      // Récupère le bet pour recalculer le profit
      const { data: existing } = await supabase
        .from("personal_bets")
        .select("*")
        .eq("id", id)
        .eq("user_id", uid)
        .single();
      if (!existing) return null;
      const profit = computeProfit(Number(existing.stake), Number(existing.odds), outcome);
      const { data, error } = await supabase
        .from("personal_bets")
        .update({ outcome, profit })
        .eq("id", id)
        .eq("user_id", uid)
        .select()
        .single();
      if (error || !data) return null;
      return rowToBet(data);
    }
  }

  const all = readLocal();
  const idx = all.findIndex((b) => b.id === id);
  if (idx === -1) return null;
  all[idx].outcome = outcome;
  all[idx].profit = computeProfit(all[idx].stake, all[idx].odds, outcome);
  writeLocal(all);
  return all[idx];
}

export async function deleteBet(id: string): Promise<boolean> {
  if (isCloudMode()) {
    const uid = await getUserId();
    if (uid && supabase) {
      const { error } = await supabase
        .from("personal_bets")
        .delete()
        .eq("id", id)
        .eq("user_id", uid);
      if (error) return false;
      return true;
    }
  }

  const all = readLocal();
  const next = all.filter((b) => b.id !== id);
  if (next.length === all.length) return false;
  writeLocal(next);
  return true;
}

// ============================================================================
// Mapping DB -> domain
// ============================================================================

interface PersonalBetRow {
  id: string;
  pick_date: string;
  sport: string | null;
  label: string | null;
  match_label: string | null;
  odds: string | number | null;
  stake: string | number | null;
  outcome: PersonalOutcome | null;
  profit: string | number | null;
  notes: string | null;
  created_at: string;
}

function rowToBet(row: PersonalBetRow): PersonalBet {
  return {
    id: row.id,
    pick_date: row.pick_date,
    sport: row.sport ?? "autre",
    label: row.label ?? "",
    match_label: row.match_label ?? "",
    odds: Number(row.odds ?? 0),
    stake: Number(row.stake ?? 0),
    outcome: (row.outcome ?? "pending") as PersonalOutcome,
    profit: Number(row.profit ?? 0),
    notes: row.notes ?? "",
    created_at: row.created_at,
  };
}
