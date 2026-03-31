import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateDynamicProbabilities } from "@/lib/odds";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: {
      outcomes: { orderBy: { baseProbability: "desc" } },
      bets: {
        where: { status: { not: "REFUNDED" } },
        orderBy: { placedAt: "asc" },
        select: { outcomeId: true, tokensStaked: true, placedAt: true },
      },
    },
  });

  if (!event) return NextResponse.json({ error: "Not found." }, { status: 404 });

  // Replay bets to reconstruct odds history
  const stakedMap = new Map(event.outcomes.map((o) => [o.id, 0]));

  function getSnapshot() {
    const outcomeData = event!.outcomes.map((o) => ({
      id: o.id,
      baseProbability: o.baseProbability,
      totalStaked: stakedMap.get(o.id) ?? 0,
    }));
    const probMap = calculateDynamicProbabilities(outcomeData);
    const probabilities: Record<string, number> = {};
    probMap.forEach((p, id) => {
      probabilities[id] = Math.round(p * 1000) / 10; // → percentage, 1 decimal
    });
    return probabilities;
  }

  const snapshots: { timestamp: string; probabilities: Record<string, number> }[] = [];

  // Initial state (no bets)
  snapshots.push({ timestamp: event.createdAt.toISOString(), probabilities: getSnapshot() });

  // Replay each bet
  for (const bet of event.bets) {
    stakedMap.set(bet.outcomeId, (stakedMap.get(bet.outcomeId) ?? 0) + bet.tokensStaked);
    snapshots.push({ timestamp: bet.placedAt.toISOString(), probabilities: getSnapshot() });
  }

  return NextResponse.json({
    outcomes: event.outcomes.map((o) => ({ id: o.id, label: o.label })),
    snapshots,
  });
}
