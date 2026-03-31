import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
 
export const dynamic = "force-dynamic";
export const maxDuration = 10;
 
const POLEPAD_BASE = process.env.POLEPAD_URL;
 
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const session = await getSessionUser();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 
  if (!POLEPAD_BASE) {
    return NextResponse.json({ error: "POLEPAD_URL is not configured" }, { status: 503 });
  }

  const { path } = await params;
  const urlPath = "/" + path.join("/") + "/";
  const body = await req.formData();

  const upstream = await fetch(`${POLEPAD_BASE}${urlPath}`, {
    method: "POST",
    body,
  });
 
  const json = await upstream.json();
  return NextResponse.json(json, { status: upstream.status });
}