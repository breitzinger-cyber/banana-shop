import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Stripe is not configured." },
      { status: 503 }
    );
  }

  const stripe = getStripe()!;
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    console.error("[stripe/webhook] Signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;
    const { userId, packageId, tokens } = session.metadata ?? {};

    if (!userId || !tokens) {
      console.error("[stripe/webhook] Missing metadata on session:", session.id);
      return NextResponse.json({ error: "Missing metadata." }, { status: 400 });
    }

    const tokenAmount = parseInt(tokens, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { tokenBalance: { increment: tokenAmount } },
      }),
      prisma.tokenTransaction.create({
        data: {
          userId,
          amount: tokenAmount,
          type: "PURCHASE",
          note: `Stripe purchase: ${packageId} (${tokenAmount} tokens)`,
          referenceId: session.id,
        },
      }),
    ]);

    console.log(
      `[stripe/webhook] Granted ${tokenAmount} tokens to user ${userId}`
    );
  }

  return NextResponse.json({ received: true });
}
