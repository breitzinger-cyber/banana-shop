"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  tokenBalance: number;
  createdAt: string;
  _count: { bets: number };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [grantTarget, setGrantTarget] = useState<string | null>(null);
  const [grantAmount, setGrantAmount] = useState("");
  const [grantNote, setGrantNote] = useState("");
  const [grantLoading, setGrantLoading] = useState(false);

  async function loadUsers() {
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      const data = await res.json();
      setUsers(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleGrant(userId: string) {
    const amount = parseFloat(grantAmount);
    if (!amount || amount === 0) {
      toast.error("Enter a valid amount.");
      return;
    }

    setGrantLoading(true);
    const res = await fetch(`/api/admin/users/${userId}/grant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, note: grantNote || undefined }),
    });

    const data = await res.json();
    if (res.ok) {
      toast.success(`Granted ${amount} bananas to ${data.userName}.`);
      setGrantTarget(null);
      setGrantAmount("");
      setGrantNote("");
      loadUsers();
    } else {
      toast.error(data.error || "Failed.");
    }
    setGrantLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-500">Loading…</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white">Users</h1>
        <p className="text-gray-400 text-sm mt-1">{users.length} registered users</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-gray-800/50 text-xs text-gray-500 font-medium">
          <div className="col-span-3">User</div>
          <div className="col-span-3">Email</div>
          <div className="col-span-1 text-center">Role</div>
          <div className="col-span-2 text-right">Balance</div>
          <div className="col-span-1 text-right">Bets</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {users.map((user) => (
          <div key={user.id}>
            <div className="grid grid-cols-12 gap-2 px-4 py-4 border-b border-gray-800/60 last:border-0 items-center">
              <div className="col-span-3">
                <div className="font-medium text-white">{user.name}</div>
                <div className="text-xs text-gray-500">
                  Joined {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                </div>
              </div>
              <div className="col-span-3 text-sm text-gray-400 truncate">{user.email}</div>
              <div className="col-span-1 text-center">
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    user.role === "ADMIN"
                      ? "text-yellow-400 bg-yellow-950/50 border border-yellow-800"
                      : "text-gray-400 bg-gray-800"
                  }`}
                >
                  {user.role}
                </span>
              </div>
              <div className="col-span-2 text-right">
                <span className="text-yellow-400 font-bold">{user.tokenBalance.toFixed(1)}</span>
                <span className="text-gray-500 text-xs ml-1">🍌</span>
              </div>
              <div className="col-span-1 text-right text-sm text-gray-400">
                {user._count.bets}
              </div>
              <div className="col-span-2 text-right">
                <button
                  onClick={() =>
                    setGrantTarget(grantTarget === user.id ? null : user.id)
                  }
                  className="text-xs px-2.5 py-1.5 bg-yellow-900/50 hover:bg-yellow-800/50 text-yellow-400 rounded-lg transition-colors border border-yellow-800/50"
                >
                  Grant bananas
                </button>
              </div>
            </div>

            {/* Grant panel */}
            {grantTarget === user.id && (
              <div className="px-4 py-4 bg-gray-800/30 border-b border-gray-800">
                <div className="flex items-end gap-3 max-w-md">
                  <div className="flex-1">
                    <label className="text-xs text-gray-400 mb-1 block">
                      Amount (use negative to deduct)
                    </label>
                    <input
                      type="number"
                      value={grantAmount}
                      onChange={(e) => setGrantAmount(e.target.value)}
                      placeholder="e.g. 10"
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-yellow-400 transition-colors"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-400 mb-1 block">
                      Reason (optional)
                    </label>
                    <input
                      type="text"
                      value={grantNote}
                      onChange={(e) => setGrantNote(e.target.value)}
                      placeholder="Welcome bonus, etc."
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-yellow-400 transition-colors"
                    />
                  </div>
                  <button
                    onClick={() => handleGrant(user.id)}
                    disabled={grantLoading}
                    className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 disabled:bg-gray-700 text-gray-950 font-semibold rounded-lg text-sm transition-colors"
                  >
                    {grantLoading ? "…" : "Grant"}
                  </button>
                  <button
                    onClick={() => setGrantTarget(null)}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
