// app/api/submissions/list/route.ts
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { listSubmissions } from "@/lib/submissions";

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const submissions = await listSubmissions();

  return NextResponse.json({ ok: true, submissions });
}