import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "OPEN";

    const events = await prisma.event.findMany({
      where: status === "ALL" ? {} : { status },
      include: {
        outcomes: true,
        _count: { select: { bets: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error("[events/GET]", error);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
