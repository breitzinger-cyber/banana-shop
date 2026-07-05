"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string; role: string };
}

export default function Comments({ eventId }: { eventId: string }) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function fetchComments() {
    const res = await fetch(`/api/comments/${eventId}`);
    if (res.ok) setComments(await res.json());
  }

  useEffect(() => {
    fetchComments();
    const interval = setInterval(fetchComments, 15_000);
    return () => clearInterval(interval);
  }, [eventId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    const res = await fetch(`/api/comments/${eventId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: input }),
    });
    if (res.ok) {
      setInput("");
      fetchComments();
    } else {
      const d = await res.json();
      toast.error(d.error || "Failed to post.");
    }
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      {/* Comment list */}
      {comments.length === 0 ? (
        <p className="text-gray-500 text-sm">No comments yet. Start the discussion!</p>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              {/* Avatar placeholder */}
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center shrink-0 text-xs font-bold text-gray-300">
                {c.user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium text-white">{c.user.name}</span>
                  {c.user.role === "ADMIN" && (
                    <span className="text-xs px-1.5 py-0.5 bg-yellow-900/50 text-yellow-400 border border-yellow-800/50 rounded-full">
                      Admin
                    </span>
                  )}
                  <span className="text-xs text-gray-600">
                    {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-gray-300 leading-snug break-words">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      {session ? (
        <form onSubmit={handleSubmit} className="flex gap-2 pt-2 border-t border-gray-800">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={500}
            placeholder="Add a comment…"
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm focus:border-yellow-400 transition-colors"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 disabled:bg-gray-700 disabled:text-gray-500 text-gray-950 font-semibold rounded-lg text-sm transition-colors"
          >
            Post
          </button>
        </form>
      ) : (
        <p className="text-xs text-gray-600 pt-2 border-t border-gray-800">
          <a href="/login" className="text-yellow-400 hover:underline">Sign in</a> to comment.
        </p>
      )}
    </div>
  );
}
