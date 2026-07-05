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
    name: "5 Bananas",
    tokens: 5,
    priceEurCents: 500,
    description: "5 Bananas · €5",
  },
  {
    id: "ten",
    name: "10 Bananas",
    tokens: 10,
    priceEurCents: 1000,
    description: "10 Bananas · €10",
  },
  {
    id: "twentyfive",
    name: "25 Bananas",
    tokens: 25,
    priceEurCents: 2500,
    description: "25 Bananas · €25",
  },
];

export function getPackageById(id: string): TokenPackage | undefined {
  return TOKEN_PACKAGES.find((p) => p.id === id);
}
