export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import BetForm from "@/components/bet-form";
import LiveEventDetail from "@/components/live-event-detail";
import Comments from "@/components/comments";
import OddsChart from "@/components/odds-chart";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

interface PageProps {
  params: { id: string };
}

export default async function EventPage({ params }: PageProps) {
  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: {
      outcomes: true,
      bets: {
        orderBy: { placedAt: "desc" },
        take: 20,
        include: {
          outcome: { select: { label: true } },
          user: { select: { name: true, id: true } },
        },
      },
    },
  });

  if (!event) notFound();

  const totalPool = event.outcomes.reduce((s, o) => s + o.totalStaked, 0);
  const totalBets = event.bets.length;

  const statusColors: Record<string, string> = {
    OPEN: "text-green-400 bg-green-950/50 border-green-800",
    CLOSED: "text-yellow-400 bg-yellow-950/50 border-yellow-800",
    RESOLVED: "text-blue-400 bg-blue-950/50 border-blue-800",
    CANCELLED: "text-gray-400 bg-gray-800 border-gray-700",
  };

  const resolvedOutcome = event.resolvedOutcomeId
    ? event.outcomes.find((o) => o.id === event.resolvedOutcomeId)
    : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200 mb-6 transition-colors"
      >
        ← Back to markets
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Event header */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs px-2 py-0.5 bg-gray-800 text-gray-400 rounded-full">
                  {event.category}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border ${
                    statusColors[event.status] ?? statusColors.CLOSED
                  }`}
                >
                  {event.status}
                </span>
              </div>
            </div>

            <h1 className="text-xl font-bold text-white mb-3">{event.title}</h1>
            <p className="text-gray-400 text-sm leading-relaxed">{event.description}</p>

            {event.closesAt && (
              <div className="mt-4 text-xs text-gray-500">
                Closes {formatDistanceToNow(new Date(event.closesAt), { addSuffix: true })}
              </div>
            )}

            {resolvedOutcome && (
              <div className="mt-4 px-4 py-3 bg-blue-950/50 border border-blue-800 rounded-lg">
                <span className="text-xs text-blue-300 font-medium">Resolved outcome: </span>
                <span className="text-blue-200 font-bold">{resolvedOutcome.label}</span>
              </div>
            )}

            {/* Stats */}
            <div className="mt-5 flex gap-6 text-sm">
              <div>
                <div className="text-2xl font-bold text-yellow-400">{totalPool.toFixed(1)}</div>
                <div className="text-gray-500 text-xs mt-0.5">🍌 pooled</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{event.bets.length}</div>
                <div className="text-gray-500 text-xs mt-0.5">total bets</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{event.outcomes.length}</div>
                <div className="text-gray-500 text-xs mt-0.5">outcomes</div>
              </div>
            </div>
          </div>

          {/* Live odds — client component that polls */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white">Live Odds</h2>
              <span className="text-xs text-gray-500">Updates every 10s</span>
            </div>
            <LiveEventDetail eventId={event.id} initialOutcomes={event.outcomes} />
          </div>

          {/* Odds history chart */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-base font-semibold text-white mb-4">Wahrscheinlichkeits-Verlauf</h2>
            <OddsChart eventId={event.id} />
          </div>

          {/* Comments */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-base font-semibold text-white mb-4">Discussion</h2>
            <Comments eventId={event.id} />
          </div>

          {/* Recent bets */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-base font-semibold text-white mb-4">Recent Bets</h2>
            {event.bets.length === 0 ? (
              <p className="text-gray-500 text-sm">No bets placed yet. Be the first!</p>
            ) : (
              <div className="space-y-2">
                {event.bets.map((bet) => (
                  <div
                    key={bet.id}
                    className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0"
                  >
                    <div className="text-sm">
                      <span className="text-gray-300 font-medium">
                        {bet.user.name.split(" ")[0]}
                      </span>
                      <span className="text-gray-500"> bet </span>
                      <span className="text-yellow-400 font-medium">
                        {bet.tokensStaked.toFixed(1)} 🍌
                      </span>
                      <span className="text-gray-500"> on </span>
                      <span className="text-white">{bet.outcome.label}</span>
                    </div>
                    <div className="text-xs text-gray-500 shrink-0 ml-3">
                      {formatDistanceToNow(new Date(bet.placedAt), { addSuffix: true })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar — Bet form */}
        <div className="lg:col-span-1">
          <div className="sticky top-20 bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-base font-semibold text-white mb-4">Place Bet</h2>
            <BetForm
              eventId={event.id}
              outcomes={event.outcomes}
              eventStatus={event.status}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
