import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getLatestSubmissionByTag } from "@/lib/submissions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tag = req.nextUrl.searchParams.get("tag");
  if (!tag) {
    return NextResponse.json({ error: "Missing tag parameter" }, { status: 400 });
  }

  try {
    const submission = await getLatestSubmissionByTag(tag);
    if (!submission) {
      return NextResponse.json({ submission: null });
    }
    return NextResponse.json({ submission });
  } catch (error) {
    console.error("Error fetching submission by tag:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
