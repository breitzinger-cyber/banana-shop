import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import AdminDepositRequests from "@/components/admin-deposit-requests";

export default async function AdminDashboard() {
  const [events, users, recentBets] = await Promise.all([
    prisma.event.findMany({
      include: {
        outcomes: true,
        _count: { select: { bets: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
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
  const resolvedEvents = events.filter((e) => e.status === "RESOLVED");
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
        <p className="text-gray-400 text-sm mt-1">Manage I.C.E. markets and users</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Open markets" value={openEvents.length} />
        <StatCard label="Total users" value={users.length} />
        <StatCard
          label="Tokens in circulation"
          value={totalTokensInCirculation.toFixed(0)}
          color="text-cyan-400"
        />
        <StatCard
          label="Total ever staked"
          value={(totalStaked._sum.totalStaked ?? 0).toFixed(0)}
        />
      </div>

      {/* All events */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">All Markets</h2>
          <Link
            href="/admin/events/new"
            className="text-sm px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-semibold rounded-lg transition-colors"
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
                  <div>
                    <div className="font-medium text-white group-hover:text-cyan-300 transition-colors">
                      {event.title}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {event.category} · {event._count.bets} bets · {pool.toFixed(1)} tokens pooled
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-xs font-medium ${statusColors[event.status]}`}
                    >
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

      {/* Deposit requests */}
      <AdminDepositRequests />

      {/* Recent activity */}
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
                <div className="text-sm">
                  <span className="text-gray-300 font-medium">{bet.user.name}</span>
                  <span className="text-gray-500"> · </span>
                  <span className="text-cyan-400">{bet.tokensStaked.toFixed(1)} tokens</span>
                  <span className="text-gray-500"> on </span>
                  <span className="text-white">{bet.outcome.label}</span>
                  <span className="text-gray-600 text-xs ml-2 truncate max-w-[200px] inline-block align-bottom">
                    ({bet.event.title})
                  </span>
                </div>
                <span className="text-xs text-gray-500 shrink-0">
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
