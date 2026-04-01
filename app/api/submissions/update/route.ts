import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { updateSubmissionDetails, type SubmissionFlag } from "@/lib/submissions";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    if (!body || !body.id) return NextResponse.json({ ok: false, error: "Invalid body or missing id" }, { status: 400 });

    const { id, poleCondition, padCondition, vegetationEncroachment, flags, overviewNotes, baseNotes } = body;

    const updates: any = {};
    if (poleCondition !== undefined) updates.poleCondition = poleCondition;
    if (padCondition !== undefined) updates.padCondition = padCondition;
    if (vegetationEncroachment !== undefined) updates.vegetationEncroachment = vegetationEncroachment;
    if (flags !== undefined) updates.flags = flags as SubmissionFlag[];
    if (overviewNotes !== undefined) updates.overviewNotes = overviewNotes;
    if (baseNotes !== undefined) updates.baseNotes = baseNotes;

    await updateSubmissionDetails(id, updates);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[submissions/update] error:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
