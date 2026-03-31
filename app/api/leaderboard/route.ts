import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        tokenBalance: true,
        bets: {
          select: {
            tokensStaked: true,
            payout: true,
            status: true,
          },
        },
      },
    });

    const ranked = users
      .map((u) => {
        const totalStaked = u.bets
          .filter((b) => b.status !== "REFUNDED")
          .reduce((s, b) => s + b.tokensStaked, 0);
        const totalPayout = u.bets
          .filter((b) => b.status === "WON")
          .reduce((s, b) => s + (b.payout ?? 0), 0);
        const wins = u.bets.filter((b) => b.status === "WON").length;
        const losses = u.bets.filter((b) => b.status === "LOST").length;

        return {
          id: u.id,
          name: u.name,
          tokenBalance: u.tokenBalance,
          wins,
          losses,
          totalBets: wins + losses,
          netProfit: totalPayout - totalStaked,
        };
      })
      .sort((a, b) => b.netProfit - a.netProfit);

    return NextResponse.json(ranked);
  } catch (error) {
    console.error("[leaderboard/GET]", error);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
