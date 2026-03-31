"use client";

import { useState, useEffect, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";

interface DepositRequest {
  id: string;
  amount: number;
  note: string | null;
  status: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    tokenBalance: number;
  };
}

export default function AdminDepositRequests() {
  const [requests, setRequests] = useState<DepositRequest[]>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  const fetchRequests = useCallback(async () => {
    const res = await fetch("/api/admin/deposits");
    if (res.ok) {
      const data = await res.json();
      setRequests(data.requests);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 15000);
    return () => clearInterval(interval);
  }, [fetchRequests]);

  async function handle(id: string, action: "APPROVE" | "REJECT") {
    setLoading((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/admin/deposits/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, adminNote: adminNotes[id] ?? "" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Fehler");
      } else {
        toast.success(action === "APPROVE" ? "Genehmigt ✅" : "Abgelehnt ❌");
        fetchRequests();
      }
    } finally {
      setLoading((prev) => ({ ...prev, [id]: false }));
    }
  }

  if (requests.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-base font-semibold text-white mb-2">Einzahlungsanträge</h2>
        <p className="text-gray-600 text-sm">Keine offenen Anträge.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-base font-semibold text-white">Einzahlungsanträge</h2>
        <span className="text-xs px-2 py-0.5 bg-yellow-500 text-gray-900 font-bold rounded-full">
          {requests.length}
        </span>
      </div>
      <div className="space-y-4">
        {requests.map((r) => (
          <div key={r.id} className="bg-gray-800/60 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-white">
                  {r.user.name}
                  <span className="text-gray-500 font-normal ml-2 text-xs">{r.user.email}</span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  aktuell {r.user.tokenBalance.toFixed(1)} Tokens ·{" "}
                  {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-2xl font-black text-cyan-400">{r.amount}</div>
                <div className="text-xs text-gray-500">Tokens ≈ €{(r.amount * 1.99).toFixed(2)}</div>
              </div>
            </div>

            {r.note && (
              <div className="text-sm text-gray-400 bg-gray-900/50 rounded-lg px-3 py-2">
                💬 {r.note}
              </div>
            )}

            <div>
              <input
                type="text"
                placeholder="Optionale Begründung (für den User sichtbar)"
                maxLength={200}
                value={adminNotes[r.id] ?? ""}
                onChange={(e) =>
                  setAdminNotes((prev) => ({ ...prev, [r.id]: e.target.value }))
                }
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handle(r.id, "APPROVE")}
                disabled={loading[r.id]}
                className="flex-1 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold text-sm rounded-lg transition-colors"
              >
                {loading[r.id] ? "…" : "✅ Genehmigen"}
              </button>
              <button
                onClick={() => handle(r.id, "REJECT")}
                disabled={loading[r.id]}
                className="flex-1 py-2 bg-red-800 hover:bg-red-700 disabled:opacity-50 text-white font-semibold text-sm rounded-lg transition-colors"
              >
                {loading[r.id] ? "…" : "❌ Ablehnen"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
