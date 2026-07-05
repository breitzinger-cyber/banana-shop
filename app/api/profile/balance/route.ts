import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DAILY_SPEND_LIMIT } from "@/lib/currency";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [user, todaySpend] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { tokenBalance: true },
    }),
    prisma.tokenTransaction.aggregate({
      where: {
        userId: session.user.id,
        type: "BET",
        createdAt: { gte: todayStart },
      },
      _sum: { amount: true },
    }),
  ]);

  const spentToday = Math.abs(todaySpend._sum.amount ?? 0);

  return NextResponse.json({
    tokenBalance: user?.tokenBalance ?? 0,
    spentToday,
    remainingToday: Math.max(0, DAILY_SPEND_LIMIT - spentToday),
    dailyLimit: DAILY_SPEND_LIMIT,
  });
}
