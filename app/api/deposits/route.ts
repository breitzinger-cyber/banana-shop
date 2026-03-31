import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET: user fetches their own deposit requests
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const requests = await prisma.depositRequest.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ requests });
}

// POST: user creates a new deposit request
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { amount, note } = await req.json();

  if (!amount || typeof amount !== "number" || amount <= 0 || amount > 100) {
    return NextResponse.json({ error: "Invalid amount (1–100 tokens)." }, { status: 400 });
  }

  // Check for existing pending request
  const existing = await prisma.depositRequest.findFirst({
    where: { userId: session.user.id, status: "PENDING" },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Du hast bereits einen offenen Antrag. Warte auf die Bestätigung des Admins." },
      { status: 400 }
    );
  }

  const request = await prisma.depositRequest.create({
    data: {
      userId: session.user.id,
      amount: Math.round(amount * 100) / 100,
      note: note?.trim() || null,
    },
  });

  return NextResponse.json({ request }, { status: 201 });
}
