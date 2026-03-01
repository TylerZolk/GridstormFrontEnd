// app/api/submissions/upload-photos/route.ts
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

export const maxDuration = 60; // allow time for large photo uploads

export async function POST(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Check token exists before trying to import the blob library
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { ok: false, error: "BLOB_READ_WRITE_TOKEN is not configured. Please add a Vercel Blob store in your project." },
        { status: 500 }
      );
    }

    // Dynamic import so a missing token doesn't crash at module load time
    const { put } = await import("@vercel/blob");

    const formData = await req.formData();
    const urls: Record<string, string[]> = { tag: [], overview: [], base: [], pad: [] };

    for (const category of ["tag", "overview", "base", "pad"] as const) {
      const files = formData.getAll(category) as File[];
      for (const file of files) {
        if (!(file instanceof File) || file.size === 0) continue;
        const ext = file.name.split(".").pop() ?? "jpg";
        const filename = `submissions/${session.username}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${category}.${ext}`;
        const blob = await put(filename, file, {
          access: "public",
          contentType: file.type || "image/jpeg",
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