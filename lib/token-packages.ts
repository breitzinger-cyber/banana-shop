export interface TokenPackage {
  id: string;
  name: string;
  tokens: number;
  priceEurCents: number;
  description: string;
  // Set these in the Stripe dashboard and add to env
  stripePriceId?: string;
}

export const TOKEN_PACKAGES: TokenPackage[] = [
  {
    id: "starter",
    name: "Starter",
    tokens: 10,
    priceEurCents: 200,
    description: "10 Tokens · ~€2",
    stripePriceId: process.env.STRIPE_PRICE_STARTER,
  },
  {
    id: "pack",
    name: "Pack",
    tokens: 60,
    priceEurCents: 1000,
    description: "60 Tokens · ~€10",
    stripePriceId: process.env.STRIPE_PRICE_PACK,
  },
  {
    id: "bag",
    name: "Bag",
    tokens: 150,
    priceEurCents: 2000,
    description: "150 Tokens · ~€20",
    stripePriceId: process.env.STRIPE_PRICE_BAG,
  },
];

export function getPackageById(id: string): TokenPackage | undefined {
  return TOKEN_PACKAGES.find((p) => p.id === id);
}
