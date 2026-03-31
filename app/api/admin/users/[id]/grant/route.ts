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

    const { amount, note } = await req.json();

    if (typeof amount !== "number" || amount === 0) {
      return NextResponse.json(
        { error: "A non-zero amount is required." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { id: params.id } });
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Prevent balance going below 0
    if (amount < 0 && user.tokenBalance + amount < 0) {
      return NextResponse.json(
        { error: "This would result in a negative balance." },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: params.id },
        data: { tokenBalance: { increment: amount } },
      }),
      prisma.tokenTransaction.create({
        data: {
          userId: params.id,
          amount,
          type: "GRANT",
          note: note || `Manual grant by ${session.user.name}`,
        },
      }),
    ]);

    const updated = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, name: true, tokenBalance: true },
    });

    return NextResponse.json({
      success: true,
      userName: user.name,
      newBalance: updated?.tokenBalance,
    });
  } catch (error) {
    console.error("[admin/users/[id]/grant/POST]", error);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
