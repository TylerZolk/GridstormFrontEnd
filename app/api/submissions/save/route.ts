import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { saveSubmission, type Submission, type SubmissionFlag } from "@/lib/submissions";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });

    const flags: SubmissionFlag[] = [];
    if (body.vegetationEncroachment === true) flags.push("vegetation");
    if (Array.isArray(body.extraFlags)) {
      for (const f of body.extraFlags as string[]) {
        if (f === "review" && !flags.includes("review")) flags.push("review");
      }
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
      vegetationEncroachment: body.vegetationEncroachment ?? false,
      flags,
      photoUrls: {
        tag: body.photoUrls?.tag ?? [],
        overview: body.photoUrls?.overview ?? [],
        base: body.photoUrls?.base ?? [],
        pad: body.photoUrls?.pad ?? [],
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
