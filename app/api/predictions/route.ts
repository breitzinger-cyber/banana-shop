import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLockedOdds } from "@/lib/odds";
import { currentSeason, pointsForOdds } from "@/lib/tippspiel";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { eventId, outcomeId } = await req.json();
    if (!eventId || !outcomeId) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const userId = session.user.id;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { outcomes: true },
    });
    if (!event) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }
    if (event.status !== "OPEN") {
      return NextResponse.json(
        { error: "Tips are only open while the market is open." },
        { status: 400 }
      );
    }

    const outcome = event.outcomes.find((o) => o.id === outcomeId);
    if (!outcome) {
      return NextResponse.json({ error: "Outcome not found." }, { status: 400 });
    }

    // One tip per user per event
    const existing = await prisma.prediction.findUnique({
      where: { userId_eventId: { userId, eventId } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "You already made a tip on this market." },
        { status: 400 }
      );
    }

    const oddsAtTip = getLockedOdds(event.outcomes, outcomeId);

    const prediction = await prisma.prediction.create({
      data: {
        userId,
        eventId,
        outcomeId,
        oddsAtTip,
        season: currentSeason(),
        status: "PENDING",
      },
    });

    return NextResponse.json(
      {
        prediction,
        potentialPoints: pointsForOdds(oddsAtTip),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[predictions/POST]", error);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
