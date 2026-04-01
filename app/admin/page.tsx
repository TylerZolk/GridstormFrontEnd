import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminCreateUser from "./parts/AdminCreateUser";
import UserManagement from "./parts/UserManagement";

export const dynamic = "force-dynamic";

const GRID_STYLE = {
  backgroundImage:
    "linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)",
  backgroundSize: "48px 48px",
};

export default async function AdminPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/portal");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Dark Header Section ── */}
      <div className="relative overflow-hidden bg-blue-950">
        <div className="absolute inset-0 opacity-[0.04]" style={GRID_STYLE} />
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400" />

        <div className="relative mx-auto max-w-6xl px-6 pb-10 pt-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-700/50 bg-blue-900/60 px-3 py-1 text-xs font-medium text-blue-200 backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
                System Administration
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-white">
                Admin Dashboard
              </h1>
              <p className="mt-1.5 text-blue-200/80">
                Manage user access. Logged in as{" "}
                <span className="font-semibold text-yellow-400">{session?.username}</span>.
              </p>
            </div>
            <span className="rounded-full border border-blue-700/40 bg-blue-900/50 px-4 py-1.5 text-sm font-bold text-blue-200">
              {session?.role}
            </span>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Add user */}
          <section className="rounded-2xl border border-blue-100 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-bold text-blue-950">Add User</h2>
            <p className="mt-1 text-sm text-blue-700">
              Admin only. New accounts are always basic users.
            </p>
            <div className="mt-6">
              <AdminCreateUser />
            </div>
          </section>

          {/* User list */}
          <section className="rounded-2xl border border-blue-100 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-bold text-blue-950">User List</h2>
            <p className="mt-1 text-sm text-blue-700">
              Admins can remove users.
            </p>
            <div className="mt-6">
              <UserManagement isAdmin={true} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
