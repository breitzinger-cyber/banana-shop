import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { title, description, category, closesAt, outcomes } = await req.json();

    if (!title || !description || !outcomes || outcomes.length < 2) {
      return NextResponse.json(
        { error: "Title, description, and at least 2 outcomes are required." },
        { status: 400 }
      );
    }

    // Validate probabilities sum to ~1.0
    const total = outcomes.reduce(
      (s: number, o: any) => s + o.baseProbability,
      0
    );
    if (Math.abs(total - 1) > 0.01) {
      return NextResponse.json(
        { error: "Outcome probabilities must sum to 1.0." },
        { status: 400 }
      );
    }

    const event = await prisma.event.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        category: category || "General",
        closesAt: closesAt ? new Date(closesAt) : null,
        createdById: session.user.id,
        outcomes: {
          create: outcomes.map((o: any) => ({
            label: o.label.trim(),
            baseProbability: o.baseProbability,
          })),
        },
      },
      include: { outcomes: true },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error("[admin/events/POST]", error);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
