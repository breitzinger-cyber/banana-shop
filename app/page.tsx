import { prisma } from "@/lib/prisma";
import EventCard from "@/components/event-card";
import ActivityFeed from "@/components/activity-feed";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";

export const revalidate = 30;

export default async function HomePage({
  searchParams,
}: {
  searchParams: { category?: string };
}) {
  const session = await getServerSession(authOptions);
  const selectedCategory = searchParams.category ?? "All";

  const events = await prisma.event.findMany({
    where: { status: "OPEN" },
    include: {
      outcomes: true,
      _count: { select: { bets: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const recentActivity = await prisma.bet.findMany({
    take: 8,
    orderBy: { placedAt: "desc" },
    include: {
      user: { select: { name: true } },
      outcome: { select: { label: true } },
      event: { select: { id: true, title: true } },
    },
  });

  // Sort by pool size
  const sorted = [...events].sort((a, b) => {
    const pA = a.outcomes.reduce((s, o) => s + o.totalStaked, 0);
    const pB = b.outcomes.reduce((s, o) => s + o.totalStaked, 0);
    return pB - pA;
  });

  const categories = ["All", ...Array.from(new Set(events.map((e) => e.category))).sort()];
  const filtered =
    selectedCategory === "All"
      ? sorted
      : sorted.filter((e) => e.category === selectedCategory);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex gap-8">
        {/* Main column */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Live Markets</h1>
              <p className="text-gray-400 mt-1 text-sm">
                {events.length} open market{events.length !== 1 ? "s" : ""}
              </p>
            </div>
            {session?.user.role === "ADMIN" && (
              <Link
                href="/admin/events/new"
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-gray-950 text-sm font-semibold rounded-lg transition-colors"
              >
                + New market
              </Link>
            )}
          </div>

          {/* Category filter */}
          {categories.length > 2 && (
            <div className="flex gap-2 flex-wrap mb-5">
              {categories.map((cat) => (
                <Link
                  key={cat}
                  href={cat === "All" ? "/" : `/?category=${cat}`}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === cat
                      ? "bg-cyan-500 text-gray-950"
                      : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
                  }`}
                >
                  {cat}
                </Link>
              ))}
            </div>
          )}

          {/* Events */}
          {filtered.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <div className="text-4xl mb-4">🧊</div>
              <p className="text-xl font-medium text-gray-400">No open markets yet.</p>
              <p className="mt-2 text-sm">
                {session?.user.role === "ADMIN"
                  ? "Create the first market above!"
                  : "Ask an admin to open some markets."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar — activity feed */}
        <div className="hidden lg:block w-72 shrink-0">
          <div className="sticky top-20">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Recent Activity
            </h2>
            <ActivityFeed bets={recentActivity} />
          </div>
        </div>
      </div>
    </div>
  );
}
