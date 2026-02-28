"use client";

import Image from "next/image";
import Link from "next/link";

export default function Header() {
  return (
    <header className="w-full bg-blue-900 text-white shadow-md">
      <div className="mx-auto max-w-6xl px-8 py-5 flex items-center justify-between">
        
        {/* LEFT SIDE - LOGO + BRAND */}
        <Link href="/" className="flex items-center gap-5">
          <Image
            src="/logo.svg"
            alt="POLEPADAI"
            width={80}        // 🔥 Larger logo
            height={80}
            priority
            className="object-contain"
          />
          <span className="text-3xl font-bold tracking-tight">
            PolePadAI
          </span>
        </Link>

        {/* RIGHT SIDE - LOGIN BUTTON */}
        <Link
          href="/login"
          className="rounded-xl bg-yellow-400 px-8 py-3 text-lg font-semibold text-black hover:bg-yellow-300 transition"
        >
          Login
        </Link>
      </div>
    </header>
  );
}