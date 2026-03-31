"use client";

import { useEffect, useState } from "react";

interface Snapshot {
  timestamp: string;
  probabilities: Record<string, number>;
}

interface OddsHistory {
  outcomes: { id: string; label: string }[];
  snapshots: Snapshot[];
}

const COLORS = ["#22d3ee", "#a78bfa", "#fb923c", "#4ade80", "#f472b6", "#facc15", "#60a5fa"];

const W = 560;
const H = 200;
const PAD_L = 36;
const PAD_R = 12;
const PAD_T = 12;
const PAD_B = 28;
const CW = W - PAD_L - PAD_R;
const CH = H - PAD_T - PAD_B;

export default function OddsChart({ eventId }: { eventId: string }) {
  const [data, setData] = useState<OddsHistory | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/events/${eventId}/odds-history`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, [eventId]);

  if (!data) {
    return (
      <div className="h-40 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (data.snapshots.length < 2) {
    return (
      <div className="h-40 flex items-center justify-center text-gray-600 text-sm text-center px-4">
        Noch keine Wetten — der Graph erscheint sobald jemand wettet.
      </div>
    );
  }

  const times = data.snapshots.map((s) => new Date(s.timestamp).getTime());
  const minT = times[0];
  const maxT = times[times.length - 1];
  const tRange = maxT === minT ? 1 : maxT - minT;

  const toX = (t: number) => PAD_L + ((t - minT) / tRange) * CW;
  const toY = (pct: number) => PAD_T + CH - (pct / 100) * CH;

  function makePath(outcomeId: string) {
    return data!.snapshots
      .map((s, i) => {
        const x = toX(times[i]).toFixed(1);
        const y = toY(s.probabilities[outcomeId] ?? 0).toFixed(1);
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  }

  const yLines = [0, 25, 50, 75, 100];
  const hovered = hoverIdx !== null ? data.snapshots[hoverIdx] : data.snapshots[data.snapshots.length - 1];
  const lastSnap = data.snapshots[data.snapshots.length - 1];

  return (
    <div className="space-y-3">
      <div className="w-full overflow-x-auto rounded-lg">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ minWidth: 280 }}
          onMouseLeave={() => setHoverIdx(null)}
        >
          {/* Grid */}
          {yLines.map((pct) => (
            <g key={pct}>
              <line
                x1={PAD_L}
                y1={toY(pct)}
                x2={W - PAD_R}
                y2={toY(pct)}
                stroke="#1f2937"
                strokeWidth={pct === 0 || pct === 100 ? 1.5 : 1}
                strokeDasharray={pct === 0 || pct === 100 ? undefined : "3 3"}
              />
              <text
                x={PAD_L - 5}
                y={toY(pct) + 3.5}
                textAnchor="end"
                fill="#4b5563"
                fontSize={9}
              >
                {pct}%
              </text>
            </g>
          ))}

          {/* Lines */}
          {data.outcomes.map((outcome, i) => (
            <path
              key={outcome.id}
              d={makePath(outcome.id)}
              fill="none"
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity={hoverIdx !== null ? 0.7 : 1}
            />
          ))}

          {/* Hover line + dots */}
          {hoverIdx !== null && (
            <line
              x1={toX(times[hoverIdx])}
              y1={PAD_T}
              x2={toX(times[hoverIdx])}
              y2={PAD_T + CH}
              stroke="#6b7280"
              strokeWidth={1}
              strokeDasharray="2 2"
            />
          )}

          {/* Invisible hover areas */}
          {data.snapshots.map((_, i) => {
            const x = toX(times[i]);
            return (
              <rect
                key={i}
                x={x - 8}
                y={PAD_T}
                width={16}
                height={CH}
                fill="transparent"
                onMouseEnter={() => setHoverIdx(i)}
              />
            );
          })}

          {/* Dots on active snapshot */}
          {data.outcomes.map((outcome, i) => {
            const snapIdx = hoverIdx ?? data.snapshots.length - 1;
            const snap = data.snapshots[snapIdx];
            const x = toX(times[snapIdx]);
            const y = toY(snap.probabilities[outcome.id] ?? 0);
            return (
              <circle
                key={outcome.id}
                cx={x}
                cy={y}
                r={3.5}
                fill={COLORS[i % COLORS.length]}
                stroke="#111827"
                strokeWidth={1.5}
              />
            );
          })}
        </svg>
      </div>

      {/* Legend + current values */}
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {data.outcomes.map((outcome, i) => {
          const pct = hovered.probabilities[outcome.id] ?? 0;
          const lastPct = lastSnap.probabilities[outcome.id] ?? 0;
          const delta = pct - (data.snapshots[0].probabilities[outcome.id] ?? 0);
          return (
            <div key={outcome.id} className="flex items-center gap-2 text-xs">
              <div
                className="w-3 h-0.5 rounded-full"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <span className="text-gray-400 truncate max-w-[100px]">{outcome.label}</span>
              <span
                className="font-bold tabular-nums"
                style={{ color: COLORS[i % COLORS.length] }}
              >
                {pct.toFixed(1)}%
              </span>
              {hoverIdx === null && delta !== 0 && (
                <span className={`text-xs ${delta > 0 ? "text-green-500" : "text-red-500"}`}>
                  {delta > 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%
                </span>
              )}
            </div>
          );
        })}
      </div>

      {hoverIdx !== null && (
        <p className="text-xs text-gray-600">
          {new Date(data.snapshots[hoverIdx].timestamp).toLocaleString("de-AT", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}
    </div>
  );
}
