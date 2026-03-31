import { PrismaClient } from "@prisma/client";
import { MAX_BET_TOKENS } from "./currency";

/**
 * Check and award badges to a user after a bet is placed.
 * Call this inside or just after a transaction (pass the tx client).
 */
export async function awardBetBadges(
  tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">,
  userId: string,
  tokensStaked: number
) {
  const toAward: string[] = [];

  const [bets, existingBadges] = await Promise.all([
    tx.bet.findMany({ where: { userId }, select: { id: true, tokensStaked: true, eventId: true } }),
    tx.userBadge.findMany({ where: { userId }, select: { badge: true } }),
  ]);

  const owned = new Set(existingBadges.map((b) => b.badge));
  const totalBets = bets.length;
  const uniqueEvents = new Set(bets.map((b) => b.eventId)).size;

  if (!owned.has("FIRST_BET") && totalBets >= 1) toAward.push("FIRST_BET");
  if (!owned.has("HIGH_ROLLER") && tokensStaked >= 15) toAward.push("HIGH_ROLLER");
  if (!owned.has("ALL_IN") && tokensStaked >= MAX_BET_TOKENS) toAward.push("ALL_IN");
  if (!owned.has("TEN_BETS") && totalBets >= 10) toAward.push("TEN_BETS");
  if (!owned.has("FIVE_EVENTS") && uniqueEvents >= 5) toAward.push("FIVE_EVENTS");

  if (toAward.length > 0) {
    await tx.userBadge.createMany({
      data: toAward.map((badge) => ({ userId, badge })),
    });
  }

  return toAward;
}

/**
 * Check and award badges after a bet is resolved as WON.
 */
export async function awardWinBadges(
  tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">,
  userId: string,
  payout: number
) {
  const toAward: string[] = [];

  const [bets, existingBadges, user] = await Promise.all([
    tx.bet.findMany({ where: { userId, status: "WON" }, select: { id: true, payout: true, tokensStaked: true } }),
    tx.userBadge.findMany({ where: { userId }, select: { badge: true } }),
    tx.user.findUnique({ where: { id: userId }, select: { tokenBalance: true } }),
  ]);

  const owned = new Set(existingBadges.map((b) => b.badge));
  const wins = bets.length;
  const totalPayout = bets.reduce((s, b) => s + (b.payout ?? 0), 0);
  const totalStaked = bets.reduce((s, b) => s + b.tokensStaked, 0);
  const netProfit = totalPayout - totalStaked;

  if (!owned.has("FIRST_WIN") && wins >= 1) toAward.push("FIRST_WIN");
  if (!owned.has("BIG_WIN") && payout >= 20) toAward.push("BIG_WIN");
  if (!owned.has("FIVE_WINS") && wins >= 5) toAward.push("FIVE_WINS");
  if (!owned.has("TEN_WINS") && wins >= 10) toAward.push("TEN_WINS");
  if (!owned.has("PROFIT_50") && netProfit >= 50) toAward.push("PROFIT_50");

  if (toAward.length > 0) {
    await tx.userBadge.createMany({
      data: toAward.map((badge) => ({ userId, badge })),
    });
  }

  return toAward;
}
