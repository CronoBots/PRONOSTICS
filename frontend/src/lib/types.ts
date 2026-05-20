export const SPORT_LABELS: Record<string, string> = {
  football: "Football",
  basketball: "Basketball",
  tennis: "Tennis",
  nfl: "NFL",
  mlb: "MLB",
  nhl: "NHL",
};

export const SPORT_EMOJIS: Record<string, string> = {
  football: "⚽",
  basketball: "🏀",
  tennis: "🎾",
  nfl: "🏈",
  mlb: "⚾",
  nhl: "🏒",
};

export interface SafePick {
  match_id: number;
  sport: string;
  league: string;
  home_team: string;
  away_team: string;
  kickoff: string;
  pick: string;
  odds: number;
  model_probability: number;
  book_probability: number;
  expected_value: number;
  confidence: number;
  engine: string;
  rationale: string[];
  sources?: string[];
  stake?: number;
  potential_profit?: number;
  potential_return?: number;
  kind?: "value_bet" | "safe_favorite";
}

export interface DayPayload {
  date: string;
  generated_at: string;
  safe_pick: SafePick | null;
  value_picks: SafePick[];
}

export type Outcome = "win" | "loss" | "pending" | "void";

export interface HistoryPick {
  date: string;
  match: {
    sport: string;
    league: string;
    home_team: string;
    away_team: string;
    kickoff: string;
  };
  pick: string;
  odds: number;
  model_probability: number;
  book_probability: number;
  expected_value: number;
  engine: string;
  rationale: string[];
  stake: number;
  outcome: Outcome;
  profit: number;
  bankroll_after: number;
}

export interface HistoryStats {
  // Coeur
  total_picks: number;
  won: number;
  lost: number;
  pending: number;
  profit: number;
  roi_percent: number;
  average_odds: number;
  win_rate: number;
  // Bankroll
  starting_bankroll: number;
  current_bankroll: number;
  progression_percent: number;
  drawdown_max: number;
  // Streaks
  current_streak: number;
  best_streak: number;
  worst_streak: number;
  // Mises
  total_stake_played: number;
  pending_stake: number;
  avg_stake: number;
  max_stake: number;
  // Performances extrêmes
  max_odds_won: number;
  max_profit_single: number;
  max_loss_single: number;
}

export interface History {
  picks: HistoryPick[];
  stats: HistoryStats;
  generated_at: string;
}
