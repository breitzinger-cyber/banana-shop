export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import ProposalActions from "@/components/proposal-actions";

export default async function AdminDashboard() {
  const [events, users, pendingProposals, recentBets] = await Promise.all([
    prisma.event.findMany({
      where: { status: { not: "PENDING" } },
      include: {
        outcomes: true,
        _count: { select: { bets: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.event.findMany({
      where: { status: "PENDING" },
      include: {
        outcomes: true,
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.bet.findMany({
      take: 10,
      orderBy: { placedAt: "desc" },
      include: {
        user: { select: { name: true } },
        event: { select: { title: true } },
        outcome: { select: { label: true } },
      },
    }),
  ]);

  const openEvents = events.filter((e) => e.status === "OPEN");
  const totalTokensInCirculation = users.reduce((s, u) => s + u.tokenBalance, 0);
  const totalStaked = await prisma.outcome.aggregate({
    _sum: { totalStaked: true },
  });

  const statusColors: Record<string, string> = {
    OPEN: "text-green-400",
    CLOSED: "text-yellow-400",
    RESOLVED: "text-blue-400",
    CANCELLED: "text-gray-500",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Banana Shop control panel</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Open markets" value={openEvents.length} />
        <StatCard label="Total users" value={users.length} />
        <StatCard
          label="Bananas in circulation"
          value={`${totalTokensInCirculation.toFixed(0)} 🍌`}
          color="text-yellow-400"
        />
        <StatCard
          label="Total ever staked"
          value={`€${(totalStaked._sum.totalStaked ?? 0).toFixed(0)}`}
        />
      </div>

      {/* Pending proposals */}
      {pendingProposals.length > 0 && (
        <div className="bg-gray-900 border border-yellow-800/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              Pending Proposals
              <span className="text-xs bg-yellow-400 text-gray-950 font-bold px-2 py-0.5 rounded-full">
                {pendingProposals.length}
              </span>
            </h2>
          </div>

          <div className="space-y-4">
            {pendingProposals.map((proposal) => (
              <div
                key={proposal.id}
                className="p-4 bg-gray-800/50 rounded-xl border border-gray-700"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="font-medium text-white">{proposal.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      by {proposal.createdBy.name} · {formatDistanceToNow(new Date(proposal.createdAt), { addSuffix: true })} · {proposal.category}
                    </p>
                  </div>
                </div>

                {proposal.description && (
                  <p className="text-sm text-gray-400 mb-2">{proposal.description}</p>
                )}

                {proposal.proposalNote && (
                  <div className="mb-3 p-2.5 bg-gray-700/50 rounded-lg">
                    <p className="text-xs text-gray-400 font-medium mb-0.5">Note from proposer</p>
                    <p className="text-sm text-gray-300">{proposal.proposalNote}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 mb-3">
                  {proposal.outcomes.map((o) => (
                    <span
                      key={o.id}
                      className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded-full"
                    >
                      {o.label}
                    </span>
                  ))}
                </div>

                <ProposalActions proposalId={proposal.id} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All markets */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">All Markets</h2>
          <Link
            href="/admin/events/new"
            className="text-sm px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-semibold rounded-lg transition-colors"
          >
            + New
          </Link>
        </div>

        {events.length === 0 ? (
          <p className="text-gray-500 text-sm">No markets yet.</p>
        ) : (
          <div className="space-y-2">
            {events.map((event) => {
              const pool = event.outcomes.reduce((s, o) => s + o.totalStaked, 0);
              return (
                <Link
                  key={event.id}
                  href={`/admin/events/${event.id}`}
                  className="flex items-center justify-between p-4 bg-gray-800/50 hover:bg-gray-800 rounded-xl transition-colors group"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-white group-hover:text-yellow-300 transition-colors truncate">
                      {event.title}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {event.category} · {event._count.bets} bets · {pool.toFixed(0)} 🍌 pooled
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <span className={`text-xs font-medium ${statusColors[event.status] ?? "text-gray-400"}`}>
                      {event.status}
                    </span>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent bets */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-base font-semibold text-white mb-4">Recent Bets</h2>
        {recentBets.length === 0 ? (
          <p className="text-gray-500 text-sm">No bets yet.</p>
        ) : (
          <div className="space-y-2">
            {recentBets.map((bet) => (
              <div
                key={bet.id}
                className="flex items-center justify-between py-2 border-b border-gray-800/50 last:border-0"
              >
                <div className="text-sm min-w-0">
                  <span className="text-gray-300 font-medium">{bet.user.name}</span>
                  <span className="text-gray-500"> · </span>
                  <span className="text-yellow-400">{bet.tokensStaked.toFixed(1)} 🍌</span>
                  <span className="text-gray-500"> on </span>
                  <span className="text-white">{bet.outcome.label}</span>
                  <span className="text-gray-600 text-xs ml-2 truncate max-w-[160px] inline-block align-bottom">
                    ({bet.event.title})
                  </span>
                </div>
                <span className="text-xs text-gray-500 shrink-0 ml-2">
                  {formatDistanceToNow(new Date(bet.placedAt), { addSuffix: true })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color = "text-white",
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="bg-gray-800/50 rounded-xl p-4">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}
