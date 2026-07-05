"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import Link from "next/link";

const CATEGORIES = [
  "Career", "Social", "Gaming", "Sports",
  "Entertainment", "Finance", "Travel", "Other",
];

interface OutcomeInput {
  label: string;
}

export default function ProposePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Social");
  const [closesAt, setClosesAt] = useState("");
  const [proposalNote, setProposalNote] = useState("");
  const [outcomes, setOutcomes] = useState<OutcomeInput[]>([
    { label: "" }, { label: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (status === "loading") return null;

  if (!session) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="text-gray-400 mb-4">Sign in to suggest a bet.</p>
        <Link
          href="/login"
          className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-semibold rounded-lg transition-colors"
        >
          Sign in
        </Link>
      </div>
    );
  }

  function addOutcome() {
    if (outcomes.length >= 6) { toast.error("Max 6 outcomes."); return; }
    setOutcomes([...outcomes, { label: "" }]);
  }

  function removeOutcome(idx: number) {
    if (outcomes.length <= 2) { toast.error("Need at least 2 outcomes."); return; }
    setOutcomes(outcomes.filter((_, i) => i !== idx));
  }

  function updateOutcome(idx: number, value: string) {
    setOutcomes(outcomes.map((o, i) => (i === idx ? { label: value } : o)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (outcomes.some((o) => !o.label.trim())) {
      toast.error("Fill in all outcome labels.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/events/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          category,
          closesAt: closesAt || null,
          proposalNote,
          outcomes: outcomes.map((o) => ({ label: o.label.trim() })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Submission failed.");
      } else {
        setSubmitted(true);
      }
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">🍌</div>
        <h1 className="text-2xl font-bold text-white mb-2">Proposal submitted!</h1>
        <p className="text-gray-400 mb-6">
          An admin will review your suggestion. If it gets approved, it&apos;ll appear in the live markets.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => { setSubmitted(false); setTitle(""); setDescription(""); setProposalNote(""); setOutcomes([{ label: "" }, { label: "" }]); }}
            className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg transition-colors"
          >
            Suggest another
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-semibold rounded-lg transition-colors"
          >
            View markets
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Suggest a bet</h1>
        <p className="text-gray-400 mt-1 text-sm">
          Propose a market. An admin will review and approve it before it goes live.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic info */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Question</label>
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
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Context</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={3}
              placeholder="Give some background so people understand the bet…"
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-colors resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-colors"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Deadline <span className="text-gray-500 font-normal">(optional)</span>
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
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-medium text-gray-300">Possible outcomes</h2>
          <p className="text-xs text-gray-500">List the options people can bet on. At least 2, max 6.</p>

          <div className="space-y-2">
            {outcomes.map((o, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={o.label}
                  onChange={(e) => updateOutcome(idx, e.target.value)}
                  placeholder={`Option ${idx + 1}`}
                  className="flex-1 px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-colors text-sm"
                />
                {outcomes.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOutcome(idx)}
                    className="p-2 text-gray-600 hover:text-red-400 transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          {outcomes.length < 6 && (
            <button
              type="button"
              onClick={addOutcome}
              className="text-sm text-yellow-400 hover:text-yellow-300 transition-colors"
            >
              + Add option
            </button>
          )}
        </div>

        {/* Note to admin */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Note for the admin <span className="text-gray-500 font-normal">(optional)</span>
          </label>
          <textarea
            value={proposalNote}
            onChange={(e) => setProposalNote(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Any additional context, how to determine the winner, etc."
            className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-colors resize-none text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-yellow-400 hover:bg-yellow-300 disabled:bg-gray-700 disabled:text-gray-500 text-gray-950 font-bold rounded-xl transition-colors"
        >
          {loading ? "Submitting…" : "Submit proposal"}
        </button>
      </form>
    </div>
  );
}
