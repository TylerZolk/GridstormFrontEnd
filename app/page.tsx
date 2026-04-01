import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { listSubmissions } from "@/lib/submissions";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getSessionUser();
  if (user) {
    redirect("/portal");
  }

  let recordCount: number | null = null;
  try {
    const submissions = await listSubmissions();
    recordCount = submissions.length;
  } catch {
    // DB unavailable — fall back to no count
  }

  return (
    <main className="bg-white">
      {/* ── Hero Section ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-blue-950">
        {/* Subtle grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Gradient accent line at top */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400" />

        <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-16 sm:pb-28 sm:pt-24">
          <div className="flex flex-col gap-14 lg:flex-row lg:items-center lg:gap-20">
            {/* Left: Copy */}
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-700/50 bg-blue-900/60 px-4 py-1.5 text-sm font-medium text-blue-200 backdrop-blur-sm">
                <span className="h-2 w-2 rounded-full bg-yellow-400" />
                Field Inspection Platform
              </div>

              <h1 className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
                Inspect. Capture.
                <br />
                <span className="text-yellow-400">Report.</span>
              </h1>

              <p className="mt-6 max-w-lg text-lg leading-relaxed text-blue-200/90">
                The central hub for field inspectors to photograph and submit
                utility pole and pad-mounted equipment records — powered by AI
                to analyze asset tags and vegetation coverage.
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-7 py-3.5 text-base font-bold text-black shadow-lg shadow-yellow-400/20 transition-all duration-150 hover:-translate-y-0.5 hover:bg-yellow-300 hover:shadow-xl hover:shadow-yellow-400/30 active:scale-[0.98]"
                >
                  Sign in to Portal
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                    />
                  </svg>
                </Link>

                <span className="text-sm text-blue-400">
                  Authorized personnel only
                </span>
              </div>
            </div>

            {/* Right: Live database preview */}
            <div className="flex-shrink-0 lg:w-[420px]">
              <div className="relative">
                {/* Glow behind card */}
                <div className="absolute -inset-4 rounded-3xl bg-blue-500/10 blur-2xl" />

                <div className="relative rounded-2xl border border-blue-700/40 bg-blue-900/50 p-5 shadow-2xl backdrop-blur-sm">
                  {/* Card header */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold uppercase tracking-widest text-blue-400">
                      Submission Database
                    </span>
                    <span className="rounded-full bg-blue-800/60 px-2.5 py-0.5 text-[10px] font-bold text-blue-300 ring-1 ring-blue-700/40">
                      {recordCount !== null ? `${recordCount} record${recordCount !== 1 ? "s" : ""}` : "—"}
                    </span>
                  </div>

                  {/* Mini table */}
                  <div className="overflow-hidden rounded-xl border border-blue-700/30">
                    <div className="grid grid-cols-[1fr_68px_68px_52px] gap-1 bg-blue-800/50 px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-blue-500">
                      <span>Tag #</span>
                      <span>Pole</span>
                      <span>Pad</span>
                      <span>Flags</span>
                    </div>
                    {(
                      [
                        { tag: "POLE-2347", pole: "Good",      pad: "Good", flags: [] as string[]             },
                        { tag: "POLE-1892", pole: "Fair",      pad: "Poor", flags: ["review"] as string[]     },
                        { tag: "POLE-2301", pole: "Excellent", pad: "Good", flags: ["vegetation"] as string[] },
                        { tag: "POLE-2088", pole: "Critical",  pad: "Fair", flags: ["review"] as string[]     },
                      ]
                    ).map((row, i) => {
                      const condColor: Record<string, string> = {
                        Excellent: "bg-green-500/20 text-green-400",
                        Good:      "bg-blue-500/20 text-blue-300",
                        Fair:      "bg-yellow-500/20 text-yellow-400",
                        Poor:      "bg-orange-500/20 text-orange-400",
                        Critical:  "bg-red-500/20 text-red-400",
                      };
                      return (
                        <div
                          key={i}
                          className={`grid grid-cols-[1fr_68px_68px_52px] gap-1 items-center border-t border-blue-700/20 px-3 py-2.5 ${i === 0 ? "bg-blue-700/20" : ""}`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            {i === 0 && (
                              <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-yellow-400" />
                            )}
                            <span className="truncate font-mono text-[11px] font-semibold text-white">
                              {row.tag}
                            </span>
                          </div>
                          <span className={`rounded-full px-1.5 py-0.5 text-center text-[9px] font-bold ${condColor[row.pole]}`}>
                            {row.pole}
                          </span>
                          <span className={`rounded-full px-1.5 py-0.5 text-center text-[9px] font-bold ${condColor[row.pad]}`}>
                            {row.pad}
                          </span>
                          <div className="flex gap-0.5">
                            {row.flags.includes("vegetation") && (
                              <span className="rounded-full bg-green-900/50 px-1.5 py-0.5 text-[9px] font-bold text-green-300 ring-1 ring-green-700/30">🌿</span>
                            )}
                            {row.flags.includes("review") && (
                              <span className="rounded-full bg-purple-900/50 px-1.5 py-0.5 text-[9px] font-bold text-purple-300 ring-1 ring-purple-700/30">🔍</span>
                            )}
                            {row.flags.length === 0 && (
                              <span className="text-[9px] text-blue-700">—</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Expanded detail preview */}
                  <div className="mt-3 rounded-xl border border-blue-700/30 bg-blue-800/30 px-3 py-2.5">
                    <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-blue-500">
                      POLE-2347 · Detail View
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {(
                        [
                          { label: "Pole",       value: "Good", cls: "text-blue-300" },
                          { label: "Pad",        value: "Good", cls: "text-blue-300" },
                          { label: "Vegetation", value: "No",   cls: "text-blue-400" },
                        ]
                      ).map((d) => (
                        <div key={d.label} className="rounded-lg bg-blue-900/50 px-1 py-1.5">
                          <p className="text-[8px] uppercase tracking-wider text-blue-500">{d.label}</p>
                          <p className={`mt-0.5 text-xs font-bold ${d.cls}`}>{d.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-3 flex items-center gap-1.5 text-[10px] text-blue-500">
                    <svg
                      className="h-3 w-3 text-yellow-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm3.707 5.707a1 1 0 00-1.414-1.414L9 9.586 7.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                    </svg>
                    Live sync · click any record to view full report
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features Section ─────────────────────────────────────── */}
      <section className="border-b border-gray-100 bg-gray-50/60 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-blue-950 sm:text-4xl">
              Built for the field
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base text-blue-900/70">
              Every feature designed around the workflow of utility field
              inspectors.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
                  />
                </svg>
              }
              title="Multi-Photo Capture"
              description="Upload tag close-ups, overview, base, and pad-mounted photos — organized per inspection."
            />
            <FeatureCard
              icon={
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
                  />
                </svg>
              }
              title="Cloud Database"
              description="All submissions stored in DynamoDB with search, filtering, and full inspection history per asset."
            />
            <FeatureCard
              icon={
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5"
                  />
                </svg>
              }
              title="Status Flags"
              description="Mark equipment as OK, Damaged, Needs Review, Replaced, or Missing — visible at a glance in the database."
            />
            <FeatureCard
              icon={
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                  />
                </svg>
              }
              title="Secure Access"
              description="Role-based authentication. Admin-managed accounts with no public sign-up."
            />
            <FeatureCard
              icon={
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z"
                  />
                </svg>
              }
              title="S3 Photo Storage"
              description="Photos upload directly to AWS S3 with presigned URLs — fast, secure, and scalable."
            />
            <FeatureCard
              icon={
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
                  />
                </svg>
              }
              title="AI-Powered Analysis"
              description="Automatic tag number detection and vegetation coverage assessment from uploaded photos."
            />
          </div>
        </div>
      </section>

      {/* ── Stats Bar ────────────────────────────────────────────── */}
      <section className="border-b border-blue-100 bg-white py-12">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-16 gap-y-8 px-6">
          <Stat value="4" label="Photo categories per inspection" />
          <div className="hidden h-10 w-px bg-blue-100 sm:block" />
          <Stat value="5" label="Equipment status flags" />
          <div className="hidden h-10 w-px bg-blue-100 sm:block" />
          <Stat value="100%" label="Cloud-backed storage" />
          <div className="hidden h-10 w-px bg-blue-100 sm:block" />
          <Stat value="24/7" label="Access from any device" />
        </div>
      </section>

      {/* ── Footer CTA ───────────────────────────────────────────── */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-blue-950 sm:text-3xl">
            Ready to start an inspection?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-blue-900/60">
            Sign in to access the submission portal and database.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-blue-900 px-8 py-3.5 text-base font-bold text-white shadow-lg transition-all duration-150 hover:-translate-y-0.5 hover:bg-blue-800 hover:shadow-xl active:scale-[0.98]"
          >
            Go to Login
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 bg-gray-50 py-8">
        <div className="mx-auto max-w-6xl px-6 text-center text-sm text-gray-400">
          PolePadAI — Internal utility inspection platform. Authorized
          access only.
        </div>
      </footer>
    </main>
  );
}

/* ── Sub-components (server, zero client JS) ──────────────────── */

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-2xl border border-gray-100 bg-white p-7 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-blue-200">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700 transition-colors group-hover:bg-blue-100">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-bold text-blue-950">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-blue-900/60">
        {description}
      </p>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="text-3xl font-extrabold tracking-tight text-blue-950">
        {value}
      </p>
      <p className="mt-1 text-sm text-blue-900/50">{label}</p>
    </div>
  );
}
