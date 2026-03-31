/**
 * ICE Odds Engine
 *
 * Core mechanic: Admin-set base probability acts as a Bayesian prior.
 * Bet volume shifts the odds but never fully overrides the prior.
 *
 * Formula:
 *   weight_i = baseProbability_i * (1 + totalStaked_i)
 *   dynamicProbability_i = weight_i / Σ(weight_j)
 *   odds_i = 1 / dynamicProbability_i
 */

export interface OutcomeData {
  id: string;
  baseProbability: number;
  totalStaked: number;
}

export interface OddsResult {
  id: string;
  probability: number;
  odds: number;
}

/**
 * Calculate dynamic probabilities for all outcomes.
 * Returns a map of outcomeId → probability (0–1).
 */
export function calculateDynamicProbabilities(
  outcomes: OutcomeData[]
): Map<string, number> {
  if (outcomes.length === 0) return new Map();

  const weights = outcomes.map((o) => ({
    id: o.id,
    weight: o.baseProbability * (1 + o.totalStaked),
  }));

  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);

  if (totalWeight === 0) {
    // Fallback: equal distribution
    const equal = 1 / outcomes.length;
    return new Map(outcomes.map((o) => [o.id, equal]));
  }

  return new Map(weights.map((w) => [w.id, w.weight / totalWeight]));
}

/**
 * Convert probability to decimal odds.
 * e.g. probability 0.4 → 2.5x
 */
export function probabilityToOdds(probability: number): number {
  if (probability <= 0) return 999;
  if (probability >= 1) return 1;
  return 1 / probability;
}

/**
 * Get all odds for a set of outcomes in a single pass.
 */
export function calculateAllOdds(outcomes: OutcomeData[]): OddsResult[] {
  const probs = calculateDynamicProbabilities(outcomes);
  return outcomes.map((o) => {
    const probability = probs.get(o.id) ?? 0;
    return {
      id: o.id,
      probability,
      odds: probabilityToOdds(probability),
    };
  });
}

/**
 * Get the locked odds for a specific outcome at the current moment.
 * Call this just before placing a bet to get the value to store.
 */
export function getLockedOdds(
  outcomes: OutcomeData[],
  targetOutcomeId: string
): number {
  const probs = calculateDynamicProbabilities(outcomes);
  const prob = probs.get(targetOutcomeId) ?? 0;
  return probabilityToOdds(prob);
}

/**
 * Calculate payout for a winning bet.
 */
export function calculatePayout(
  tokensStaked: number,
  lockedOdds: number
): number {
  return Math.round(tokensStaked * lockedOdds * 100) / 100;
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

export function formatOdds(odds: number): string {
  return `${odds.toFixed(2)}x`;
}

export function formatProbability(probability: number): string {
  return `${(probability * 100).toFixed(1)}%`;
}

export function formatTokens(amount: number): string {
  return amount % 1 === 0 ? amount.toString() : amount.toFixed(2);
}
