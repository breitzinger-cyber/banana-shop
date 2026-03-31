import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const comments = await prisma.comment.findMany({
    where: { eventId: params.eventId },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { id: true, name: true, role: true } } },
  });
  return NextResponse.json(comments);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Empty comment." }, { status: 400 });
  if (content.trim().length > 500) return NextResponse.json({ error: "Too long (max 500 chars)." }, { status: 400 });

  const event = await prisma.event.findUnique({ where: { id: params.eventId }, select: { id: true } });
  if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });

  const comment = await prisma.comment.create({
    data: { eventId: params.eventId, userId: session.user.id, content: content.trim() },
    include: { user: { select: { id: true, name: true, role: true } } },
  });

  return NextResponse.json(comment, { status: 201 });
}
