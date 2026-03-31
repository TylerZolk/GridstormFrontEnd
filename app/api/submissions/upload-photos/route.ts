import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { uploadAndSign } from "@/lib/aws/s3";

export const maxDuration = 10;
export const dynamic = "force-dynamic";

const CATEGORIES = ["tag", "overview", "base", "pad"] as const;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const urls: Record<string, string[]> = { tag: [], overview: [], base: [], pad: [] };

    for (const category of CATEGORIES) {
      const files = formData.getAll(category) as File[];
      for (const file of files) {
        if (!(file instanceof File) || file.size === 0) continue;
        if (file.size > MAX_FILE_SIZE) {
          return NextResponse.json(
            { ok: false, error: `File ${file.name} exceeds 10 MB limit` },
            { status: 400 }
          );
        }
        const contentType = file.type || "image/jpeg";
        if (!ALLOWED_TYPES.has(contentType)) {
          return NextResponse.json(
            { ok: false, error: `File type ${contentType} is not allowed` },
            { status: 400 }
          );
        }
        const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
        const key = `submissions/${session.username}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 6)}-${category}.${ext}`;
        const buffer = Buffer.from(await file.arrayBuffer());
        const url = await uploadAndSign(key, buffer, file.type || "image/jpeg");
        urls[category].push(url);
      }
    }

    return NextResponse.json({ ok: true, urls });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[upload-photos] error:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
