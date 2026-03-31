import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { listSubmissions } from "@/lib/submissions";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    const submissions = await listSubmissions();
    return NextResponse.json({ ok: true, submissions });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}




