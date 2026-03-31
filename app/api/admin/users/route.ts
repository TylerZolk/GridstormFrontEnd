import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { listUsers } from "@/lib/users";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSessionUser();

  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const users = await listUsers();
  return NextResponse.json({ ok: true, users });
}
