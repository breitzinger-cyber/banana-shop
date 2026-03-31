"use client";

import { useEffect, useState } from "react";
import ProbabilityBars from "./probability-bars";

interface Outcome {
  id: string;
  label: string;
  baseProbability: number;
  totalStaked: number;
}

interface LiveEventDetailProps {
  eventId: string;
  initialOutcomes: Outcome[];
}

export default function LiveEventDetail({
  eventId,
  initialOutcomes,
}: LiveEventDetailProps) {
  const [outcomes, setOutcomes] = useState<Outcome[]>(initialOutcomes);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/events/${eventId}`);
        if (res.ok) {
          const data = await res.json();
          setOutcomes(data.outcomes);
          setLastUpdated(new Date());
        }
      } catch {
        // Silent fail — stale data is fine
      }
    }, 10_000);

    return () => clearInterval(interval);
  }, [eventId]);

  return (
    <div>
      <ProbabilityBars outcomes={outcomes} showStaked />
      <p className="text-xs text-gray-600 mt-3 text-right">
        Updated {lastUpdated.toLocaleTimeString()}
      </p>
    </div>
  );
}
