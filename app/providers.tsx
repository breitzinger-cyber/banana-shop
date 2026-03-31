"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#1f2937",
            color: "#f9fafb",
            border: "1px solid #374151",
            borderRadius: "8px",
          },
          success: {
            iconTheme: { primary: "#22d3ee", secondary: "#030712" },
          },
          error: {
            iconTheme: { primary: "#f87171", secondary: "#030712" },
          },
        }}
      />
    </SessionProvider>
  );
}
