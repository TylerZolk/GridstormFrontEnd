import Link from "next/link";
import RequireAuth from "@/components/RequireAuth";
import { getSessionUser } from "@/lib/auth";
import { listSubmissions } from "@/lib/submissions";

export const dynamic = "force-dynamic";

export default async function PortalDashboardPage() {
  const user = await getSessionUser();

  let submissions: Awaited<ReturnType<typeof listSubmissions>> = [];
  let statsError = false;
  try {
    submissions = await listSubmissions();
  } catch {
    statsError = true;
  }

  const total = submissions.length;
  const withVegetation = submissions.filter((s) => s.flags?.includes("vegetation")).length;
  const needsReview = submissions.filter((s) => s.flags?.includes("review")).length;
  const processing = submissions.filter((s) => s.flags?.includes("processing")).length;

  const conditionCounts: Record<string, number> = {};
  for (const s of submissions) {
    if (s.poleCondition) {
      conditionCounts[s.poleCondition] = (conditionCounts[s.poleCondition] ?? 0) + 1;
    }
  }

  const uniqueUsers = new Set(submissions.map((s) => s.submittedBy)).size;

  const recentSubmissions = submissions.slice(0, 5);

  return (
    <RequireAuth>
      <main className="bg-white min-h-screen">
        <div className="mx-auto max-w-6xl px-6 py-10">

          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-blue-950">
                Dashboard
              </h1>
              <p className="mt-1 text-blue-800">
                Welcome back, <span className="font-semibold">{user?.username}</span>.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-blue-800">Role</span>
              <span className="rounded-full bg-blue-50 px-4 py-1.5 text-sm font-bold text-blue-900 ring-1 ring-blue-200">
                {user?.role}
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid gap-5 md:grid-cols-2 mb-10">
            <Link
              href="/portal/submission"
              className="group rounded-2xl bg-blue-600 p-8 shadow-md transition hover:-translate-y-[2px] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-blue-200 mb-2">New</p>
                  <h2 className="text-2xl font-bold text-white">Submit Inspection</h2>
                  <p className="mt-2 text-sm text-blue-200">
                    Upload photos and run AI analysis on a new site.
                  </p>
                </div>
                <span className="rounded-xl bg-white/15 px-4 py-2 text-sm font-bold text-white transition group-hover:bg-white/25">
                  Open →
                </span>
              </div>
            </Link>

            <Link
              href="/portal/database"
              className="group rounded-2xl bg-white p-8 shadow-md ring-1 ring-blue-100 transition hover:-translate-y-[2px] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-2">Browse</p>
                  <h2 className="text-2xl font-bold text-blue-950">View Database</h2>
                  <p className="mt-2 text-sm text-blue-700">
                    Search and filter all submitted inspection records.
                  </p>
                </div>
                <span className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-bold text-blue-900 ring-1 ring-blue-200 transition group-hover:bg-blue-100">
                  Open →
                </span>
              </div>
            </Link>
          </div>

          {/* Stats */}
          {!statsError && (
            <>
              <h2 className="text-lg font-bold text-blue-950 mb-4">Overview</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-10">
                <StatCard label="Total Submissions" value={total} color="blue" />
                <StatCard label="Unique Inspectors" value={uniqueUsers} color="indigo" />
                <StatCard label="Needs Review" value={needsReview} color="purple" />
                <StatCard label="Vegetation Flagged" value={withVegetation} color="green" />
              </div>

              {/* Condition breakdown + recent */}
              <div className="grid gap-6 md:grid-cols-2">

                {/* Condition Breakdown */}
                <div className="rounded-2xl bg-white p-6 ring-1 ring-blue-100 shadow-sm">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-blue-500 mb-4">
                    Pole Condition Breakdown
                  </h3>
                  {Object.keys(conditionCounts).length === 0 ? (
                    <p className="text-sm text-blue-400 italic">No data yet.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {(["Excellent", "Good", "Fair", "Poor", "Critical"] as const).map((cond) => {
                        const count = conditionCounts[cond] ?? 0;
                        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                        const colorMap: Record<string, string> = {
                          Excellent: "bg-green-400",
                          Good: "bg-blue-400",
                          Fair: "bg-yellow-400",
                          Poor: "bg-orange-400",
                          Critical: "bg-red-500",
                        };
                        return (
                          <div key={cond}>
                            <div className="flex justify-between text-xs font-semibold text-blue-800 mb-1">
                              <span>{cond}</span>
                              <span>{count} ({pct}%)</span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-blue-50">
                              <div
                                className={`h-2 rounded-full transition-all ${colorMap[cond]}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Recent Activity */}
                <div className="rounded-2xl bg-white p-6 ring-1 ring-blue-100 shadow-sm">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-blue-500 mb-4">
                    Recent Submissions
                  </h3>
                  {recentSubmissions.length === 0 ? (
                    <p className="text-sm text-blue-400 italic">No submissions yet.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {recentSubmissions.map((s) => (
                        <Link
                          key={s.id}
                          href="/portal/database"
                          className="flex items-center justify-between rounded-xl bg-blue-50 px-4 py-2.5 hover:bg-blue-100 transition"
                        >
                          <div>
                            <p className="text-sm font-bold text-blue-950">
                              Tag #{s.tagNumber || "—"}
                            </p>
                            <p className="text-xs text-blue-600">{s.submittedBy}</p>
                          </div>
                          <div className="text-right">
                            <ConditionDot condition={s.poleCondition} />
                            <p className="text-[10px] text-blue-400 mt-0.5">
                              {new Date(s.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                  {total > 5 && (
                    <Link
                      href="/portal/database"
                      className="mt-3 block text-center text-xs font-semibold text-blue-500 hover:text-blue-700"
                    >
                      View all {total} submissions →
                    </Link>
                  )}
                </div>

              </div>

              {/* Processing notice */}
              {processing > 0 && (
                <div className="mt-6 rounded-2xl border border-yellow-200 bg-yellow-50 px-5 py-3 text-sm text-yellow-800 font-medium">
                  ⏳ {processing} submission{processing !== 1 ? "s are" : " is"} still processing.
                </div>
              )}
            </>
          )}

          {statsError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
              Could not load stats — database may be unavailable.
            </div>
          )}
        </div>
      </main>
    </RequireAuth>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-600 text-white",
    indigo: "bg-indigo-500 text-white",
    purple: "bg-purple-500 text-white",
    green: "bg-green-500 text-white",
  };
  return (
    <div className={`rounded-2xl p-5 shadow-sm ${colorMap[color]}`}>
      <p className="text-3xl font-extrabold">{value}</p>
      <p className="mt-1 text-xs font-semibold opacity-80 uppercase tracking-wider">{label}</p>
    </div>
  );
}

function ConditionDot({ condition }: { condition: string }) {
  const map: Record<string, string> = {
    Excellent: "bg-green-400",
    Good: "bg-blue-400",
    Fair: "bg-yellow-400",
    Poor: "bg-orange-400",
    Critical: "bg-red-500",
  };
  const cls = map[condition] ?? "bg-gray-300";
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-800">
      <span className={`inline-block h-2 w-2 rounded-full ${cls}`} />
      {condition || "—"}
    </span>
  );
}
