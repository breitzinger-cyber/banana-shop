"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";

interface Message {
  id: string;
  content: string;
  createdAt: string;
  readAt: string | null;
  from: { id: string; name: string; role: string };
  to:   { id: string; name: string; role: string };
}

interface Thread {
  userId: string;
  userName: string;
  messages: Message[];
  unread: number;
}

export default function AdminMessagesPage() {
  const { data: session } = useSession();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function fetchMessages() {
    const res = await fetch("/api/messages");
    if (!res.ok) return;
    const data = await res.json();
    const all: Message[] = data.messages;
    const adminId = session?.user?.id;

    // Group into threads by the non-admin user
    const map = new Map<string, Thread>();
    for (const msg of all) {
      const otherId = msg.from.role === "ADMIN" ? msg.to.id : msg.from.id;
      const otherName = msg.from.role === "ADMIN" ? msg.to.name : msg.from.name;
      if (!map.has(otherId)) {
        map.set(otherId, { userId: otherId, userName: otherName, messages: [], unread: 0 });
      }
      const thread = map.get(otherId)!;
      thread.messages.push(msg);
      if (!msg.readAt && msg.to.id === adminId) thread.unread++;
    }

    const sorted = Array.from(map.values()).sort((a, b) => {
      const aLast = new Date(a.messages.at(-1)!.createdAt).getTime();
      const bLast = new Date(b.messages.at(-1)!.createdAt).getTime();
      return bLast - aLast;
    });

    setThreads(sorted);
    if (!activeUserId && sorted.length > 0) setActiveUserId(sorted[0].userId);
  }

  useEffect(() => {
    if (!session) return;
    fetchMessages();
    const interval = setInterval(fetchMessages, 8_000);
    return () => clearInterval(interval);
  }, [session]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeUserId, threads]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !activeUserId) return;
    setLoading(true);
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: input, toUserId: activeUserId }),
    });
    if (res.ok) {
      setInput("");
      fetchMessages();
    } else {
      toast.error("Failed to send.");
    }
    setLoading(false);
  }

  const activeThread = threads.find((t) => t.userId === activeUserId);
  const adminId = session?.user?.id;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-4">Messages</h1>

      {threads.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center text-gray-500 text-sm">
          No messages yet.
        </div>
      ) : (
        <div className="flex gap-4 h-[70vh]">
          {/* Thread list */}
          <div className="w-56 shrink-0 bg-gray-900 border border-gray-800 rounded-xl overflow-y-auto">
            {threads.map((t) => (
              <button
                key={t.userId}
                onClick={() => setActiveUserId(t.userId)}
                className={`w-full text-left px-4 py-3 border-b border-gray-800 last:border-0 transition-colors ${
                  activeUserId === t.userId
                    ? "bg-gray-800 text-white"
                    : "text-gray-400 hover:bg-gray-800/50 hover:text-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{t.userName}</span>
                  {t.unread > 0 && (
                    <span className="text-xs bg-cyan-500 text-gray-950 font-bold px-1.5 py-0.5 rounded-full">
                      {t.unread}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-600 mt-0.5 truncate">
                  {t.messages.at(-1)?.content}
                </div>
              </button>
            ))}
          </div>

          {/* Active thread */}
          <div className="flex-1 bg-gray-900 border border-gray-800 rounded-xl flex flex-col">
            {activeThread ? (
              <>
                <div className="px-4 py-3 border-b border-gray-800 font-medium text-white text-sm">
                  {activeThread.userName}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {activeThread.messages.map((msg) => {
                    const isMe = msg.from.id === adminId;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                            isMe
                              ? "bg-cyan-600 text-white rounded-br-sm"
                              : "bg-gray-800 text-gray-100 rounded-bl-sm"
                          }`}
                        >
                          <p className="leading-snug">{msg.content}</p>
                          <div className={`text-xs mt-1 ${isMe ? "text-cyan-200" : "text-gray-500"}`}>
                            {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>

                <form onSubmit={handleSend} className="flex gap-2 p-3 border-t border-gray-800">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={`Reply to ${activeThread.userName}…`}
                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm focus:border-cyan-500 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-700 disabled:text-gray-500 text-gray-950 font-bold rounded-lg text-sm transition-colors"
                  >
                    Send
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
                Select a conversation
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
