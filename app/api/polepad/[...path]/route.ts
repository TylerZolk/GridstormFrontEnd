import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const POLEPAD_BASE = process.env.POLEPAD_URL ?? "https://bell-sources-cement-disco.trycloudflare.com";

export async function POST(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const path = "/" + params.path.join("/") + "/";
  const body = await req.formData();

  const upstream = await fetch(`${POLEPAD_BASE}${path}`, {
    method: "POST",
    body,
  });

  const json = await upstream.json();
  return NextResponse.json(json, { status: upstream.status });
}