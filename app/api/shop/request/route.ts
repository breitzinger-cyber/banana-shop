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

    const { type, amount } = await req.json();

    if (type !== "buy" && type !== "cashout") {
      return NextResponse.json({ error: "Invalid request type." }, { status: 400 });
    }

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return NextResponse.json({ error: "Invalid amount." }, { status: 400 });
    }

    const userId = session.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, tokenBalance: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Cash-out can't exceed current balance
    if (type === "cashout" && amt > user.tokenBalance) {
      return NextResponse.json(
        { error: `You only have ${user.tokenBalance.toFixed(1)} bananas.` },
        { status: 400 }
      );
    }

    // Primary admin = oldest admin account
    const admin = await prisma.user.findFirst({
      where: { role: "ADMIN" },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (!admin) {
      return NextResponse.json({ error: "No admin available." }, { status: 500 });
    }

    if (admin.id === userId) {
      return NextResponse.json(
        { error: "You're the admin — just grant yourself bananas in the Users panel." },
        { status: 400 }
      );
    }

    const content =
      type === "buy"
        ? `🍌 Kauf-Anfrage: ${amt} Bananas (€${amt.toFixed(2)}). ${user.name} möchte aufladen — bitte nach Zahlungseingang unter Users → Grant bananas gutschreiben.`
        : `💸 Auszahl-Anfrage: ${amt} Bananas (€${amt.toFixed(2)}). ${user.name} möchte auszahlen (aktuelles Guthaben: ${user.tokenBalance.toFixed(1)} 🍌). Bitte persönlich auszahlen und den Betrag unter Users abziehen.`;

    await prisma.message.create({
      data: {
        fromUserId: userId,
        toUserId: admin.id,
        content,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[shop/request/POST]", error);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
