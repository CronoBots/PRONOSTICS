/**
 * Source de données statique avec cache busting agressif.
 */

import { DayPayload, History } from "./types";

const BASE_PATH = process.env.NEXT_PUBLIC_RESOLVED_BASE_PATH || "";

async function fetchJson<T>(path: string): Promise<T | null> {
  // Bust de cache via query string : force CDN + navigateur à revalider
  const bust = Date.now();
  try {
    const res = await fetch(`${BASE_PATH}${path}?v=${bust}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function fetchHistory(): Promise<History | null> {
  return fetchJson<History>("/data/history.json");
}

export function fetchDay(date: string): Promise<DayPayload | null> {
  return fetchJson<DayPayload>(`/data/predictions/${date}.json`);
}

export function fetchAvailableDates(): Promise<{ dates: string[] } | null> {
  return fetchJson<{ dates: string[] }>("/data/predictions/index.json");
}
