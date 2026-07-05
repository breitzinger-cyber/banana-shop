"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { TOKEN_PACKAGES } from "@/lib/token-packages";

interface BuyTokensFormProps {
  currentBalance: number;
}

export default function BuyTokensForm({ currentBalance }: BuyTokensFormProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [cashoutInput, setCashoutInput] = useState("");

  async function sendRequest(type: "buy" | "cashout", amount: number, key: string) {
    setLoading(key);
    try {
      const res = await fetch("/api/shop/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, amount }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Request failed.");
        return false;
      }
      toast.success(
        type === "buy"
          ? "Kauf-Anfrage geschickt! Der Admin lädt dich nach Zahlung auf."
          : "Auszahl-Anfrage geschickt! Der Admin meldet sich bei dir."
      );
      return true;
    } finally {
      setLoading(null);
    }
  }

  const cashoutNum = parseFloat(cashoutInput) || 0;
  const cashoutInvalid = cashoutNum <= 0 || cashoutNum > currentBalance;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">🍌 Banana Shop</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            1 Banane = €1 · privat abgerechnet
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-400">Guthaben</div>
          <div className="text-lg font-bold text-yellow-400">
            {currentBalance.toFixed(1)} 🍌
          </div>
        </div>
      </div>

      {/* Buy packages */}
      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-2">Bananas kaufen</h3>
        <div className="grid grid-cols-3 gap-3">
          {TOKEN_PACKAGES.map((pkg) => (
            <button
              key={pkg.id}
              onClick={() => sendRequest("buy", pkg.tokens, pkg.id)}
              disabled={loading !== null}
              className="flex flex-col items-center p-4 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 rounded-xl border border-gray-700 hover:border-yellow-400/50 transition-all group"
            >
              <div className="text-2xl group-hover:scale-110 transition-transform">🍌</div>
              <div className="text-lg font-black text-yellow-400 mt-1">{pkg.tokens}</div>
              <div className="text-sm font-semibold text-white mt-1">
                €{(pkg.priceEurCents / 100).toFixed(0)}
              </div>
              {loading === pkg.id && (
                <div className="text-xs text-gray-500 mt-1">Sende…</div>
              )}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-600 mt-2">
          Klick auf ein Paket → der Admin bekommt eine Nachricht und lädt dich auf,
          sobald du ihm das Geld gegeben hast.
        </p>
      </div>

      {/* Cash out */}
      <div className="pt-4 border-t border-gray-800">
        <h3 className="text-sm font-medium text-gray-300 mb-2">Bananas auszahlen</h3>
        <div className="flex gap-2">
          <input
            type="number"
            min="0.1"
            step="0.1"
            max={currentBalance}
            value={cashoutInput}
            onChange={(e) => setCashoutInput(e.target.value)}
            placeholder="Anzahl"
            className="flex-1 px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-colors"
          />
          <button
            onClick={async () => {
              const ok = await sendRequest("cashout", cashoutNum, "cashout");
              if (ok) setCashoutInput("");
            }}
            disabled={loading !== null || cashoutInvalid}
            className="px-4 py-2.5 bg-yellow-400 hover:bg-yellow-300 disabled:bg-gray-700 disabled:text-gray-500 text-gray-950 font-semibold rounded-lg transition-colors whitespace-nowrap"
          >
            {loading === "cashout" ? "Sende…" : "Auszahlung anfragen"}
          </button>
        </div>
        {cashoutNum > currentBalance && (
          <p className="text-red-400 text-xs mt-1">
            Du hast nur {currentBalance.toFixed(1)} 🍌.
          </p>
        )}
        <p className="text-xs text-gray-600 mt-2">
          Der Admin bekommt eine Nachricht, zahlt dir persönlich aus und zieht die
          Bananas dann von deinem Konto ab.
        </p>
      </div>
    </div>
  );
}
