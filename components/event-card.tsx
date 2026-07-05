"use client";

import Link from "next/link";
import { calculateAllOdds, formatOdds, formatProbability } from "@/lib/odds";
import { formatDistanceToNow, isPast } from "date-fns";

const OUTCOME_COLORS = [
  "bg-green-500",
  "bg-blue-500",
  "bg-purple-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-yellow-500",
];

interface EventCardProps {
  event: {
    id: string;
    title: string;
    category: string;
    status: string;
    closesAt: string | Date | null;
    outcomes: Array<{
      id: string;
      label: string;
      baseProbability: number;
      totalStaked: number;
    }>;
    _count?: { bets: number };
  };
}

export default function EventCard({ event }: EventCardProps) {
  const odds = calculateAllOdds(event.outcomes);
  const totalPool = event.outcomes.reduce((s, o) => s + o.totalStaked, 0);
  const totalBets = event._count?.bets ?? 0;

  const closesAt = event.closesAt ? new Date(event.closesAt) : null;
  const expired = closesAt ? isPast(closesAt) : false;

  const leading = odds.reduce((a, b) => (a.probability > b.probability ? a : b));

  return (
    <Link href={`/event/${event.id}`}>
      <div className="bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-xl p-5 transition-all group cursor-pointer">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-xs px-2 py-0.5 bg-gray-800 text-gray-400 rounded-full shrink-0">
                {event.category}
              </span>
              {closesAt && !expired && (
                <span className="text-xs text-yellow-400">
                  Closes {formatDistanceToNow(closesAt, { addSuffix: true })}
                </span>
              )}
              {expired && (
                <span className="text-xs text-gray-500">Betting closed</span>
              )}
            </div>
            <h3 className="text-white font-semibold group-hover:text-yellow-300 transition-colors leading-snug">
              {event.title}
            </h3>
          </div>
          <div className="text-right shrink-0">
            <div className="text-sm font-bold text-yellow-400">
              €{totalPool.toFixed(0)}
            </div>
            <div className="text-xs text-gray-500">{totalBets} bets</div>
          </div>
        </div>

        {/* Probability bar */}
        <div className="flex rounded-full overflow-hidden h-2 gap-px mb-4">
          {odds.map((o, i) => (
            <div
              key={o.id}
              className={`${OUTCOME_COLORS[i % OUTCOME_COLORS.length]} ${
                o.id === leading.id ? "opacity-100" : "opacity-50"
              }`}
              style={{ width: `${o.probability * 100}%` }}
            />
          ))}
        </div>

        {/* Outcomes */}
        <div className="grid grid-cols-2 gap-2">
          {odds.slice(0, 4).map((o, i) => {
            const outcome = event.outcomes.find((x) => x.id === o.id)!;
            const isLeading = o.id === leading.id;
            return (
              <div
                key={o.id}
                className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                  isLeading ? "bg-green-950/50 border border-green-800/50" : "bg-gray-800/50"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${OUTCOME_COLORS[i % OUTCOME_COLORS.length]}`} />
                  <span className="text-sm text-gray-300 truncate">{outcome.label}</span>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <span className={`text-sm font-bold ${isLeading ? "text-green-400" : "text-gray-300"}`}>
                    {formatOdds(o.odds)}
                  </span>
                  <span className="text-xs text-gray-500 ml-1">
                    {formatProbability(o.probability)}
                  </span>
                </div>
              </div>
            );
          })}
          {odds.length > 4 && (
            <div className="col-span-2 text-xs text-center text-gray-500 mt-1">
              +{odds.length - 4} more outcomes
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
