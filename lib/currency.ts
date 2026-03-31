/**
 * Token ↔ Euro conversion
 * 1 Token = price of one Monster Energy can in Austria (≈ €1.99)
 */
export const MONSTER_PRICE_EUR = parseFloat(
  process.env.NEXT_PUBLIC_MONSTER_PRICE_EUR ?? "1.99"
);

export const MAX_BET_EUR = parseFloat(
  process.env.NEXT_PUBLIC_MAX_BET_EUR ?? "50"
);

/** Max tokens a user can bet on a single event (derived from MAX_BET_EUR) */
export const MAX_BET_TOKENS = Math.floor(MAX_BET_EUR / MONSTER_PRICE_EUR);

export function tokensToEur(tokens: number): number {
  return Math.round(tokens * MONSTER_PRICE_EUR * 100) / 100;
}

export function eurToTokens(eur: number): number {
  return Math.round((eur / MONSTER_PRICE_EUR) * 100) / 100;
}

export function formatEur(eur: number): string {
  return `€${eur.toFixed(2)}`;
}

/** e.g. "5 tokens (≈ €9.95)" */
export function formatTokensWithEur(tokens: number): string {
  return `${tokens % 1 === 0 ? tokens : tokens.toFixed(2)} tokens (≈ ${formatEur(tokensToEur(tokens))})`;
}
