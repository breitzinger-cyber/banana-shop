/** 1 Token = 1 Euro */
export const TOKEN_TO_EUR = 1;

/** Max tokens a user can BET per day (legal spend cap) */
export const DAILY_SPEND_LIMIT = 5;

/** Max tokens per single bet (capped at daily limit) */
export const MAX_BET_TOKENS = DAILY_SPEND_LIMIT;

export function tokensToEur(tokens: number): number {
  return Math.round(tokens * TOKEN_TO_EUR * 100) / 100;
}

export function eurToTokens(eur: number): number {
  return Math.round(eur / TOKEN_TO_EUR * 100) / 100;
}

export function formatEur(eur: number): string {
  return `€${eur.toFixed(2)}`;
}

export function formatTokensWithEur(tokens: number): string {
  const display = tokens % 1 === 0 ? tokens : tokens.toFixed(2);
  return `${display} token${tokens !== 1 ? "s" : ""} (${formatEur(tokensToEur(tokens))})`;
}
