export interface TokenPackage {
  id: string;
  name: string;
  tokens: number;
  priceEurCents: number;
  description: string;
}

/** 1 token = €1 exactly */
export const TOKEN_PACKAGES: TokenPackage[] = [
  {
    id: "five",
    name: "5 Tokens",
    tokens: 5,
    priceEurCents: 500,
    description: "5 Tokens · €5",
  },
  {
    id: "ten",
    name: "10 Tokens",
    tokens: 10,
    priceEurCents: 1000,
    description: "10 Tokens · €10",
  },
  {
    id: "twentyfive",
    name: "25 Tokens",
    tokens: 25,
    priceEurCents: 2500,
    description: "25 Tokens · €25",
  },
];

export function getPackageById(id: string): TokenPackage | undefined {
  return TOKEN_PACKAGES.find((p) => p.id === id);
}
