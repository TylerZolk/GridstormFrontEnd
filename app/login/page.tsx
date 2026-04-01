"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setErr(null);
    setLoading(true);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s safety

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        signal: controller.signal,
      });

      const raw = await res.text(); // ✅ never hangs
      let data: any = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        data = null;
      }

      if (!res.ok) {
        setErr(data?.error || raw || `Login failed (${res.status})`);
        return;
      }

      // If server forgot to send role, default to portal
      const role = data?.role;
      router.push(role === "admin" ? "/admin" : "/portal");
      router.refresh();
    } catch (e: any) {
      setErr(e?.name === "AbortError" ? "Login timed out." : (e?.message || "Network error"));
    } finally {
      clearTimeout(timeout);
      setLoading(false); // ✅ ALWAYS stops "Signing in..."
    }
  }

  return (
    <main className="relative min-h-[calc(100vh-80px)] flex items-center justify-center bg-blue-950 overflow-hidden px-4 py-16">
      {/* Subtle grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Yellow accent line at top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400" />

      {/* Ambient glow */}
      <div className="absolute inset-x-0 top-1/3 h-64 bg-blue-500/5 blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-700/50 bg-blue-900/60 px-4 py-1.5 text-sm font-medium text-blue-200 backdrop-blur-sm">
          <span className="h-2 w-2 rounded-full bg-yellow-400" />
          Authorized Personnel Only
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-blue-700/40 bg-blue-900/50 p-8 shadow-2xl backdrop-blur-sm">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Sign in</h1>
          <p className="mt-2 text-sm text-blue-200/80">
            Enter your credentials to access the portal.
          </p>

          <form onSubmit={onSubmit} className="mt-7 space-y-5">
            <div>
              <label className="text-sm font-semibold text-blue-200">Username</label>
              <input
                className="mt-1.5 w-full rounded-xl border border-blue-700/50 bg-blue-800/50 px-4 py-2.5 text-white placeholder:text-blue-500 outline-none transition focus:border-yellow-400/50 focus:ring-2 focus:ring-yellow-400/20"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                placeholder="Enter username"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-blue-200">Password</label>
              <input
                type="password"
                className="mt-1.5 w-full rounded-xl border border-blue-700/50 bg-blue-800/50 px-4 py-2.5 text-white placeholder:text-blue-500 outline-none transition focus:border-yellow-400/50 focus:ring-2 focus:ring-yellow-400/20"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Enter password"
              />
            </div>

            {err && (
              <div className="rounded-xl border border-red-500/30 bg-red-900/30 px-4 py-2.5 text-sm text-red-300">
                {err}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-yellow-400 px-4 py-3 font-bold text-black shadow-lg shadow-yellow-400/20 transition-all duration-150 hover:-translate-y-0.5 hover:bg-yellow-300 hover:shadow-xl hover:shadow-yellow-400/30 active:scale-[0.98] disabled:opacity-60 cursor-pointer"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>

            <p className="text-xs text-blue-500">
              No sign-up. Accounts are created by an administrator.
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
