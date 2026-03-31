import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push";

export const dynamic = "force-dynamic";

// PATCH: admin approves or rejects a deposit request
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { action, adminNote } = await req.json();
  if (action !== "APPROVE" && action !== "REJECT") {
    return NextResponse.json({ error: "action must be APPROVE or REJECT." }, { status: 400 });
  }

  const depositReq = await prisma.depositRequest.findUnique({
    where: { id: params.id },
    include: { user: { select: { id: true, name: true } } },
  });

  if (!depositReq) {
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  }
  if (depositReq.status !== "PENDING") {
    return NextResponse.json({ error: "Request already processed." }, { status: 400 });
  }

  if (action === "APPROVE") {
    await prisma.$transaction(async (tx) => {
      // Credit tokens to user
      await tx.user.update({
        where: { id: depositReq.userId },
        data: { tokenBalance: { increment: depositReq.amount } },
      });

      // Create transaction record
      await tx.tokenTransaction.create({
        data: {
          userId: depositReq.userId,
          amount: depositReq.amount,
          type: "DEPOSIT",
          referenceId: depositReq.id,
          note: `Einzahlung genehmigt${adminNote ? `: ${adminNote}` : ""}`,
        },
      });

      // Mark request approved
      await tx.depositRequest.update({
        where: { id: params.id },
        data: { status: "APPROVED", adminNote: adminNote?.trim() || null },
      });
    });

    // Push notification
    sendPushToUser(depositReq.userId, {
      title: "✅ Einzahlung genehmigt!",
      body: `${depositReq.amount} Token wurden deinem Konto gutgeschrieben.`,
      url: "/profile",
    }).catch(() => {});

    return NextResponse.json({ success: true, action: "APPROVED" });
  } else {
    // REJECT
    await prisma.depositRequest.update({
      where: { id: params.id },
      data: { status: "REJECTED", adminNote: adminNote?.trim() || null },
    });

    sendPushToUser(depositReq.userId, {
      title: "❌ Einzahlung abgelehnt",
      body: adminNote
        ? `Begründung: ${adminNote}`
        : "Dein Einzahlungsantrag wurde abgelehnt. Kontaktiere den Admin.",
      url: "/profile",
    }).catch(() => {});

    return NextResponse.json({ success: true, action: "REJECTED" });
  }
}
