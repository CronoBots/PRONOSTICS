import { gql } from "@apollo/client";

export const GET_DAILY_MATCHES = gql`
  query GetDailyMatches($onDate: Date, $sport: String, $minConfidence: Float) {
    matches(onDate: $onDate, sport: $sport, minConfidence: $minConfidence) {
      id
      sport
      league
      homeTeam
      awayTeam
      kickoff
      stage
      venue
      source
      prediction {
        engine
        pick
        confidence
        expectedValue
        rationale
        probabilities {
          outcome
          probability
        }
        oddsSnapshot {
          outcome
          probability
        }
      }
    }
    supportedSports
  }
`;

export const GET_TOP_PICKS = gql`
  query GetTopPicks($onDate: Date!, $limit: Int) {
    topPicks(onDate: $onDate, limit: $limit) {
      id
      sport
      league
      homeTeam
      awayTeam
      kickoff
      prediction {
        pick
        confidence
        expectedValue
        rationale
      }
    }
  }
`;
