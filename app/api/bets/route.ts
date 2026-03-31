import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLockedOdds, calculatePayout } from "@/lib/odds";
import { RAKE_PERCENT } from "@/lib/config";
import { MAX_BET_TOKENS } from "@/lib/currency";
import { awardBetBadges } from "@/lib/award-badges";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { eventId, outcomeId, tokensStaked } = await req.json();

    if (!eventId || !outcomeId || !tokensStaked || tokensStaked <= 0) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    if (tokensStaked > MAX_BET_TOKENS) {
      return NextResponse.json(
        { error: `Max bet is ${MAX_BET_TOKENS} tokens (≈ €50) per market.` },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    const result = await prisma.$transaction(async (tx) => {
      // Load user with fresh balance
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error("USER_NOT_FOUND");

      if (user.tokenBalance < tokensStaked) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      // Load event with outcomes
      const event = await tx.event.findUnique({
        where: { id: eventId },
        include: { outcomes: true },
      });

      if (!event) throw new Error("EVENT_NOT_FOUND");
      if (event.status !== "OPEN") throw new Error("EVENT_NOT_OPEN");

      const outcome = event.outcomes.find((o) => o.id === outcomeId);
      if (!outcome) throw new Error("OUTCOME_NOT_FOUND");

      // ── Rake calculation ──────────────────────────────────────────────────
      // A small percentage of every bet goes to the admin account to cover
      // server costs (~3 tokens/month at normal group activity).
      const rake = Math.round(tokensStaked * RAKE_PERCENT * 100) / 100;
      // The effective stake is what enters the pool and drives payouts.
      const effectiveStake = Math.round((tokensStaked - rake) * 100) / 100;

      // Calculate locked odds based on current pool state (before this bet)
      const lockedOdds = getLockedOdds(event.outcomes, outcomeId);

      // Deduct full amount from bettor
      await tx.user.update({
        where: { id: userId },
        data: { tokenBalance: { decrement: tokensStaked } },
      });

      // Only the effective stake enters the pool
      await tx.outcome.update({
        where: { id: outcomeId },
        data: { totalStaked: { increment: effectiveStake } },
      });

      // Create bet record — tokensStaked stores the effective stake (payout basis)
      const bet = await tx.bet.create({
        data: {
          userId,
          eventId,
          outcomeId,
          tokensStaked: effectiveStake,
          lockedOdds,
          status: "ACTIVE",
        },
      });

      // Bettor's transaction (full amount deducted)
      await tx.tokenTransaction.create({
        data: {
          userId,
          amount: -tokensStaked,
          type: "BET",
          referenceId: bet.id,
          note: `Bet on "${outcome.label}"${rake > 0 ? ` (incl. ${rake.toFixed(2)} fee)` : ""}`,
        },
      });

      // ── Credit rake to admin ──────────────────────────────────────────────
      if (rake > 0) {
        const admin = await tx.user.findFirst({
          where: { role: "ADMIN" },
          orderBy: { createdAt: "asc" }, // oldest admin = primary
        });

        if (admin && admin.id !== userId) {
          await tx.user.update({
            where: { id: admin.id },
            data: { tokenBalance: { increment: rake } },
          });

          await tx.tokenTransaction.create({
            data: {
              userId: admin.id,
              amount: rake,
              type: "RAKE",
              referenceId: bet.id,
              note: `Platform fee from bet by ${user.name}`,
            },
          });
        }
      }

      // Award badges (non-blocking — errors silently ignored)
      const newBadges = await awardBetBadges(tx, userId, tokensStaked).catch(() => []);

      return {
        bet,
        lockedOdds,
        rake,
        effectiveStake,
        projectedPayout: calculatePayout(effectiveStake, lockedOdds),
        newBalance: user.tokenBalance - tokensStaked,
        newBadges,
      };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    const msgMap: Record<string, [string, number]> = {
      USER_NOT_FOUND: ["User not found.", 404],
      INSUFFICIENT_BALANCE: ["Insufficient token balance.", 400],
      EVENT_NOT_FOUND: ["Event not found.", 404],
      EVENT_NOT_OPEN: ["This market is not open for betting.", 400],
      OUTCOME_NOT_FOUND: ["Outcome not found.", 404],
    };

    if (error.message in msgMap) {
      const [msg, status] = msgMap[error.message];
      return NextResponse.json({ error: msg }, { status });
    }

    console.error("[bets/POST]", error);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
