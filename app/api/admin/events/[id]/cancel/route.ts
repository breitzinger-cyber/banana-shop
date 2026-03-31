import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const event = await prisma.event.findUnique({
      where: { id: params.id },
      include: { bets: { where: { status: "ACTIVE" } } },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    if (event.status === "RESOLVED" || event.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Event is already resolved or cancelled." },
        { status: 400 }
      );
    }

    let refundsProcessed = 0;

    await prisma.$transaction(async (tx) => {
      await tx.event.update({
        where: { id: params.id },
        data: { status: "CANCELLED" },
      });

      for (const bet of event.bets) {
        await tx.bet.update({
          where: { id: bet.id },
          data: { status: "REFUNDED", payout: bet.tokensStaked },
        });

        await tx.user.update({
          where: { id: bet.userId },
          data: { tokenBalance: { increment: bet.tokensStaked } },
        });

        await tx.tokenTransaction.create({
          data: {
            userId: bet.userId,
            amount: bet.tokensStaked,
            type: "REFUND",
            referenceId: bet.id,
            note: "Market cancelled",
          },
        });

        refundsProcessed++;
      }
    });

    return NextResponse.json({ success: true, refundsProcessed });
  } catch (error) {
    console.error("[admin/events/[id]/cancel/POST]", error);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
