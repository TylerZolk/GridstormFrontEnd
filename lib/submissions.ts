// lib/submissions.ts
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export type SubmissionFlag = "processing" | "vegetation" | "mismatch" | "review";

export type Submission = {
  id: string;
  createdAt: number; // unix ms
  submittedBy: string;

  // AI-extracted fields
  tagNumber: string;
  poleCondition: string;
  padCondition: string;
  overviewNotes: string;
  baseNotes: string;
  vegetationEncroachment: boolean;

  // Flags (multiple allowed)
  flags: SubmissionFlag[];

  // Internal AI confidence (used to auto-set mismatch flag, not displayed)
  aiConfidence: number;

  // Photo URLs stored in Vercel Blob
  photoUrls: {
    tag: string[];
    overview: string[];
    base: string[];
    pad: string[];
  };
};

const INDEX_KEY = "submissions:index";

export async function saveSubmission(submission: Submission): Promise<void> {
  await redis.set(`submission:${submission.id}`, JSON.stringify(submission));
  await redis.zadd(INDEX_KEY, { score: submission.createdAt, member: submission.id });
}

export async function listSubmissions(): Promise<Submission[]> {
  const ids = await redis.zrange(INDEX_KEY, 0, -1, { rev: true });
  if (!ids || ids.length === 0) return [];

  const results = await Promise.all(
    ids.map((id) => redis.get<string>(`submission:${id}`))
  );

  return results
    .filter((s): s is string => s !== null)
    .map((s) => (typeof s === "string" ? JSON.parse(s) : s) as Submission);
}

export async function updateSubmissionFlags(
  id: string,
  flags: SubmissionFlag[]
): Promise<void> {
  const raw = await redis.get<string>(`submission:${id}`);
  if (!raw) throw new Error("Submission not found");
  const submission: Submission = typeof raw === "string" ? JSON.parse(raw) : raw;
  submission.flags = flags;
  await redis.set(`submission:${id}`, JSON.stringify(submission));
}