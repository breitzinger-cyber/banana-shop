export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { formatOdds } from "@/lib/odds";
import { getBadge } from "@/lib/badges";
import { DAILY_SPEND_LIMIT } from "@/lib/currency";
import PushSubscribe from "@/components/push-subscribe";
import BuyTokensForm from "@/components/buy-tokens-form";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: { purchase?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [user, todaySpend] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        bets: {
          orderBy: { placedAt: "desc" },
          include: {
            event: { select: { title: true, id: true } },
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
    }),
    prisma.tokenTransaction.aggregate({
      where: {
        userId: session.user.id,
        type: "BET",
        createdAt: { gte: todayStart },
      },
      _sum: { amount: true },
    }),
  ]);

  if (!user) redirect("/login");

  const spentToday = Math.abs(todaySpend._sum.amount ?? 0);
  const remainingToday = Math.max(0, DAILY_SPEND_LIMIT - spentToday);

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
    GRANT: "text-yellow-400",
    PURCHASE: "text-yellow-400",
    BET: "text-red-400",
    PAYOUT: "text-green-400",
    REFUND: "text-yellow-400",
    RAKE: "text-gray-500",
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-5">
      {searchParams.purchase === "success" && (
        <div className="p-4 bg-green-950/50 border border-green-800 rounded-xl text-green-400 text-sm font-medium">
          Payment successful! Your bananas have been added to your balance.
        </div>
      )}

      <PushSubscribe />

      {/* Profile header */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <div className="text-xs text-gray-500 mb-1">
              {user.role === "ADMIN" ? "Admin" : "Member"}
            </div>
            <h1 className="text-2xl font-bold text-white">{user.name}</h1>
            <p className="text-gray-400 text-sm mt-0.5">{user.email}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black text-yellow-400">
              {user.tokenBalance.toFixed(1)}
            </div>
            <div className="text-sm text-gray-400">bananas 🍌</div>
          </div>
        </div>

        {/* Daily spend gauge */}
        <div className="p-3 bg-gray-800/60 rounded-xl">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span>Daily spend limit</span>
            <span>
              <span className={remainingToday === 0 ? "text-red-400 font-medium" : "text-gray-300"}>
                {spentToday.toFixed(1)}
              </span>
              <span className="text-gray-600"> / {DAILY_SPEND_LIMIT} bananas used today</span>
            </span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                spentToday >= DAILY_SPEND_LIMIT ? "bg-red-500" :
                spentToday >= DAILY_SPEND_LIMIT * 0.8 ? "bg-orange-400" : "bg-yellow-400"
              }`}
              style={{ width: `${Math.min(100, (spentToday / DAILY_SPEND_LIMIT) * 100)}%` }}
            />
          </div>
          {remainingToday === 0 && (
            <p className="text-xs text-red-400 mt-1">Limit reached. Resets at midnight.</p>
          )}
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
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

      {/* Badges */}
      {user.badges.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-base font-semibold text-white mb-4">
            Achievements
            <span className="text-gray-500 text-sm font-normal ml-1.5">({user.badges.length})</span>
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

      {/* Buy tokens */}
      <BuyTokensForm currentBalance={user.tokenBalance} />

      {/* Bet history */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-base font-semibold text-white mb-4">Bet History</h2>
        {user.bets.length === 0 ? (
          <p className="text-gray-500 text-sm">No bets placed yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-800">
                  <th className="pb-2 font-medium">Market</th>
                  <th className="pb-2 font-medium">Pick</th>
                  <th className="pb-2 font-medium text-right">Staked</th>
                  <th className="pb-2 font-medium text-right">Odds</th>
                  <th className="pb-2 font-medium text-right">Payout</th>
                  <th className="pb-2 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {user.bets.map((bet) => (
                  <tr key={bet.id} className="border-b border-gray-800/50 last:border-0">
                    <td className="py-3 text-gray-300 max-w-[180px] truncate">
                      {bet.event.title}
                    </td>
                    <td className="py-3 text-white">{bet.outcome.label}</td>
                    <td className="py-3 text-right text-gray-300">
                      {bet.tokensStaked.toFixed(1)} 🍌
                    </td>
                    <td className="py-3 text-right text-yellow-400">
                      {formatOdds(bet.lockedOdds)}
                    </td>
                    <td className="py-3 text-right">
                      {bet.payout != null ? (
                        <span className="text-green-400">{bet.payout.toFixed(1)} 🍌</span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[bet.status] ?? ""}`}>
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
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-base font-semibold text-white mb-4">Transactions</h2>
        {user.transactions.length === 0 ? (
          <p className="text-gray-500 text-sm">No transactions yet.</p>
        ) : (
          <div className="space-y-1">
            {user.transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between py-2 border-b border-gray-800/50 last:border-0"
              >
                <div className="min-w-0">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full bg-gray-800 ${txColors[tx.type] ?? "text-gray-400"}`}>
                    {tx.type}
                  </span>
                  {tx.note && (
                    <span className="text-gray-500 text-xs ml-2 truncate">{tx.note}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`font-mono text-sm font-bold ${tx.amount >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {tx.amount >= 0 ? "+" : ""}{Math.abs(tx.amount).toFixed(1)} 🍌
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
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}
