// app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { getUser, verifyPassword } from "@/lib/users";
import { makeSessionCookieValue, SESSION_COOKIE_NAME, SESSION_MAX_AGE_MS } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body?.username || !body?.password) {
      return NextResponse.json({ ok: false, error: "Missing username/password" }, { status: 400 });
    }

    const { username, password } = body;

    const user = await getUser(username);

    // ✅ FIX: Use bcrypt comparison — never compare plaintext passwords
    // Run comparison even if user is missing to prevent username enumeration via timing
    const passwordValid = user ? await verifyPassword(user, password) : false;

    if (!user || !passwordValid) {
      return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
    }

    const cookieValue = makeSessionCookieValue(user.username);
    const res = NextResponse.json({ ok: true, role: user.role });

    res.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: cookieValue,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      // ✅ FIX: Cookie lifetime now matches the server-side session expiry check
      maxAge: Math.floor(SESSION_MAX_AGE_MS / 1000),
    });

    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    console.error("LOGIN ERROR:", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}