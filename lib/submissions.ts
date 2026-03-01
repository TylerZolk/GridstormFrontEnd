// lib/submissions.ts
import { kv } from "@vercel/kv";

export type Submission = {
  id: string;
  createdAt: number; // unix ms
  submittedBy: string;
  tagNumber: string;
  poleCondition: string;
  padCondition: string;
  overviewNotes: string;
  baseNotes: string;
  confidence: number;
  fileCounts: {
    tag: number;
    overview: number;
    base: number;
    pad: number;
  };
};

const INDEX_KEY = "submissions:index";

export async function saveSubmission(submission: Submission): Promise<void> {
  await kv.set(`submission:${submission.id}`, submission);
  await kv.zadd(INDEX_KEY, { score: submission.createdAt, member: submission.id });
}

export async function listSubmissions(): Promise<Submission[]> {
  // newest first
  const ids = await kv.zrange(INDEX_KEY, 0, -1, { rev: true });
  if (!ids || ids.length === 0) return [];

  const results = await Promise.all(
    ids.map((id) => kv.get<Submission>(`submission:${id}`))
  );

  return results.filter((s): s is Submission => s !== null);
}


