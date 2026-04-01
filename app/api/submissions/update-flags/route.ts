import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { updateSubmissionFlags, SubmissionFlag } from "@/lib/submissions";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, flags } = await req.json();

    if (!id || !Array.isArray(flags)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Ensure they are valid flags
    const validFlags = ["processing", "vegetation", "review"];
    const filteredFlags = flags.filter((f: any) => validFlags.includes(f)) as SubmissionFlag[];

    await updateSubmissionFlags(id, filteredFlags);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating submission flags:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
