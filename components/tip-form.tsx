"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { calculateAllOdds, formatOdds } from "@/lib/odds";
import { pointsForOdds } from "@/lib/tippspiel";

const OUTCOME_COLORS = [
  "bg-green-500", "bg-blue-500", "bg-purple-500",
  "bg-orange-500", "bg-pink-500", "bg-yellow-500",
];

interface Outcome {
  id: string; label: string; baseProbability: number; totalStaked: number;
}

interface TipFormProps {
  eventId: string;
  outcomes: Outcome[];
  eventStatus: string;
  resolvedOutcomeId: string | null;
  initialPrediction: {
    outcomeId: string;
    status: string;
    pointsAwarded: number | null;
    oddsAtTip: number;
  } | null;
}

export default function TipForm({
  eventId,
  outcomes,
  eventStatus,
  resolvedOutcomeId,
  initialPrediction,
}: TipFormProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const allOdds = calculateAllOdds(outcomes);

  // Already tipped → show the user's tip + result
  if (initialPrediction) {
    const outcome = outcomes.find((o) => o.id === initialPrediction.outcomeId);
    const potential = pointsForOdds(initialPrediction.oddsAtTip);
    return (
      <div className="rounded-xl border border-gray-700 bg-gray-800/40 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500">Your free tip</div>
            <div className="text-white font-medium mt-0.5">{outcome?.label ?? "—"}</div>
          </div>
          <div className="text-right">
            {initialPrediction.status === "PENDING" && (
              <>
                <div className="text-yellow-400 font-bold">{potential} pts</div>
                <div className="text-xs text-gray-500">if correct</div>
              </>
            )}
            {initialPrediction.status === "CORRECT" && (
              <div className="text-green-400 font-bold">
                +{initialPrediction.pointsAwarded ?? potential} pts ✓
              </div>
            )}
            {initialPrediction.status === "WRONG" && (
              <div className="text-red-400 font-bold">0 pts ✗</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (eventStatus !== "OPEN") {
    return (
      <p className="text-sm text-gray-500">
        Tipping is closed for this market.
      </p>
    );
  }

  if (!session) {
    return (
      <p className="text-sm text-gray-500">
        <a href="/login" className="text-yellow-400 hover:underline">Sign in</a> to
        make a free tip for points.
      </p>
    );
  }

  async function submit() {
    if (!selected) { toast.error("Pick an outcome to tip."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, outcomeId: selected }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Tip failed.");
      } else {
        toast.success(`Tip placed! ${data.potentialPoints} points if you're right.`);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        Free to play — no bananas. Correct tips earn odds-weighted points for the
        monthly leaderboard. One tip per market.
      </p>
      <div className="space-y-2">
        {allOdds.map((o, i) => {
          const outcome = outcomes.find((x) => x.id === o.id)!;
          const isSel = selected === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => setSelected(o.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                isSel ? "border-yellow-400 bg-yellow-950/20" : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${OUTCOME_COLORS[i % OUTCOME_COLORS.length]}`} />
                <span className="font-medium text-white text-sm">{outcome.label}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-yellow-400">{pointsForOdds(o.odds)} pts</span>
                <span className="text-xs text-gray-500 ml-1.5">{formatOdds(o.odds)}</span>
              </div>
            </button>
          );
        })}
      </div>
      <button
        onClick={submit}
        disabled={loading || !selected}
        className="w-full py-2.5 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 text-white font-semibold rounded-xl transition-colors"
      >
        {loading ? "Placing tip…" : "Place free tip"}
      </button>
    </div>
  );
}
