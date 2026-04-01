import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

export default async function Home() {
  const user = await getSessionUser();
  if (user) {
    redirect("/portal");
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-14 bg-white">
      <div className="rounded-3xl border bg-white p-10 shadow-sm">
        <h1 className="text-4xl font-bold tracking-tight text-blue-900">
          Welcome to PolePadAI
        </h1>

        <p className="mt-3 text-blue-800 max-w-2xl leading-relaxed">
          The central hub for field inspectors to photograph and submit utility pole and pad-mounted equipment records. 
          Powered by AI to automatically analyze photos for asset tags and vegetation coverage.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-xl bg-yellow-400 px-5 py-3 font-semibold text-black hover:bg-yellow-300 transition"
          >
            Login
          </Link>
        </div>
      </div>
    </main>
  );
}