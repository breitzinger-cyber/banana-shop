"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

interface ProposalActionsProps {
  proposalId: string;
}

export default function ProposalActions({ proposalId }: ProposalActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectNote, setRejectNote] = useState("");

  async function handleAction(action: "approve" | "reject") {
    setLoading(action);
    try {
      const res = await fetch(`/api/admin/proposals/${proposalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          adminReviewNote: action === "reject" ? rejectNote : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Action failed.");
      } else {
        toast.success(action === "approve" ? "Market approved and live!" : "Proposal rejected.");
        router.refresh();
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-2">
      {showRejectInput && (
        <div className="flex gap-2">
          <input
            type="text"
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder="Reason for rejection (optional)"
            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
          />
          <button
            onClick={() => handleAction("reject")}
            disabled={loading === "reject"}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading === "reject" ? "…" : "Confirm"}
          </button>
          <button
            onClick={() => setShowRejectInput(false)}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-400 text-sm rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {!showRejectInput && (
        <div className="flex gap-2">
          <button
            onClick={() => handleAction("approve")}
            disabled={loading !== null}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {loading === "approve" ? "Approving…" : "Approve"}
          </button>
          <button
            onClick={() => setShowRejectInput(true)}
            disabled={loading !== null}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-300 text-sm font-medium rounded-lg transition-colors"
          >
            Reject
          </button>
          <Link href={`/admin/events/${proposalId}`} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium rounded-lg transition-colors">
            Edit first
          </Link>
        </div>
      )}
    </div>
  );
}

