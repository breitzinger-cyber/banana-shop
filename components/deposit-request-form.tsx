"use client";

import { useState, useEffect, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";

interface DepositRequest {
  id: string;
  amount: number;
  note: string | null;
  status: string;
  adminNote: string | null;
  createdAt: string;
}

const statusStyles: Record<string, string> = {
  PENDING: "text-yellow-400 bg-yellow-950/50 border-yellow-800",
  APPROVED: "text-green-400 bg-green-950/50 border-green-800",
  REJECTED: "text-red-400 bg-red-950/50 border-red-800",
};

const statusLabel: Record<string, string> = {
  PENDING: "⏳ Ausstehend",
  APPROVED: "✅ Genehmigt",
  REJECTED: "❌ Abgelehnt",
};

export default function DepositRequestForm() {
  const [requests, setRequests] = useState<DepositRequest[]>([]);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const fetchRequests = useCallback(async () => {
    const res = await fetch("/api/deposits");
    if (res.ok) {
      const data = await res.json();
      setRequests(data.requests);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const hasPending = requests.some((r) => r.status === "PENDING");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const tokens = parseFloat(amount);
    if (!tokens || tokens <= 0 || tokens > 100) {
      toast.error("Betrag: 1–100 Tokens");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: tokens, note: note.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Fehler");
      } else {
        toast.success("Antrag eingereicht! Der Admin wird ihn bald bearbeiten.");
        setAmount("");
        setNote("");
        setShowForm(false);
        fetchRequests();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-white">Token einzahlen</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Stelle einen Antrag — der Admin genehmigt ihn sobald er die Monster Energy erhalten hat.
          </p>
        </div>
        {!showForm && !hasPending && (
          <button
            onClick={() => setShowForm(true)}
            className="text-sm px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-semibold rounded-lg transition-colors shrink-0"
          >
            + Antrag stellen
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-5 space-y-3 bg-gray-800/50 rounded-xl p-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Anzahl Tokens (≈ Monster Energys)</label>
            <input
              type="number"
              min="1"
              max="100"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="z.B. 5"
              required
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
            />
            {amount && !isNaN(parseFloat(amount)) && (
              <p className="text-xs text-gray-500 mt-1">
                ≈ €{(parseFloat(amount) * 1.99).toFixed(2)} ({parseFloat(amount)} Monster Energys)
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Notiz (optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="z.B. gebe dir die Energys morgen"
              maxLength={200}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-gray-950 font-semibold text-sm rounded-lg transition-colors"
            >
              {loading ? "Wird eingereicht…" : "Antrag stellen"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}

      {hasPending && (
        <div className="mb-4 px-4 py-3 bg-yellow-950/30 border border-yellow-800 rounded-lg text-sm text-yellow-300">
          Du hast einen offenen Antrag. Bitte warte, bis der Admin ihn bearbeitet hat.
        </div>
      )}

      {requests.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 font-medium">Deine Anträge</p>
          {requests.map((r) => (
            <div
              key={r.id}
              className="flex items-start justify-between gap-3 py-2 border-b border-gray-800/50 last:border-0"
            >
              <div className="text-sm">
                <span className="text-white font-medium">{r.amount} Tokens</span>
                {r.note && <span className="text-gray-500 ml-2">· {r.note}</span>}
                {r.adminNote && (
                  <div className="text-xs text-gray-500 mt-0.5">Admin: {r.adminNote}</div>
                )}
                <div className="text-xs text-gray-600 mt-0.5">
                  {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}
                </div>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${
                  statusStyles[r.status] ?? "text-gray-400 bg-gray-800 border-gray-700"
                }`}
              >
                {statusLabel[r.status] ?? r.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {requests.length === 0 && !showForm && (
        <p className="text-gray-600 text-sm">Noch keine Anträge.</p>
      )}
    </div>
  );
}
