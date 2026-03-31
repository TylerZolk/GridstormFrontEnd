import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getPresignedPutUrl, getPresignedGetUrl } from "@/lib/aws/s3";

export const dynamic = "force-dynamic";

type FileRequest = {
  category: string;
  contentType: string;
  filename: string;
};

const ALLOWED_CATEGORIES = new Set(["tag", "overview", "base", "pad"]);
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body?.files || !Array.isArray(body.files)) {
      return NextResponse.json(
        { ok: false, error: "Invalid body — expected { files: [...] }" },
        { status: 400 }
      );
    }

    const files = body.files as FileRequest[];

    if (files.length === 0) {
      return NextResponse.json({ ok: true, uploads: [] });
    }

    const uploads: { category: string; key: string; putUrl: string; getUrl: string }[] = [];

    for (const file of files) {
      if (!ALLOWED_CATEGORIES.has(file.category)) {
        return NextResponse.json(
          { ok: false, error: `Invalid category: ${file.category}` },
          { status: 400 }
        );
      }
      if (!ALLOWED_TYPES.has(file.contentType)) {
        return NextResponse.json(
          { ok: false, error: `Invalid content type: ${file.contentType}` },
          { status: 400 }
        );
      }

      const ext =
        file.contentType === "image/png"
          ? "png"
          : file.contentType === "image/webp"
            ? "webp"
            : "jpg";

      const key = `submissions/${session.username}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 6)}-${file.category}.${ext}`;

      const [putUrl, getUrl] = await Promise.all([
        getPresignedPutUrl(key, file.contentType),
        getPresignedGetUrl(key),
      ]);

      uploads.push({ category: file.category, key, putUrl, getUrl });
    }

    return NextResponse.json({ ok: true, uploads });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[presign] error:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
