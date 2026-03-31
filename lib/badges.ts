export interface BadgeDef {
  id: string;
  name: string;
  description: string;
  emoji: string;
  color: string; // Tailwind text color
}

export const BADGE_DEFS: Record<string, BadgeDef> = {
  FIRST_BET: {
    id: "FIRST_BET",
    name: "First Steps",
    description: "Placed your first bet",
    emoji: "🎯",
    color: "text-cyan-400",
  },
  FIRST_WIN: {
    id: "FIRST_WIN",
    name: "Lucky Break",
    description: "Won your first bet",
    emoji: "🍀",
    color: "text-green-400",
  },
  HIGH_ROLLER: {
    id: "HIGH_ROLLER",
    name: "High Roller",
    description: "Staked 15+ tokens on a single bet",
    emoji: "💎",
    color: "text-purple-400",
  },
  BIG_WIN: {
    id: "BIG_WIN",
    name: "Big Winner",
    description: "Won 20+ tokens in a single payout",
    emoji: "💰",
    color: "text-yellow-400",
  },
  FIVE_WINS: {
    id: "FIVE_WINS",
    name: "On a Roll",
    description: "Won 5 bets",
    emoji: "🔥",
    color: "text-orange-400",
  },
  TEN_WINS: {
    id: "TEN_WINS",
    name: "Sharp",
    description: "Won 10 bets",
    emoji: "⚡",
    color: "text-yellow-300",
  },
  TEN_BETS: {
    id: "TEN_BETS",
    name: "Regular",
    description: "Placed 10 bets",
    emoji: "📊",
    color: "text-blue-400",
  },
  FIVE_EVENTS: {
    id: "FIVE_EVENTS",
    name: "Market Watcher",
    description: "Bet on 5 different markets",
    emoji: "👁️",
    color: "text-indigo-400",
  },
  ALL_IN: {
    id: "ALL_IN",
    name: "All In",
    description: "Bet the maximum allowed amount",
    emoji: "🚀",
    color: "text-red-400",
  },
  PROFIT_50: {
    id: "PROFIT_50",
    name: "Profit King",
    description: "Reached 50+ tokens net profit",
    emoji: "👑",
    color: "text-yellow-400",
  },
};

export function getBadge(id: string): BadgeDef {
  return BADGE_DEFS[id] ?? {
    id,
    name: id,
    description: "",
    emoji: "🏅",
    color: "text-gray-400",
  };
}
