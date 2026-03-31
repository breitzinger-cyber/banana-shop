"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { calculateAllOdds, formatOdds, formatProbability, calculatePayout } from "@/lib/odds";
import { RAKE_PERCENT } from "@/lib/config";
import { tokensToEur, formatEur, MAX_BET_TOKENS, MONSTER_PRICE_EUR } from "@/lib/currency";

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

  // Poll live balance so stale JWT doesn't block betting after a deposit
  useEffect(() => {
    if (!session) return;
    const fetchBalance = () => {
      fetch("/api/profile/balance")
        .then((r) => r.ok ? r.json() : null)
        .then((d) => { if (d?.tokenBalance != null) setLiveBalance(d.tokenBalance); })
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

  // Prefer live balance from API over stale JWT value
  const balance = liveBalance ?? session?.user?.tokenBalance ?? 0;
  const maxAllowed = Math.min(balance, MAX_BET_TOKENS);
  const overLimit = tokensNum > MAX_BET_TOKENS;
  const overBalance = tokensNum > balance;

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
        <a href="/login" className="inline-block px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-semibold rounded-lg transition-colors">
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
    if (overLimit) { toast.error(`Max bet is ${MAX_BET_TOKENS} tokens (≈ €50).`); return; }

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
      } else {
        const outLabel = outcomes.find((o) => o.id === selectedOutcomeId)?.label;
        toast.success(`Bet placed: ${tokensNum} tokens on "${outLabel}"`);
        setSelectedOutcomeId(null);
        setTokensInput("");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleBet} className="space-y-4">
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
                isSelected ? "border-cyan-500 bg-cyan-950/30" : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${OUTCOME_COLORS[i % OUTCOME_COLORS.length]}`} />
                <span className="font-medium text-white text-sm">{outcome.label}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-cyan-400">{formatOdds(o.odds)}</span>
                <span className="text-xs text-gray-500 ml-1.5">{formatProbability(o.probability)}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Amount input */}
      <div>
        <label className="text-sm font-medium text-gray-300 mb-1.5 flex justify-between items-end">
          <span>Tokens to stake</span>
          <span className="text-gray-500 text-xs">
            Balance: {balance.toFixed(1)} T · Max: {MAX_BET_TOKENS} T (≈ €50)
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
            placeholder="e.g. 5"
            className={`flex-1 px-3 py-2.5 bg-gray-800 border rounded-lg text-white placeholder-gray-500 focus:ring-1 transition-colors ${
              overLimit || overBalance ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "border-gray-700 focus:border-cyan-500 focus:ring-cyan-500"
            }`}
          />
          <button
            type="button"
            onClick={() => setTokensInput(String(maxAllowed))}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors"
          >
            Max
          </button>
        </div>
        {overLimit && (
          <p className="text-red-400 text-xs mt-1">
            Max bet is {MAX_BET_TOKENS} tokens ≈ €50 per market.
          </p>
        )}
        {!overLimit && tokensNum > 0 && (
          <p className="text-gray-500 text-xs mt-1">
            ≈ {formatEur(tokensToEur(tokensNum))}
          </p>
        )}
      </div>

      {/* Projection */}
      {selectedOutcomeId && tokensNum > 0 && !overLimit && !overBalance && (
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
        disabled={loading || !selectedOutcomeId || tokensNum <= 0 || overLimit || overBalance}
        className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-700 disabled:text-gray-500 text-gray-950 font-bold rounded-xl transition-colors"
      >
        {loading ? "Placing bet…" : "Place bet"}
      </button>
    </form>
  );
}
