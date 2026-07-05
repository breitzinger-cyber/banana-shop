import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLockedOdds, calculatePayout } from "@/lib/odds";
import { RAKE_PERCENT } from "@/lib/config";
import { MAX_BET_TOKENS, DAILY_SPEND_LIMIT } from "@/lib/currency";
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
        { error: `Max bet is ${MAX_BET_TOKENS} tokens (€${MAX_BET_TOKENS}) per market.` },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    // Check daily spend limit
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todaySpend = await prisma.tokenTransaction.aggregate({
      where: {
        userId,
        type: "BET",
        createdAt: { gte: todayStart },
      },
      _sum: { amount: true },
    });

    // BET transactions are stored as negative amounts
    const spentToday = Math.abs(todaySpend._sum.amount ?? 0);

    if (spentToday + tokensStaked > DAILY_SPEND_LIMIT) {
      const remaining = Math.max(0, DAILY_SPEND_LIMIT - spentToday);
      return NextResponse.json(
        {
          error: `Daily spend limit reached. You can bet ${remaining.toFixed(1)} more token${remaining !== 1 ? "s" : ""} today.`,
          remainingToday: remaining,
        },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error("USER_NOT_FOUND");

      if (user.tokenBalance < tokensStaked) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      const event = await tx.event.findUnique({
        where: { id: eventId },
        include: { outcomes: true },
      });

      if (!event) throw new Error("EVENT_NOT_FOUND");
      if (event.status !== "OPEN") throw new Error("EVENT_NOT_OPEN");

      const outcome = event.outcomes.find((o) => o.id === outcomeId);
      if (!outcome) throw new Error("OUTCOME_NOT_FOUND");

      const rake = Math.round(tokensStaked * RAKE_PERCENT * 100) / 100;
      const effectiveStake = Math.round((tokensStaked - rake) * 100) / 100;
      const lockedOdds = getLockedOdds(event.outcomes, outcomeId);

      await tx.user.update({
        where: { id: userId },
        data: { tokenBalance: { decrement: tokensStaked } },
      });

      await tx.outcome.update({
        where: { id: outcomeId },
        data: { totalStaked: { increment: effectiveStake } },
      });

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

      await tx.tokenTransaction.create({
        data: {
          userId,
          amount: -tokensStaked,
          type: "BET",
          referenceId: bet.id,
          note: `Bet on "${outcome.label}"${rake > 0 ? ` (incl. ${rake.toFixed(2)} fee)` : ""}`,
        },
      });

      if (rake > 0) {
        const admin = await tx.user.findFirst({
          where: { role: "ADMIN" },
          orderBy: { createdAt: "asc" },
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

      const newBadges = await awardBetBadges(tx, userId, tokensStaked).catch(() => []);

      return {
        bet,
        lockedOdds,
        rake,
        effectiveStake,
        projectedPayout: calculatePayout(effectiveStake, lockedOdds),
        newBalance: user.tokenBalance - tokensStaked,
        spentToday: spentToday + tokensStaked,
        remainingToday: Math.max(0, DAILY_SPEND_LIMIT - spentToday - tokensStaked),
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
