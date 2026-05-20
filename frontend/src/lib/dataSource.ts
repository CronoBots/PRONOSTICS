/**
 * Source de données du frontend.
 *
 * En production (déploiement GitHub Pages), on lit les fichiers JSON
 * versionnés dans `backend/data/predictions/<date>.json`, copiés dans
 * `frontend/public/data/predictions/` au moment du build.
 *
 * En dev, on peut aussi pointer vers le backend GraphQL en local en
 * définissant `NEXT_PUBLIC_DATA_MODE=graphql` et `NEXT_PUBLIC_GRAPHQL_URL`.
 */

import { Match, ProbabilityEntry } from "./types";

const MODE = process.env.NEXT_PUBLIC_DATA_MODE || "static";
const BASE_PATH = process.env.NEXT_PUBLIC_RESOLVED_BASE_PATH || "";
const SUPPORTED_SPORTS = ["football", "basketball", "tennis", "nfl", "mlb", "nhl"];

interface RawMatch {
  id: number;
  sport: string;
  league: string;
  home_team: string;
  away_team: string;
  kickoff: string;
  stage: string | null;
  source: string;
  prediction: {
    engine: string;
    pick: string;
    confidence: number;
    expected_value: number | null;
    probabilities: Record<string, number>;
    rationale: string[];
    odds_snapshot: Record<string, number> | null;
  } | null;
}

interface RawPayload {
  date: string;
  generated_at: string;
  matches: RawMatch[];
}

export interface FetchResult {
  matches: Match[];
  supportedSports: string[];
  generatedAt: string | null;
}

function toEntries(record: Record<string, number> | null): ProbabilityEntry[] | null {
  if (!record) return null;
  return Object.entries(record).map(([outcome, probability]) => ({
    outcome,
    probability,
  }));
}

function transformStatic(raw: RawMatch): Match {
  return {
    id: raw.id,
    sport: raw.sport,
    league: raw.league,
    homeTeam: raw.home_team,
    awayTeam: raw.away_team,
    kickoff: raw.kickoff,
    stage: raw.stage,
    venue: null,
    source: raw.source,
    prediction: raw.prediction
      ? {
          engine: raw.prediction.engine,
          pick: raw.prediction.pick,
          confidence: raw.prediction.confidence,
          expectedValue: raw.prediction.expected_value,
          rationale: raw.prediction.rationale ?? [],
          probabilities: toEntries(raw.prediction.probabilities) ?? [],
          oddsSnapshot: toEntries(raw.prediction.odds_snapshot),
        }
      : null,
  };
}

async function fetchStatic(date: string): Promise<FetchResult> {
  const url = `${BASE_PATH}/data/predictions/${date}.json`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      return { matches: [], supportedSports: SUPPORTED_SPORTS, generatedAt: null };
    }
    const payload: RawPayload = await res.json();
    return {
      matches: payload.matches.map(transformStatic),
      supportedSports: SUPPORTED_SPORTS,
      generatedAt: payload.generated_at,
    };
  } catch {
    return { matches: [], supportedSports: SUPPORTED_SPORTS, generatedAt: null };
  }
}

export async function fetchMatches(
  date: string,
  sport: string | null,
  minConfidence: number,
): Promise<FetchResult> {
  if (MODE !== "static") {
    // En mode GraphQL, on délègue à Apollo via le hook useQuery dans les pages
    // qui en ont besoin. Ce chemin n'est pas utilisé par défaut.
    throw new Error("Use Apollo's useQuery directly in GraphQL mode.");
  }

  const result = await fetchStatic(date);
  let matches = result.matches;
  if (sport) {
    matches = matches.filter((m) => m.sport === sport);
  }
  if (minConfidence > 0) {
    matches = matches.filter(
      (m) => m.prediction !== null && m.prediction.confidence >= minConfidence,
    );
  }
  matches.sort((a, b) => (b.prediction?.confidence ?? 0) - (a.prediction?.confidence ?? 0));
  return { ...result, matches };
}

export const DATA_MODE = MODE;
