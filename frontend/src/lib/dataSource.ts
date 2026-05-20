/**
 * Source de données statique (lue depuis les JSON copiés dans /public/data).
 *
 * Fichiers servis :
 *   - /data/history.json              → historique global + stats
 *   - /data/predictions/<date>.json   → pick + matchs du jour
 *   - /data/predictions/index.json    → liste des dates disponibles
 */

import { DayPayload, History } from "./types";

const BASE_PATH = process.env.NEXT_PUBLIC_RESOLVED_BASE_PATH || "";

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE_PATH}${path}`, { cache: "no-store" });
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
