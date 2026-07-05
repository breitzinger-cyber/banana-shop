"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { calculateAllOdds, formatOdds, formatProbability, calculatePayout } from "@/lib/odds";
import { RAKE_PERCENT } from "@/lib/config";
import { tokensToEur, formatEur, MAX_BET_TOKENS, DAILY_SPEND_LIMIT } from "@/lib/currency";

const OUTCOME_COLORS = [
  "bg-green-500", "bg-blue-500", "bg-purple-500",
  "bg-orange-500", "bg-pink-500", "bg-yellow-500",
];

interface Outcome {
  id: string; label: string; baseProbability: number; totalStaked: number;
}

interface BetFormProps {
  eventId: string;
  outcomes: Outcome[];
  eventStatus: string;
}

export default function BetForm({ eventId, outcomes, eventStatus }: BetFormProps) {
  const { data: session } = useSession();
  const router = useRouter();

  const [selectedOutcomeId, setSelectedOutcomeId] = useState<string | null>(null);
  const [tokensInput, setTokensInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [liveBalance, setLiveBalance] = useState<number | null>(null);
  const [remainingToday, setRemainingToday] = useState<number | null>(null);

  useEffect(() => {
    if (!session) return;
    const fetchBalance = () => {
      fetch("/api/profile/balance")
        .then((r) => r.ok ? r.json() : null)
        .then((d) => {
          if (d?.tokenBalance != null) setLiveBalance(d.tokenBalance);
          if (d?.remainingToday != null) setRemainingToday(d.remainingToday);
        })
        .catch(() => {});
    };
    fetchBalance();
    const id = setInterval(fetchBalance, 10000);
    return () => clearInterval(id);
  }, [session]);

  const allOdds = calculateAllOdds(outcomes);
  const selectedOdds = selectedOutcomeId ? allOdds.find((o) => o.id === selectedOutcomeId) : null;

  const tokensNum = parseFloat(tokensInput) || 0;
  const rake = Math.round(tokensNum * RAKE_PERCENT * 100) / 100;
  const effectiveStake = Math.round((tokensNum - rake) * 100) / 100;
  const projectedPayout = selectedOdds ? calculatePayout(effectiveStake, selectedOdds.odds) : 0;

  const balance = liveBalance ?? session?.user?.tokenBalance ?? 0;
  const remaining = remainingToday ?? DAILY_SPEND_LIMIT;
  const maxAllowed = Math.min(balance, remaining, MAX_BET_TOKENS);

  const overDailyLimit = tokensNum > remaining;
  const overBalance = tokensNum > balance;
  const overMax = tokensNum > MAX_BET_TOKENS;
  const hasError = overDailyLimit || overBalance || overMax;

  const isOpen = eventStatus === "OPEN";

  if (!isOpen) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5 text-center">
        <p className="text-gray-400">
          {eventStatus === "RESOLVED" ? "This market has been resolved." : "Betting is closed."}
        </p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5 text-center">
        <p className="text-gray-400 mb-3">Sign in to place a bet</p>
        <a
          href="/login"
          className="inline-block px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-semibold rounded-lg transition-colors"
        >
          Sign in
        </a>
      </div>
    );
  }

  async function handleBet(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOutcomeId) { toast.error("Pick an outcome first."); return; }
    if (tokensNum <= 0) { toast.error("Enter a valid token amount."); return; }
    if (overBalance) { toast.error("Not enough tokens."); return; }
    if (overDailyLimit) { toast.error(`Daily limit: ${remaining.toFixed(1)} tokens left today.`); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/bets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, outcomeId: selectedOutcomeId, tokensStaked: tokensNum }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Bet failed.");
        if (data.remainingToday != null) setRemainingToday(data.remainingToday);
      } else {
        const outLabel = outcomes.find((o) => o.id === selectedOutcomeId)?.label;
        toast.success(`Bet placed on "${outLabel}"`);
        setSelectedOutcomeId(null);
        setTokensInput("");
        if (data.remainingToday != null) setRemainingToday(data.remainingToday);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleBet} className="space-y-4">
      {/* Daily limit indicator */}
      <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl text-xs">
        <span className="text-gray-400">Daily spend limit</span>
        <div className="flex items-center gap-2">
          <div className="w-20 h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                remaining <= 1 ? "bg-red-500" : remaining <= 2 ? "bg-orange-400" : "bg-yellow-400"
              }`}
              style={{ width: `${Math.max(0, ((DAILY_SPEND_LIMIT - remaining) / DAILY_SPEND_LIMIT) * 100)}%` }}
            />
          </div>
          <span className={remaining === 0 ? "text-red-400 font-medium" : "text-gray-300"}>
            {remaining.toFixed(1)}/{DAILY_SPEND_LIMIT} left
          </span>
        </div>
      </div>

      {remaining === 0 ? (
        <div className="p-4 bg-red-950/30 border border-red-800/50 rounded-xl text-center">
          <p className="text-red-400 text-sm font-medium">Daily spend limit reached</p>
          <p className="text-gray-500 text-xs mt-1">Resets at midnight. Buy more tokens on your profile.</p>
        </div>
      ) : (
        <>
          {/* Outcome selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Choose outcome</label>
            {allOdds.map((o, i) => {
              const outcome = outcomes.find((x) => x.id === o.id)!;
              const isSelected = selectedOutcomeId === o.id;
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setSelectedOutcomeId(o.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                    isSelected
                      ? "border-yellow-400 bg-yellow-950/20"
                      : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${OUTCOME_COLORS[i % OUTCOME_COLORS.length]}`} />
                    <span className="font-medium text-white text-sm">{outcome.label}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-bold ${isSelected ? "text-yellow-400" : "text-gray-300"}`}>
                      {formatOdds(o.odds)}
                    </span>
                    <span className="text-xs text-gray-500 ml-1.5">{formatProbability(o.probability)}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Amount */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-1.5 flex justify-between items-end">
              <span>Tokens to stake</span>
              <span className="text-gray-500 text-xs">
                Balance: {balance.toFixed(1)} T · Max today: {remaining.toFixed(1)} T
              </span>
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0.1"
                step="0.1"
                max={maxAllowed > 0 ? maxAllowed : undefined}
                value={tokensInput}
                onChange={(e) => setTokensInput(e.target.value)}
                placeholder="e.g. 2"
                className={`flex-1 px-3 py-2.5 bg-gray-800 border rounded-lg text-white placeholder-gray-500 focus:ring-1 transition-colors ${
                  hasError
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-700 focus:border-yellow-400 focus:ring-yellow-400"
                }`}
              />
              <button
                type="button"
                onClick={() => setTokensInput(String(Math.max(0, maxAllowed)))}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors"
              >
                Max
              </button>
            </div>
            {overDailyLimit && (
              <p className="text-red-400 text-xs mt-1">
                Only {remaining.toFixed(1)} tokens left for today.
              </p>
            )}
            {!hasError && tokensNum > 0 && (
              <p className="text-gray-500 text-xs mt-1">= {formatEur(tokensToEur(tokensNum))}</p>
            )}
          </div>

          {/* Projection */}
          {selectedOutcomeId && tokensNum > 0 && !hasError && (
            <div className="bg-gray-800/50 rounded-xl p-4 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Stake</span>
                <span className="text-white">{tokensNum.toFixed(2)} T · {formatEur(tokensToEur(tokensNum))}</span>
              </div>
              {rake > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Platform fee ({(RAKE_PERCENT * 100).toFixed(0)}%)</span>
                  <span className="text-gray-500">−{rake.toFixed(2)} T</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Odds (locked at bet)</span>
                <span className="text-white">{formatOdds(selectedOdds?.odds ?? 1)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-gray-700 pt-1.5 mt-1.5">
                <span className="text-gray-300 font-medium">Potential payout</span>
                <div className="text-right">
                  <span className="text-green-400 font-bold">{projectedPayout.toFixed(2)} T</span>
                  <span className="text-gray-500 text-xs ml-1">· {formatEur(tokensToEur(projectedPayout))}</span>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !selectedOutcomeId || tokensNum <= 0 || hasError}
            className="w-full py-3 bg-yellow-400 hover:bg-yellow-300 disabled:bg-gray-700 disabled:text-gray-500 text-gray-950 font-bold rounded-xl transition-colors"
          >
            {loading ? "Placing bet…" : "Place bet"}
          </button>
        </>
      )}
    </form>
  );
}
