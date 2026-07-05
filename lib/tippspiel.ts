/**
 * Free "Tippspiel" (prediction game) helpers.
 * Points are odds-weighted and reset each calendar month (season = "YYYY-MM").
 */

/** Base multiplier: a correct tip at odds 1.0 would award 10 points. */
export const POINTS_BASE = 10;

/** Current season key, e.g. "2026-07". */
export function currentSeason(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Human label, e.g. "July 2026". */
export function formatSeason(season: string): string {
  const [y, m] = season.split("-").map(Number);
  if (!y || !m) return season;
  const d = new Date(y, m - 1, 1);
  return d.toLocaleString("en-US", { month: "long", year: "numeric" });
}

/** Points awarded for a correct tip at the given locked odds. */
export function pointsForOdds(oddsAtTip: number): number {
  return Math.round(oddsAtTip * POINTS_BASE);
}
