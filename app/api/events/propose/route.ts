import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { title, description, category, closesAt, outcomes, proposalNote } =
      await req.json();

    if (!title?.trim() || !description?.trim()) {
      return NextResponse.json(
        { error: "Title and description are required." },
        { status: 400 }
      );
    }

    if (!outcomes || outcomes.length < 2 || outcomes.length > 6) {
      return NextResponse.json(
        { error: "Between 2 and 6 outcomes are required." },
        { status: 400 }
      );
    }

    const labels: string[] = outcomes.map((o: any) => o.label?.trim()).filter(Boolean);
    if (labels.length !== outcomes.length) {
      return NextResponse.json(
        { error: "All outcome labels must be filled in." },
        { status: 400 }
      );
    }

    // Equal base probability split
    const baseProbability = 1 / labels.length;

    const event = await prisma.event.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        category: category || "Other",
        status: "PENDING",
        closesAt: closesAt ? new Date(closesAt) : null,
        proposalNote: proposalNote?.trim() || null,
        createdById: session.user.id,
        outcomes: {
          create: labels.map((label) => ({ label, baseProbability })),
        },
      },
      include: { outcomes: true },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error("[events/propose/POST]", error);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
