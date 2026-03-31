import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { tokensToEur, formatEur } from "@/lib/currency";

interface ActivityBet {
  id: string;
  tokensStaked: number;
  placedAt: Date | string;
  user: { name: string };
  outcome: { label: string };
  event: { id: string; title: string };
}

export default function ActivityFeed({ bets }: { bets: ActivityBet[] }) {
  if (bets.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center text-gray-600 text-sm">
        No activity yet.
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl divide-y divide-gray-800 overflow-hidden">
      {bets.map((bet) => (
        <Link
          key={bet.id}
          href={`/event/${bet.event.id}`}
          className="block px-4 py-3 hover:bg-gray-800/50 transition-colors"
        >
          <div className="text-sm">
            <span className="font-medium text-white">{bet.user.name.split(" ")[0]}</span>
            <span className="text-gray-500"> bet </span>
            <span className="text-cyan-400 font-medium">{bet.tokensStaked.toFixed(1)} T</span>
            <span className="text-gray-600 text-xs ml-1">
              ≈ {formatEur(tokensToEur(bet.tokensStaked))}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-0.5 truncate">
            on &ldquo;{bet.outcome.label}&rdquo; · {bet.event.title}
          </div>
          <div className="text-xs text-gray-700 mt-0.5">
            {formatDistanceToNow(new Date(bet.placedAt), { addSuffix: true })}
          </div>
        </Link>
      ))}
    </div>
  );
}
