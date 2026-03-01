"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <button
      onClick={handleLogout}
      className="rounded-xl bg-yellow-400 px-6 py-3 text-base font-bold text-black shadow-sm transition-all duration-150 hover:bg-yellow-300 hover:shadow-md active:scale-[0.98]"
    >
      Log out
    </button>
  );
}