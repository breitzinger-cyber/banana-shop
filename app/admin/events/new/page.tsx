"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface OutcomeInput {
  label: string;
  baseProbability: string;
}

const CATEGORIES = [
  "Career",
  "Social",
  "Gaming",
  "Sports",
  "Entertainment",
  "Finance",
  "Travel",
  "Other",
];

export default function NewEventPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Social");
  const [closesAt, setClosesAt] = useState("");
  const [outcomes, setOutcomes] = useState<OutcomeInput[]>([
    { label: "", baseProbability: "50" },
    { label: "", baseProbability: "50" },
  ]);
  const [loading, setLoading] = useState(false);

  const totalProb = outcomes.reduce(
    (s, o) => s + (parseFloat(o.baseProbability) || 0),
    0
  );
  const probValid = Math.abs(totalProb - 100) < 0.01;

  function addOutcome() {
    setOutcomes([...outcomes, { label: "", baseProbability: "0" }]);
  }

  function removeOutcome(idx: number) {
    if (outcomes.length <= 2) {
      toast.error("Need at least 2 outcomes.");
      return;
    }
    setOutcomes(outcomes.filter((_, i) => i !== idx));
  }

  function updateOutcome(idx: number, field: keyof OutcomeInput, value: string) {
    setOutcomes(
      outcomes.map((o, i) => (i === idx ? { ...o, [field]: value } : o))
    );
  }

  function distributeEvenly() {
    const equal = (100 / outcomes.length).toFixed(1);
    setOutcomes(outcomes.map((o) => ({ ...o, baseProbability: equal })));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!probValid) {
      toast.error("Probabilities must sum to 100%.");
      return;
    }

    if (outcomes.some((o) => !o.label.trim())) {
      toast.error("All outcome labels must be filled in.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          category,
          closesAt: closesAt || null,
          outcomes: outcomes.map((o) => ({
            label: o.label.trim(),
            baseProbability: parseFloat(o.baseProbability) / 100,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to create market.");
      } else {
        toast.success("Market created!");
        router.push(`/admin/events/${data.id}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-6">Create New Market</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic info */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
            Market Info
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
              placeholder="Will X happen before Y?"
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={3}
              placeholder="Provide context for bettors…"
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-colors resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-colors"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Closes at{" "}
                <span className="text-gray-500 font-normal">(optional)</span>
              </label>
              <input
                type="datetime-local"
                value={closesAt}
                onChange={(e) => setClosesAt(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Outcomes */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
              Outcomes & Base Probabilities
            </h2>
            <button
              type="button"
              onClick={distributeEvenly}
              className="text-xs text-gray-400 hover:text-gray-200 underline underline-offset-2"
            >
              Distribute evenly
            </button>
          </div>

          <p className="text-xs text-gray-500">
            Base probabilities reflect your belief before any bets are placed.
            They act as a prior — bet volume can shift odds but won't override
            this entirely.
          </p>

          <div className="space-y-3">
            {outcomes.map((o, idx) => (
              <div key={idx} className="flex gap-3 items-start">
                <div className="flex-1">
                  <input
                    type="text"
                    value={o.label}
                    onChange={(e) => updateOutcome(idx, "label", e.target.value)}
                    placeholder={`Outcome ${idx + 1}`}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-yellow-400 transition-colors text-sm"
                  />
                </div>
                <div className="w-28 flex items-center gap-1">
                  <input
                    type="number"
                    value={o.baseProbability}
                    onChange={(e) =>
                      updateOutcome(idx, "baseProbability", e.target.value)
                    }
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-yellow-400 transition-colors text-right"
                  />
                  <span className="text-gray-500 text-sm">%</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeOutcome(idx)}
                  className="p-2 text-gray-600 hover:text-red-400 transition-colors"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addOutcome}
            className="text-sm text-yellow-400 hover:text-yellow-300 transition-colors"
          >
            + Add outcome
          </button>

          {/* Probability sum indicator */}
          <div
            className={`flex items-center justify-between p-3 rounded-lg ${
              probValid
                ? "bg-green-950/50 border border-green-800"
                : "bg-red-950/50 border border-red-800"
            }`}
          >
            <span className="text-sm font-medium text-gray-300">Total</span>
            <span
              className={`text-sm font-bold ${
                probValid ? "text-green-400" : "text-red-400"
              }`}
            >
              {totalProb.toFixed(1)}%{probValid ? " ✓" : " — must equal 100%"}
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !probValid}
          className="w-full py-3 bg-yellow-400 hover:bg-yellow-300 disabled:bg-gray-700 disabled:text-gray-500 text-gray-950 font-bold rounded-xl transition-colors"
        >
          {loading ? "Creating…" : "Create Market"}
        </button>
      </form>
    </div>
  );
}
