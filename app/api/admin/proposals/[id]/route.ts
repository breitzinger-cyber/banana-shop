import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { action, adminReviewNote, baseProbabilities } = await req.json();

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    const event = await prisma.event.findUnique({
      where: { id: params.id },
      include: { outcomes: true },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    if (event.status !== "PENDING") {
      return NextResponse.json(
        { error: "Event is not pending review." },
        { status: 400 }
      );
    }

    if (action === "approve") {
      // Optionally update base probabilities if provided
      const updates: Promise<any>[] = [
        prisma.event.update({
          where: { id: params.id },
          data: { status: "OPEN", adminReviewNote: adminReviewNote?.trim() || null },
        }),
      ];

      if (baseProbabilities && Array.isArray(baseProbabilities)) {
        const total = baseProbabilities.reduce(
          (s: number, p: number) => s + p,
          0
        );
        if (Math.abs(total - 1) < 0.01) {
          event.outcomes.forEach((outcome, i) => {
            if (baseProbabilities[i] !== undefined) {
              updates.push(
                prisma.outcome.update({
                  where: { id: outcome.id },
                  data: { baseProbability: baseProbabilities[i] },
                })
              );
            }
          });
        }
      }

      await Promise.all(updates);
    } else {
      await prisma.event.update({
        where: { id: params.id },
        data: {
          status: "CANCELLED",
          adminReviewNote: adminReviewNote?.trim() || null,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[admin/proposals/PATCH]", error);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
