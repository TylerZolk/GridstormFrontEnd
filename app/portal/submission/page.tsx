import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import SubmissionClient from "./submissionclient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SubmissionPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="rounded-3xl bg-white p-10 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-blue-950">
              Submission
            </h1>
            <p className="mt-2 text-blue-900/80">
              Upload site photo sets below.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-blue-900">Role</span>
            <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-900 ring-1 ring-blue-200">
              {user.role}
            </span>
          </div>
        </div>

        <SubmissionClient />
      </div>
    </main>
  )
};