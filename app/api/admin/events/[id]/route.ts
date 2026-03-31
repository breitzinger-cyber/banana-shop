import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const body = await req.json();
    const allowedFields = ["title", "description", "category", "status", "closesAt"];
    const data: Record<string, any> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        data[field] = field === "closesAt" ? (body[field] ? new Date(body[field]) : null) : body[field];
      }
    }

    const event = await prisma.event.update({
      where: { id: params.id },
      data,
      include: { outcomes: true },
    });

    return NextResponse.json(event);
  } catch (error) {
    console.error("[admin/events/[id]/PUT]", error);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
