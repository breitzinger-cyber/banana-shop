import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const event = await prisma.event.findUnique({
      where: { id: params.id },
      include: {
        outcomes: true,
        bets: {
          orderBy: { placedAt: "desc" },
          take: 50,
          include: {
            outcome: { select: { label: true } },
            user: { select: { name: true, id: true } },
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    return NextResponse.json(event);
  } catch (error) {
    console.error("[events/[id]/GET]", error);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
