// app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  // ✅ FIX: Was missing `await` — getSessionUser() is async and returned a
  // Promise instead of the user, which is always truthy, bypassing the auth check
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });
  }

  return NextResponse.json({ ok: true, username: user.username, role: user.role });
}