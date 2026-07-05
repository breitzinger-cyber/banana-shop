import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculatePayout } from "@/lib/odds";
import { pointsForOdds } from "@/lib/tippspiel";
import { awardWinBadges } from "@/lib/award-badges";
import { sendPushToUser } from "@/lib/push";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { outcomeId } = await req.json();
    if (!outcomeId) {
      return NextResponse.json(
        { error: "outcomeId is required." },
        { status: 400 }
      );
    }

    const event = await prisma.event.findUnique({
      where: { id: params.id },
      include: { outcomes: true, bets: true, predictions: true },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    if (event.status === "RESOLVED" || event.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Event is already resolved or cancelled." },
        { status: 400 }
      );
    }

    const winningOutcome = event.outcomes.find((o) => o.id === outcomeId);
    if (!winningOutcome) {
      return NextResponse.json(
        { error: "Outcome not found on this event." },
        { status: 400 }
      );
    }

    let payoutsProcessed = 0;

    // Total pool = sum of all stakes across all outcomes
    const totalPool = event.outcomes.reduce((s, o) => s + o.totalStaked, 0);
    const activeBets = event.bets.filter((b) => b.status === "ACTIVE");
    const winningBets = activeBets.filter((b) => b.outcomeId === outcomeId);

    // Calculate raw payouts and scale down if they'd exceed the pool
    const rawPayouts = new Map(
      winningBets.map((b) => [b.id, calculatePayout(b.tokensStaked, b.lockedOdds)])
    );
    const totalRawPayout = Array.from(rawPayouts.values()).reduce((s, p) => s + p, 0);
    // Scale factor: never pay out more than what's in the pool
    const scaleFactor =
      totalRawPayout > totalPool && totalPool > 0 ? totalPool / totalRawPayout : 1;
    const poolCapped = scaleFactor < 1;

    let houseProfit = 0;

    await prisma.$transaction(async (tx) => {
      // Mark event as resolved
      await tx.event.update({
        where: { id: params.id },
        data: { status: "RESOLVED", resolvedOutcomeId: outcomeId },
      });

      // Process all active bets
      let totalActualPayout = 0;

      for (const bet of activeBets) {
        if (bet.outcomeId === outcomeId) {
          // Winner — apply scale factor to keep bank solvent
          const rawPayout = rawPayouts.get(bet.id) ?? 0;
          const payout = Math.round(rawPayout * scaleFactor * 100) / 100;
          totalActualPayout = Math.round((totalActualPayout + payout) * 100) / 100;

          await tx.bet.update({
            where: { id: bet.id },
            data: { status: "WON", payout },
          });

          await tx.user.update({
            where: { id: bet.userId },
            data: { tokenBalance: { increment: payout } },
          });

          const noteText = poolCapped
            ? `Won on "${winningOutcome.label}" (pool-adjusted payout)`
            : `Won on "${winningOutcome.label}"`;

          await tx.tokenTransaction.create({
            data: {
              userId: bet.userId,
              amount: payout,
              type: "PAYOUT",
              referenceId: params.id,
              note: noteText,
            },
          });

          // Award win badges
          await awardWinBadges(tx, bet.userId, payout).catch(() => {});

          // Push notification to winner
          sendPushToUser(bet.userId, {
            title: "🎉 Du hast gewonnen!",
            body: `Deine Wette auf "${winningOutcome.label}" brachte ${payout.toFixed(1)} Tokens!`,
            url: `/event/${params.id}`,
          }).catch(() => {});

          payoutsProcessed++;
        } else {
          // Loser
          await tx.bet.update({
            where: { id: bet.id },
            data: { status: "LOST", payout: 0 },
          });
        }
      }

      // ── Score free Tippspiel predictions ──────────────────────────────────
      // No banana movement — just award odds-weighted points to correct tips.
      for (const pred of event.predictions) {
        if (pred.status !== "PENDING") continue;
        if (pred.outcomeId === outcomeId) {
          await tx.prediction.update({
            where: { id: pred.id },
            data: { status: "CORRECT", pointsAwarded: pointsForOdds(pred.oddsAtTip) },
          });
        } else {
          await tx.prediction.update({
            where: { id: pred.id },
            data: { status: "WRONG", pointsAwarded: 0 },
          });
        }
      }

      // Credit leftover (pool surplus) to admin — this is the house profit
      const leftover = Math.round((totalPool - totalActualPayout) * 100) / 100;
      if (leftover > 0.005) {
        houseProfit = leftover;
        const admin = await tx.user.findFirst({
          where: { role: "ADMIN" },
          orderBy: { createdAt: "asc" },
        });
        if (admin) {
          await tx.user.update({
            where: { id: admin.id },
            data: { tokenBalance: { increment: leftover } },
          });
          await tx.tokenTransaction.create({
            data: {
              userId: admin.id,
              amount: leftover,
              type: "RAKE",
              referenceId: params.id,
              note: `House profit from "${event.title}"`,
            },
          });
        }
      }
    });

    return NextResponse.json({
      success: true,
      payoutsProcessed,
      winningOutcome: winningOutcome.label,
      poolCapped,
      scaleFactor: Math.round(scaleFactor * 1000) / 1000,
      houseProfit: Math.round(houseProfit * 100) / 100,
    });
  } catch (error) {
    console.error("[admin/events/[id]/resolve/POST]", error);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
