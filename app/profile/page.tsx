export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { formatOdds } from "@/lib/odds";
import { getBadge } from "@/lib/badges";
import { tokensToEur, formatEur } from "@/lib/currency";
import PushSubscribe from "@/components/push-subscribe";
import DepositRequestForm from "@/components/deposit-request-form";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      bets: {
        orderBy: { placedAt: "desc" },
        include: {
          event: { select: { title: true } },
          outcome: { select: { label: true } },
        },
      },
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      badges: {
        orderBy: { earnedAt: "asc" },
      },
    },
  });

  if (!user) redirect("/login");

  const totalStaked = user.bets
    .filter((b) => b.status !== "REFUNDED")
    .reduce((s, b) => s + b.tokensStaked, 0);
  const totalPayout = user.bets
    .filter((b) => b.status === "WON")
    .reduce((s, b) => s + (b.payout ?? 0), 0);
  const netProfit = totalPayout - totalStaked;
  const wins = user.bets.filter((b) => b.status === "WON").length;
  const losses = user.bets.filter((b) => b.status === "LOST").length;

  const statusColors: Record<string, string> = {
    ACTIVE: "text-yellow-400 bg-yellow-950/50",
    WON: "text-green-400 bg-green-950/50",
    LOST: "text-red-400 bg-red-950/50",
    REFUNDED: "text-gray-400 bg-gray-800",
  };

  const txColors: Record<string, string> = {
    GRANT: "text-cyan-400",
    PURCHASE: "text-cyan-400",
    BET: "text-red-400",
    PAYOUT: "text-green-400",
    REFUND: "text-yellow-400",
    DEPOSIT: "text-emerald-400",
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Push notifications */}
      <PushSubscribe />

      {/* Token deposits */}
      <DepositRequestForm />

      {/* Badges */}
      {user.badges.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-base font-semibold text-white mb-4">
            Achievements{" "}
            <span className="text-gray-500 text-sm font-normal">({user.badges.length})</span>
          </h2>
          <div className="flex flex-wrap gap-3">
            {user.badges.map((ub) => {
              const def = getBadge(ub.badge);
              return (
                <div
                  key={ub.id}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-xl"
                  title={def.description}
                >
                  <span className="text-xl">{def.emoji}</span>
                  <div>
                    <div className={`text-xs font-bold ${def.color}`}>{def.name}</div>
                    <div className="text-xs text-gray-500">{def.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Profile header */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs text-gray-500 mb-1">
              {user.role === "ADMIN" ? "Admin" : "Member"}
            </div>
            <h1 className="text-2xl font-bold text-white">{user.name}</h1>
            <p className="text-gray-400 text-sm mt-0.5">{user.email}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black text-cyan-400">
              {user.tokenBalance.toFixed(1)}
            </div>
            <div className="text-sm text-gray-400">tokens</div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total bets" value={user.bets.length} />
          <StatCard label="Wins" value={wins} color="text-green-400" />
          <StatCard label="Losses" value={losses} color="text-red-400" />
          <StatCard
            label="Net profit"
            value={`${netProfit >= 0 ? "+" : ""}${netProfit.toFixed(1)}`}
            color={netProfit >= 0 ? "text-green-400" : "text-red-400"}
          />
        </div>
      </div>

      {/* Bet history */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-base font-semibold text-white mb-4">Bet History</h2>
        {user.bets.length === 0 ? (
          <p className="text-gray-500 text-sm">No bets placed yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-800">
                  <th className="pb-2 font-medium">Event</th>
                  <th className="pb-2 font-medium">Pick</th>
                  <th className="pb-2 font-medium text-right">Staked</th>
                  <th className="pb-2 font-medium text-right">Odds</th>
                  <th className="pb-2 font-medium text-right">Payout</th>
                  <th className="pb-2 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {user.bets.map((bet) => (
                  <tr
                    key={bet.id}
                    className="border-b border-gray-800/50 last:border-0"
                  >
                    <td className="py-3 text-gray-300 max-w-[200px] truncate">
                      {bet.event.title}
                    </td>
                    <td className="py-3 text-white">{bet.outcome.label}</td>
                    <td className="py-3 text-right text-gray-300">
                      {bet.tokensStaked.toFixed(1)}
                    </td>
                    <td className="py-3 text-right text-cyan-400">
                      {formatOdds(bet.lockedOdds)}
                    </td>
                    <td className="py-3 text-right">
                      {bet.payout != null ? (
                        <span className="text-green-400">{bet.payout.toFixed(1)}</span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          statusColors[bet.status] ?? ""
                        }`}
                      >
                        {bet.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction history */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-base font-semibold text-white mb-4">Token Transactions</h2>
        {user.transactions.length === 0 ? (
          <p className="text-gray-500 text-sm">No transactions yet.</p>
        ) : (
          <div className="space-y-2">
            {user.transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between py-2 border-b border-gray-800/50 last:border-0"
              >
                <div>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full bg-gray-800 ${
                      txColors[tx.type] ?? "text-gray-400"
                    }`}
                  >
                    {tx.type}
                  </span>
                  {tx.note && (
                    <span className="text-gray-500 text-xs ml-2">{tx.note}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`font-mono text-sm font-bold ${
                      tx.amount >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {tx.amount >= 0 ? "+" : ""}
                    {tx.amount.toFixed(1)}
                  </span>
                  <span className="text-xs text-gray-600">
                    {formatDistanceToNow(new Date(tx.createdAt), { addSuffix: true })}
                  </span>
                </div>
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
    <div className="bg-gray-800/50 rounded-xl p-3">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}
