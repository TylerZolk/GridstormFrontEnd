// app/api/admin/add-user/route.ts
import { NextResponse } from "next/server";
import { addUser } from "@/lib/users";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getSessionUser();

  if (!session || session.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { username, password } = await req.json();

  try {
    await addUser(username, password); // ← was missing await
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to create user";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}