// app/api/submissions/upload-photos/route.ts
// Uploads photos to Vercel Blob and returns their URLs.
// Call this BEFORE /api/submissions/save.
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const urls: Record<string, string[]> = { tag: [], overview: [], base: [], pad: [] };

    for (const category of ["tag", "overview", "base", "pad"] as const) {
      const files = formData.getAll(category) as File[];
      for (const file of files) {
        if (!(file instanceof File)) continue;
        const ext = file.name.split(".").pop() ?? "jpg";
        const filename = `submissions/${session.username}/${Date.now()}-${category}.${ext}`;
        const blob = await put(filename, file, {
          access: "public",
          contentType: file.type,
        });
        urls[category].push(blob.url);
      }
    }

    return NextResponse.json({ ok: true, urls });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[upload-photos] error:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}