export interface ProbabilityEntry {
  outcome: string;
  probability: number;
}

export interface Prediction {
  engine: string;
  pick: string;
  confidence: number;
  expectedValue: number | null;
  rationale: string[];
  probabilities: ProbabilityEntry[];
  oddsSnapshot: ProbabilityEntry[] | null;
}

export interface Match {
  id: number;
  sport: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  kickoff: string;
  stage: string | null;
  venue: string | null;
  source: string;
  prediction: Prediction | null;
}

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
