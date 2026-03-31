"use client";

import { calculateAllOdds, formatOdds, formatProbability, OddsResult } from "@/lib/odds";

const OUTCOME_COLORS = [
  { bg: "bg-green-500", text: "text-green-400", border: "border-green-700", light: "bg-green-950/40" },
  { bg: "bg-blue-500", text: "text-blue-400", border: "border-blue-700", light: "bg-blue-950/40" },
  { bg: "bg-purple-500", text: "text-purple-400", border: "border-purple-700", light: "bg-purple-950/40" },
  { bg: "bg-orange-500", text: "text-orange-400", border: "border-orange-700", light: "bg-orange-950/40" },
  { bg: "bg-pink-500", text: "text-pink-400", border: "border-pink-700", light: "bg-pink-950/40" },
  { bg: "bg-yellow-500", text: "text-yellow-400", border: "border-yellow-700", light: "bg-yellow-950/40" },
];

interface Outcome {
  id: string;
  label: string;
  baseProbability: number;
  totalStaked: number;
}

interface ProbabilityBarsProps {
  outcomes: Outcome[];
  selectedOutcomeId?: string | null;
  onSelect?: (id: string) => void;
  showStaked?: boolean;
}

export default function ProbabilityBars({
  outcomes,
  selectedOutcomeId,
  onSelect,
  showStaked = true,
}: ProbabilityBarsProps) {
  const allOdds = calculateAllOdds(outcomes);
  const leading = allOdds.reduce((a, b) => (a.probability > b.probability ? a : b));

  return (
    <div className="space-y-3">
      {/* Stacked bar */}
      <div className="flex rounded-full overflow-hidden h-3 gap-px">
        {allOdds.map((o, i) => (
          <div
            key={o.id}
            className={`prob-bar ${OUTCOME_COLORS[i % OUTCOME_COLORS.length].bg} ${
              o.id === leading.id ? "opacity-100" : "opacity-50"
            }`}
            style={{ width: `${o.probability * 100}%` }}
            title={`${outcomes.find((x) => x.id === o.id)?.label}: ${formatProbability(o.probability)}`}
          />
        ))}
      </div>

      {/* Individual outcome rows */}
      <div className="space-y-2">
        {allOdds.map((o, i) => {
          const outcome = outcomes.find((x) => x.id === o.id)!;
          const colors = OUTCOME_COLORS[i % OUTCOME_COLORS.length];
          const isLeading = o.id === leading.id;
          const isSelected = selectedOutcomeId === o.id;

          return (
            <button
              key={o.id}
              onClick={() => onSelect?.(o.id)}
              disabled={!onSelect}
              className={`w-full text-left p-3 rounded-xl border transition-all ${
                isSelected
                  ? `${colors.light} ${colors.border} border-2`
                  : isLeading
                  ? "bg-gray-800/80 border-gray-700 hover:border-gray-600"
                  : "bg-gray-800/40 border-gray-800 hover:border-gray-700"
              } ${onSelect ? "cursor-pointer" : "cursor-default"}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {isSelected && (
                    <span className={`text-xs ${colors.text} font-bold`}>✓</span>
                  )}
                  <div className={`w-2.5 h-2.5 rounded-full ${colors.bg}`} />
                  <span className="font-medium text-white">{outcome.label}</span>
                  {isLeading && (
                    <span className="text-xs px-1.5 py-0.5 bg-green-900/50 text-green-400 rounded-full">
                      Leading
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className={`text-lg font-bold ${colors.text}`}>
                    {formatOdds(o.odds)}
                  </span>
                  <span className="text-sm text-gray-400 ml-1.5">
                    {formatProbability(o.probability)}
                  </span>
                </div>
              </div>

              {/* Bar */}
              <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full prob-bar ${colors.bg} ${isLeading ? "opacity-100" : "opacity-60"}`}
                  style={{ width: `${o.probability * 100}%` }}
                />
              </div>

              {showStaked && (
                <div className="mt-1.5 text-xs text-gray-500">
                  {outcome.totalStaked.toFixed(1)} tokens staked
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
