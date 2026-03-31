/**
 * Platform configuration
 *
 * RAKE_PERCENT: fraction of each bet taken as a platform fee and credited
 * to the first admin account. Default 2% → ~3 tokens/month at typical
 * group activity (roughly 150 tokens staked per month).
 *
 * Set NEXT_PUBLIC_RAKE_PERCENT in .env so the bet form can show the fee.
 */
export const RAKE_PERCENT =
  parseFloat(process.env.NEXT_PUBLIC_RAKE_PERCENT ?? "0.02");
