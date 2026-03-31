import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { getPackageById, TOKEN_PACKAGES } from "@/lib/token-packages";

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Stripe is not configured on this instance." },
      { status: 503 }
    );
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { packageId } = await req.json();
    const pkg = getPackageById(packageId);

    if (!pkg) {
      return NextResponse.json(
        { error: "Invalid package." },
        { status: 400 }
      );
    }

    const stripe = getStripe()!;

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `I.C.E. ${pkg.name}`,
              description: pkg.description,
            },
            unit_amount: pkg.priceEurCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: session.user.id,
        packageId: pkg.id,
        tokens: pkg.tokens,
      },
      success_url: `${process.env.NEXTAUTH_URL}/profile?purchase=success`,
      cancel_url: `${process.env.NEXTAUTH_URL}/profile?purchase=cancelled`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("[stripe/checkout/POST]", error);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
