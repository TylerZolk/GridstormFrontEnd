import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import AdminCreateUser from "./parts/AdminCreateUser";
import UserManagement from "./parts/UserManagement";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/portal");

  const isAdmin = true;
  return (
    <div>
      <main className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="rounded-[26px] border-2 border-blue-600 bg-white p-10">

            {/* Header row */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-4xl font-extrabold tracking-tight text-blue-900">
                  Admin Dashboard
                </h1>
                <p className="mt-2 text-base text-blue-800">
                  Manage user access. Logged in as{" "}
                  <span className="font-bold text-blue-900">{session?.username}</span>.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-blue-800">
                  <span className="font-semibold">Role:</span>
                  <span className="inline-flex items-center rounded-full border-2 border-blue-300 bg-white px-4 py-1 font-bold text-blue-900">
                    {session?.role}
                  </span>
                </div>

                {/* Back to Portal button */}
                <Link
                  href="/portal"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98]"
                >
                  ← Portal
                </Link>
              </div>
            </div>

            <div className="mt-10 grid gap-10 lg:grid-cols-2">
              {/* Add user */}
              {isAdmin && (
                <section className="rounded-2xl border-2 border-blue-300 bg-white p-8">
                  <h2 className="text-2xl font-bold text-blue-900">Add User</h2>
                  <p className="mt-2 text-sm text-blue-800">
                    Admin only. New accounts are always basic users.
                  </p>
                  <div className="mt-6">
                    <AdminCreateUser />
                  </div>
                </section>
              )}

              {/* User list */}
              <section
                className={`rounded-2xl border-2 border-blue-300 bg-white p-8 ${
                  !isAdmin ? "lg:col-span-2" : ""
                }`}
              >
                <h2 className="text-2xl font-bold text-blue-900">User List</h2>
                <p className="mt-2 text-sm text-blue-800">
                  {isAdmin
                    ? "Admins can remove users."
                    : "View-only access. Only Admin can remove users."}
                </p>
                <div className="mt-6">
                  <UserManagement isAdmin={isAdmin} />
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
