"use client";

import { useEffect, useState } from "react";

export default function PushSubscribe() {
  const [status, setStatus] = useState<"idle" | "subscribed" | "denied" | "unsupported">("idle");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") setStatus("denied");
    else if (Notification.permission === "granted") setStatus("subscribed");
  }, []);

  async function subscribe() {
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return;

    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    const existing = await reg.pushManager.getSubscription();
    if (existing) { setStatus("subscribed"); return; }

    const perm = await Notification.requestPermission();
    if (perm !== "granted") { setStatus("denied"); return; }

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
    });

    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub),
    });

    setStatus("subscribed");
  }

  async function unsubscribe() {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
      await sub.unsubscribe();
    }
    setStatus("idle");
  }

  if (status === "unsupported") return null;

  return (
    <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl">
      <div>
        <div className="text-sm font-medium text-white">Push Notifications</div>
        <div className="text-xs text-gray-500 mt-0.5">
          {status === "subscribed"
            ? "You'll be notified when you win or get a message."
            : status === "denied"
            ? "Blocked in browser settings."
            : "Get notified for wins and messages."}
        </div>
      </div>
      {status === "subscribed" ? (
        <button
          onClick={unsubscribe}
          className="text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
        >
          Turn off
        </button>
      ) : status !== "denied" ? (
        <button
          onClick={subscribe}
          className="text-xs px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-semibold rounded-lg transition-colors"
        >
          Enable
        </button>
      ) : null}
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from(Array.from(rawData).map((c) => c.charCodeAt(0)));
}
