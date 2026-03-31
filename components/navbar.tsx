"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [liveBalance, setLiveBalance] = useState<number | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  useEffect(() => {
    if (!session) { setLiveBalance(null); setUnreadCount(0); return; }

    async function fetchBalance() {
      try {
        const res = await fetch("/api/profile/balance");
        if (res.ok) setLiveBalance((await res.json()).tokenBalance);
      } catch {}
    }
    async function fetchUnread() {
      try {
        const res = await fetch("/api/messages/unread");
        if (res.ok) setUnreadCount((await res.json()).count);
      } catch {}
    }

    fetchBalance(); fetchUnread();
    const i1 = setInterval(fetchBalance, 15_000);
    const i2 = setInterval(fetchUnread, 10_000);
    return () => { clearInterval(i1); clearInterval(i2); };
  }, [session]);

  if (pathname === "/login" || pathname === "/register") return null;

  const isAdmin = session?.user?.role === "ADMIN";
  const displayBalance =
    liveBalance !== null
      ? liveBalance.toFixed(1)
      : (session?.user?.tokenBalance?.toFixed(1) ?? "0");

  const navLinks = (
    <>
      <NavLink href="/" active={pathname === "/"}>Markets</NavLink>
      <NavLink href="/leaderboard" active={pathname === "/leaderboard"}>Leaderboard</NavLink>
      {session && (
        <NavLink href="/messages" active={pathname === "/messages"}>
          <span className="relative inline-flex items-center">
            Messages
            {unreadCount > 0 && (
              <span className="ml-1.5 text-xs bg-cyan-500 text-gray-950 font-bold px-1.5 py-0.5 rounded-full leading-none">
                {unreadCount}
              </span>
            )}
          </span>
        </NavLink>
      )}
      {isAdmin && (
        <NavLink href="/admin" active={pathname.startsWith("/admin")}>Admin</NavLink>
      )}
    </>
  );

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-gray-950/90 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <span className="text-xl font-black text-cyan-400 tracking-tight group-hover:text-cyan-300 transition-colors">
              I.C.E.
            </span>
            <span className="hidden sm:block text-xs text-gray-500 font-medium leading-tight">
              Inner Circle<br />Exchange
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">{navLinks}</nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {session ? (
              <>
                <Link
                  href="/profile"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors"
                >
                  <span className="text-cyan-400 text-sm font-bold">{displayBalance}</span>
                  <span className="text-gray-400 text-xs">T</span>
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="hidden md:block text-sm text-gray-400 hover:text-gray-200 transition-colors"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="hidden md:block px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-gray-950 text-sm font-semibold rounded-full transition-colors"
              >
                Sign in
              </Link>
            )}

            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="md:hidden flex flex-col gap-1.5 p-2 rounded-lg hover:bg-gray-800 transition-colors"
              aria-label="Menu"
            >
              <span className={`block w-5 h-0.5 bg-gray-300 transition-transform duration-200 ${menuOpen ? "translate-y-2 rotate-45" : ""}`} />
              <span className={`block w-5 h-0.5 bg-gray-300 transition-opacity duration-200 ${menuOpen ? "opacity-0" : ""}`} />
              <span className={`block w-5 h-0.5 bg-gray-300 transition-transform duration-200 ${menuOpen ? "-translate-y-2 -rotate-45" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="absolute top-16 left-0 right-0 bg-gray-900 border-b border-gray-800 p-4 space-y-1"
            onClick={(e) => e.stopPropagation()}
          >
            {navLinks}

            <div className="pt-3 border-t border-gray-800 mt-3 flex items-center justify-between">
              {session ? (
                <>
                  <Link
                    href="/profile"
                    className="flex items-center gap-2 text-sm text-gray-300"
                    onClick={() => setMenuOpen(false)}
                  >
                    <span className="text-cyan-400 font-bold">{displayBalance}</span>
                    <span className="text-gray-500">tokens</span>
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="text-sm text-gray-400 hover:text-gray-200"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="w-full text-center py-2.5 bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-semibold rounded-lg transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`block px-3 py-2 md:py-1.5 rounded-lg text-sm font-medium transition-colors ${
        active ? "bg-gray-800 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800/50"
      }`}
    >
      {children}
    </Link>
  );
}
