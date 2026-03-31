import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push";

export const dynamic = "force-dynamic";

// GET — fetch the current user's conversation with the admin
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });

  if (!admin) return NextResponse.json({ messages: [], admin: null });

  const userId = session.user.id;
  const isAdmin = session.user.role === "ADMIN";

  // Admin sees all messages; user sees only their own thread
  const messages = await prisma.message.findMany({
    where: isAdmin
      ? {}
      : {
          OR: [
            { fromUserId: userId, toUserId: admin.id },
            { fromUserId: admin.id, toUserId: userId },
          ],
        },
    orderBy: { createdAt: "asc" },
    include: {
      from: { select: { id: true, name: true, role: true } },
      to:   { select: { id: true, name: true, role: true } },
    },
  });

  // Mark messages sent to this user as read
  await prisma.message.updateMany({
    where: { toUserId: userId, readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ messages, admin });
}

// POST — send a message (user → admin, or admin → user)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { content, toUserId } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Message is empty." }, { status: 400 });

  const isAdmin = session.user.role === "ADMIN";

  let recipientId: string;

  if (isAdmin) {
    // Admin must specify who they're replying to
    if (!toUserId) return NextResponse.json({ error: "toUserId required." }, { status: 400 });
    recipientId = toUserId;
  } else {
    // Users always message the admin
    const admin = await prisma.user.findFirst({
      where: { role: "ADMIN" },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (!admin) return NextResponse.json({ error: "No admin found." }, { status: 404 });
    recipientId = admin.id;
  }

  const message = await prisma.message.create({
    data: {
      fromUserId: session.user.id,
      toUserId: recipientId,
      content: content.trim(),
    },
    include: {
      from: { select: { id: true, name: true, role: true } },
      to:   { select: { id: true, name: true, role: true } },
    },
  });

  // Push notification to recipient
  sendPushToUser(recipientId, {
    title: `💬 New message from ${session.user.name}`,
    body: content.trim().slice(0, 100),
    url: "/messages",
  }).catch(() => {});

  return NextResponse.json(message, { status: 201 });
}
