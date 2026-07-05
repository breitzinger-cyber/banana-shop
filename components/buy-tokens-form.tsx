"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { TOKEN_PACKAGES } from "@/lib/token-packages";

interface BuyTokensFormProps {
  currentBalance: number;
}

export default function BuyTokensForm({ currentBalance }: BuyTokensFormProps) {
  const [loading, setLoading] = useState<string | null>(null);

  async function handleBuy(packageId: string) {
    setLoading(packageId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 503) {
          toast.error("Online payments not set up yet. Ask an admin to top up your balance.");
        } else {
          toast.error(data.error || "Failed to start checkout.");
        }
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-white">Buy Tokens</h2>
          <p className="text-xs text-gray-500 mt-0.5">1 token = €1 · Unused tokens carry over</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-400">Balance</div>
          <div className="text-lg font-bold text-yellow-400">{currentBalance.toFixed(1)} T</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {TOKEN_PACKAGES.map((pkg) => (
          <button
            key={pkg.id}
            onClick={() => handleBuy(pkg.id)}
            disabled={loading !== null}
            className="flex flex-col items-center p-4 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 rounded-xl border border-gray-700 hover:border-yellow-400/50 transition-all group"
          >
            <div className="text-2xl font-black text-yellow-400 group-hover:scale-110 transition-transform">
              {pkg.tokens}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">tokens</div>
            <div className="text-sm font-semibold text-white mt-2">
              €{(pkg.priceEurCents / 100).toFixed(0)}
            </div>
            {loading === pkg.id && (
              <div className="text-xs text-gray-500 mt-1">Redirecting…</div>
            )}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-600 mt-3 text-center">
        Secure payment via Stripe · Max €5/day to bet (buying is unlimited)
      </p>
    </div>
  );
}
