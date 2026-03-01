// app/api/submissions/save/route.ts
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { saveSubmission, type Submission } from "@/lib/submissions";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
    }

    const submission: Submission = {
      id: randomUUID(),
      createdAt: Date.now(),
      submittedBy: session.username,
      tagNumber: body.tagNumber ?? "",
      poleCondition: body.poleCondition ?? "",
      padCondition: body.padCondition ?? "",
      overviewNotes: body.overviewNotes ?? "",
      baseNotes: body.baseNotes ?? "",
      confidence: body.confidence ?? 0,
      fileCounts: {
        tag: body.fileCounts?.tag ?? 0,
        overview: body.fileCounts?.overview ?? 0,
        base: body.fileCounts?.base ?? 0,
        pad: body.fileCounts?.pad ?? 0,
      },
    };

    await saveSubmission(submission);

    return NextResponse.json({ ok: true, id: submission.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[submissions/save] error:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}