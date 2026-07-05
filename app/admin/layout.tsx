import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Admin nav */}
      <div className="mb-6 flex items-center gap-2 flex-wrap">
        <span className="text-xs px-2 py-0.5 bg-yellow-900/50 text-yellow-400 border border-yellow-800 rounded-full font-medium">
          Admin
        </span>
        <AdminNavLink href="/admin">Dashboard</AdminNavLink>
        <AdminNavLink href="/admin/events/new">+ New Market</AdminNavLink>
        <AdminNavLink href="/admin/users">Users</AdminNavLink>
        <AdminNavLink href="/admin/messages">Messages</AdminNavLink>
      </div>
      {children}
    </div>
  );
}

function AdminNavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="text-sm text-gray-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors"
    >
      {children}
    </Link>
  );
}
