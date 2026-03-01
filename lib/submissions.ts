// lib/submissions.ts
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

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
  await redis.set(`submission:${submission.id}`, JSON.stringify(submission));
  await redis.zadd(INDEX_KEY, { score: submission.createdAt, member: submission.id });
}

export async function listSubmissions(): Promise<Submission[]> {
  // newest first
  const ids = await redis.zrange(INDEX_KEY, 0, -1, { rev: true });
  if (!ids || ids.length === 0) return [];

  const results = await Promise.all(
    ids.map((id) => redis.get<string>(`submission:${id}`))
  );

  return results
    .filter((s): s is string => s !== null)
    .map((s) => (typeof s === "string" ? JSON.parse(s) : s) as Submission);
}


