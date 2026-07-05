"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import ProbabilityBars from "@/components/probability-bars";
import { formatDistanceToNow } from "date-fns";

interface Outcome {
  id: string;
  label: string;
  baseProbability: number;
  totalStaked: number;
}

interface Event {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  closesAt: string | null;
  resolvedOutcomeId: string | null;
  outcomes: Outcome[];
  bets: Array<{
    id: string;
    tokensStaked: number;
    lockedOdds: number;
    status: string;
    placedAt: string;
    outcome: { label: string };
    user: { name: string };
  }>;
}

export default function AdminEventPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedWinner, setSelectedWinner] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  async function loadEvent() {
    const res = await fetch(`/api/events/${eventId}`);
    if (res.ok) {
      const data = await res.json();
      setEvent(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  async function handleClose() {
    if (!confirm("Close betting on this market?")) return;
    setActionLoading(true);
    const res = await fetch(`/api/admin/events/${eventId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CLOSED" }),
    });
    if (res.ok) {
      toast.success("Betting closed.");
      loadEvent();
    } else {
      toast.error("Failed.");
    }
    setActionLoading(false);
  }

  async function handleReopen() {
    setActionLoading(true);
    const res = await fetch(`/api/admin/events/${eventId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "OPEN" }),
    });
    if (res.ok) {
      toast.success("Market reopened.");
      loadEvent();
    } else {
      toast.error("Failed.");
    }
    setActionLoading(false);
  }

  async function handleResolve() {
    if (!selectedWinner) {
      toast.error("Select the winning outcome.");
      return;
    }
    const outcome = event?.outcomes.find((o) => o.id === selectedWinner);
    if (!confirm(`Resolve with winner: "${outcome?.label}"? This triggers payouts and cannot be undone.`))
      return;

    setActionLoading(true);
    const res = await fetch(`/api/admin/events/${eventId}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outcomeId: selectedWinner }),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success(`Resolved! ${data.payoutsProcessed} bets paid out.`);
      loadEvent();
    } else {
      toast.error(data.error || "Failed.");
    }
    setActionLoading(false);
  }

  async function handleCancel() {
    if (!confirm("Cancel this market? All bets will be refunded.")) return;
    setActionLoading(true);
    const res = await fetch(`/api/admin/events/${eventId}/cancel`, {
      method: "POST",
    });
    const data = await res.json();
    if (res.ok) {
      toast.success(`Cancelled. ${data.refundsProcessed} bets refunded.`);
      loadEvent();
    } else {
      toast.error(data.error || "Failed.");
    }
    setActionLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-500">Loading…</div>
      </div>
    );
  }

  if (!event) {
    return <div className="text-gray-500">Market not found.</div>;
  }

  const totalPool = event.outcomes.reduce((s, o) => s + o.totalStaked, 0);
  const activeBets = event.bets.filter((b) => b.status === "ACTIVE");

  const statusColors: Record<string, string> = {
    OPEN: "text-green-400",
    CLOSED: "text-yellow-400",
    RESOLVED: "text-blue-400",
    CANCELLED: "text-gray-500",
  };

  const resolvedOutcome = event.resolvedOutcomeId
    ? event.outcomes.find((o) => o.id === event.resolvedOutcomeId)
    : null;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs px-2 py-0.5 bg-gray-800 text-gray-400 rounded-full">
                {event.category}
              </span>
              <span className={`text-xs font-medium ${statusColors[event.status]}`}>
                {event.status}
              </span>
            </div>
            <h1 className="text-xl font-bold text-white">{event.title}</h1>
            <p className="text-gray-400 text-sm mt-2 leading-relaxed">
              {event.description}
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-bold text-yellow-400">{totalPool.toFixed(1)}</div>
            <div className="text-xs text-gray-500">tokens pooled</div>
            <div className="text-lg font-bold text-white mt-1">{event.bets.length}</div>
            <div className="text-xs text-gray-500">total bets</div>
          </div>
        </div>

        {resolvedOutcome && (
          <div className="mt-4 px-4 py-3 bg-blue-950/50 border border-blue-800 rounded-lg">
            <span className="text-xs text-blue-300">Resolved: </span>
            <span className="text-blue-200 font-bold">{resolvedOutcome.label}</span>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Odds / outcomes */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-gray-300 mb-4">Current Odds</h2>
            <ProbabilityBars outcomes={event.outcomes} showStaked />
          </div>

          {/* Bets table */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-gray-300 mb-4">
              All Bets ({event.bets.length})
            </h2>
            {event.bets.length === 0 ? (
              <p className="text-gray-500 text-sm">No bets yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-800">
                      <th className="pb-2 font-medium">User</th>
                      <th className="pb-2 font-medium">Pick</th>
                      <th className="pb-2 font-medium text-right">Staked</th>
                      <th className="pb-2 font-medium text-right">Odds</th>
                      <th className="pb-2 font-medium text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {event.bets.map((bet) => (
                      <tr key={bet.id} className="border-b border-gray-800/40 last:border-0">
                        <td className="py-2 text-gray-300">{bet.user.name}</td>
                        <td className="py-2 text-white">{bet.outcome.label}</td>
                        <td className="py-2 text-right text-yellow-400">
                          {bet.tokensStaked.toFixed(1)}
                        </td>
                        <td className="py-2 text-right text-gray-400">
                          {bet.lockedOdds.toFixed(2)}x
                        </td>
                        <td className="py-2 text-right">
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                            bet.status === "WON"
                              ? "text-green-400 bg-green-950/50"
                              : bet.status === "LOST"
                              ? "text-red-400 bg-red-950/50"
                              : bet.status === "REFUNDED"
                              ? "text-gray-400 bg-gray-800"
                              : "text-yellow-400 bg-yellow-950/50"
                          }`}>
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
        </div>

        {/* Actions panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Status actions */}
          {event.status === "OPEN" && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
              <h2 className="text-sm font-semibold text-gray-300">Close Betting</h2>
              <p className="text-xs text-gray-500">
                Prevents new bets. You can still resolve or cancel after closing.
              </p>
              <button
                onClick={handleClose}
                disabled={actionLoading}
                className="w-full py-2.5 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-700 text-white font-semibold rounded-lg transition-colors text-sm"
              >
                Close betting
              </button>
            </div>
          )}

          {event.status === "CLOSED" && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
              <h2 className="text-sm font-semibold text-gray-300">Reopen Market</h2>
              <button
                onClick={handleReopen}
                disabled={actionLoading}
                className="w-full py-2.5 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white font-semibold rounded-lg transition-colors text-sm"
              >
                Reopen betting
              </button>
            </div>
          )}

          {/* Resolve */}
          {(event.status === "OPEN" || event.status === "CLOSED") && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
              <h2 className="text-sm font-semibold text-gray-300">Resolve Market</h2>
              <p className="text-xs text-gray-500">
                Select the winning outcome. Payouts are calculated and sent instantly.
              </p>
              <div className="space-y-2">
                {event.outcomes.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setSelectedWinner(o.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-all ${
                      selectedWinner === o.id
                        ? "border-yellow-400 bg-yellow-950/20 text-yellow-300"
                        : "border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-600"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <button
                onClick={handleResolve}
                disabled={actionLoading || !selectedWinner}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-lg transition-colors text-sm"
              >
                {actionLoading ? "Resolving…" : "Resolve & pay out"}
              </button>
            </div>
          )}

          {/* Cancel */}
          {(event.status === "OPEN" || event.status === "CLOSED") && (
            <div className="bg-gray-900 border border-red-900/50 rounded-xl p-5 space-y-3">
              <h2 className="text-sm font-semibold text-red-400">Cancel Market</h2>
              <p className="text-xs text-gray-500">
                Refunds all active bets. Cannot be undone.
              </p>
              <button
                onClick={handleCancel}
                disabled={actionLoading}
                className="w-full py-2.5 bg-red-900/50 hover:bg-red-800/70 disabled:bg-gray-700 text-red-300 hover:text-red-200 font-semibold rounded-lg transition-colors text-sm border border-red-800"
              >
                Cancel & refund all
              </button>
            </div>
          )}

          {event.status === "RESOLVED" && (
            <div className="bg-blue-950/30 border border-blue-800 rounded-xl p-5">
              <p className="text-sm text-blue-300 font-medium">Market resolved</p>
              <p className="text-xs text-blue-400/70 mt-1">
                Winner: {resolvedOutcome?.label}
              </p>
            </div>
          )}

          {event.status === "CANCELLED" && (
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
              <p className="text-sm text-gray-400 font-medium">Market cancelled</p>
              <p className="text-xs text-gray-500 mt-1">All bets were refunded.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
