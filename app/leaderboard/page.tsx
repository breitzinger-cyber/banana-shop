import { prisma } from "@/lib/prisma";
import { getBadge } from "@/lib/badges";
import { currentSeason, formatSeason } from "@/lib/tippspiel";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const season = currentSeason();

  const [users, seasonPreds] = await Promise.all([
    prisma.user.findMany({
      where: { role: "USER" },
      include: {
        bets: { select: { tokensStaked: true, payout: true, status: true } },
        badges: { select: { badge: true }, orderBy: { earnedAt: "asc" } },
      },
      orderBy: { tokenBalance: "desc" },
    }),
    prisma.prediction.findMany({
      where: { season },
      include: { user: { select: { id: true, name: true, role: true } } },
    }),
  ]);

  // ── Bananas ranking (net profit) ──────────────────────────────────────────
  const ranked = users
    .map((u) => {
      const totalStaked = u.bets
        .filter((b) => b.status !== "REFUNDED")
        .reduce((s, b) => s + b.tokensStaked, 0);
      const totalPayout = u.bets
        .filter((b) => b.status === "WON")
        .reduce((s, b) => s + (b.payout ?? 0), 0);
      const wins = u.bets.filter((b) => b.status === "WON").length;
      const losses = u.bets.filter((b) => b.status === "LOST").length;
      return {
        ...u,
        wins,
        losses,
        netProfit: totalPayout - totalStaked,
        totalBets: wins + losses,
      };
    })
    .sort((a, b) => b.netProfit - a.netProfit);

  // ── Tippspiel ranking (season points) ─────────────────────────────────────
  const pointsMap = new Map<
    string,
    { name: string; points: number; correct: number; tips: number }
  >();
  for (const p of seasonPreds) {
    if (p.user.role === "ADMIN") continue;
    const cur =
      pointsMap.get(p.user.id) ?? { name: p.user.name, points: 0, correct: 0, tips: 0 };
    cur.tips += 1;
    if (p.status === "CORRECT") {
      cur.points += p.pointsAwarded ?? 0;
      cur.correct += 1;
    }
    pointsMap.set(p.user.id, cur);
  }
  const tipRanked = Array.from(pointsMap.entries())
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.points - a.points);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* ── Tippspiel points ── */}
      <div>
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            🎯 Tippspiel
          </h1>
          <p className="text-gray-400 mt-1 text-sm">
            Free-to-play points · Season {formatSeason(season)}
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-gray-800/50 text-xs text-gray-500 font-medium">
            <div className="col-span-1">#</div>
            <div className="col-span-5">Player</div>
            <div className="col-span-3 text-right">Correct</div>
            <div className="col-span-3 text-right">Points</div>
          </div>

          {tipRanked.map((u, idx) => {
            const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : null;
            return (
              <div
                key={u.id}
                className={`grid grid-cols-12 gap-2 px-4 py-4 border-b border-gray-800/60 last:border-0 ${
                  idx < 3 ? "bg-gradient-to-r from-gray-900 to-gray-900/50" : ""
                }`}
              >
                <div className="col-span-1 flex items-center">
                  {medal ? <span className="text-lg">{medal}</span> : <span className="text-gray-500 text-sm">{idx + 1}</span>}
                </div>
                <div className="col-span-5 flex items-center font-medium text-white">
                  {u.name}
                </div>
                <div className="col-span-3 text-right text-sm text-gray-300 flex items-center justify-end">
                  {u.correct}/{u.tips}
                </div>
                <div className="col-span-3 text-right flex items-center justify-end">
                  <span className="font-bold text-sm text-yellow-400">{u.points}</span>
                </div>
              </div>
            );
          })}

          {tipRanked.length === 0 && (
            <div className="py-12 text-center text-gray-500 text-sm">
              No tips this season yet. Make a free tip on any market!
            </div>
          )}
        </div>
        <p className="text-xs text-gray-600 text-center mt-3">
          Correct tips earn odds-weighted points (underdogs pay more). Resets monthly.
        </p>
      </div>

      {/* ── Bananas net profit ── */}
      <div>
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            🍌 Bananas
          </h2>
          <p className="text-gray-400 mt-1 text-sm">Ranked by net profit</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-gray-800/50 text-xs text-gray-500 font-medium">
            <div className="col-span-1">#</div>
            <div className="col-span-4">Player</div>
            <div className="col-span-2 text-right">Bets</div>
            <div className="col-span-2 text-right">W/L</div>
            <div className="col-span-3 text-right">Net Profit</div>
          </div>

          {ranked.map((user, idx) => {
            const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : null;
            return (
              <div
                key={user.id}
                className={`grid grid-cols-12 gap-2 px-4 py-4 border-b border-gray-800/60 last:border-0 ${
                  idx < 3 ? "bg-gradient-to-r from-gray-900 to-gray-900/50" : ""
                }`}
              >
                <div className="col-span-1 flex items-center">
                  {medal ? <span className="text-lg">{medal}</span> : <span className="text-gray-500 text-sm">{idx + 1}</span>}
                </div>
                <div className="col-span-4">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-white">{user.name}</span>
                    {(user as any).badges?.slice(0, 3).map((ub: any) => (
                      <span key={ub.badge} title={getBadge(ub.badge).name} className="text-sm">
                        {getBadge(ub.badge).emoji}
                      </span>
                    ))}
                  </div>
                  <div className="text-xs text-gray-500">{user.tokenBalance.toFixed(1)} 🍌</div>
                </div>
                <div className="col-span-2 text-right text-sm text-gray-300 flex items-center justify-end">
                  {user.totalBets}
                </div>
                <div className="col-span-2 text-right flex items-center justify-end">
                  <span className="text-xs">
                    <span className="text-green-400">{user.wins}W</span>
                    <span className="text-gray-600 mx-0.5">/</span>
                    <span className="text-red-400">{user.losses}L</span>
                  </span>
                </div>
                <div className="col-span-3 text-right flex items-center justify-end">
                  <span
                    className={`font-bold text-sm ${
                      user.netProfit > 0 ? "text-green-400" : user.netProfit < 0 ? "text-red-400" : "text-gray-400"
                    }`}
                  >
                    {user.netProfit >= 0 ? "+" : ""}{user.netProfit.toFixed(1)}
                  </span>
                </div>
              </div>
            );
          })}

          {ranked.length === 0 && (
            <div className="py-12 text-center text-gray-500 text-sm">No activity yet.</div>
          )}
        </div>
        <p className="text-xs text-gray-600 text-center mt-3">
          Net profit = total payouts earned − total bananas staked (excluding refunds)
        </p>
      </div>
    </div>
  );
}
