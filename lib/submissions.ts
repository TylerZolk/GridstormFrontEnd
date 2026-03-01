// lib/submissions.ts
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export type SubmissionFlag = "processing" | "vegetation" | "review";

export type Submission = {
  id: string;
  createdAt: number;
  submittedBy: string;
  tagNumber: string;
  poleCondition: string;
  padCondition: string;
  overviewNotes: string;
  baseNotes: string;
  vegetationEncroachment: boolean;
  flags: SubmissionFlag[];
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
  const results = await Promise.all(ids.map((id) => redis.get<string>(`submission:${id}`)));
  return results
    .filter((s): s is string => s !== null)
    .map((s) => (typeof s === "string" ? JSON.parse(s) : s) as Submission);
}

export async function updateSubmissionFlags(id: string, flags: SubmissionFlag[]): Promise<void> {
  const raw = await redis.get<string>(`submission:${id}`);
  if (!raw) throw new Error("Submission not found");
  const submission: Submission = typeof raw === "string" ? JSON.parse(raw) : raw;
  submission.flags = flags;
  await redis.set(`submission:${id}`, JSON.stringify(submission));
}