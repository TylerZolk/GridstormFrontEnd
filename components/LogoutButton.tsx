"use client";

export default function LogoutButton() {

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <button
      onClick={handleLogout}
      className="rounded-xl bg-yellow-400 px-6 py-3 text-base font-bold text-black shadow-sm transition-all duration-150 hover:bg-yellow-300 hover:shadow-md active:scale-[0.98] cursor-pointer"
    >
      Log out
    </button>
  );
}