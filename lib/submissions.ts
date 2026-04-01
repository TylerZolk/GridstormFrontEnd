import "server-only";
import {
  PutCommand,
  ScanCommand,
  UpdateCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { getDdbClient } from "./aws/dynamodb";

const TABLE = () => process.env.DYNAMODB_TABLE_NAME!;

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

// DynamoDB key schema: tagNumber (PK) + submittedAt (SK, ISO string)
// All other Submission fields stored as regular attributes.

export async function saveSubmission(submission: Submission): Promise<void> {
  const submittedAt = new Date(submission.createdAt).toISOString();
  await getDdbClient().send(
    new PutCommand({
      TableName: TABLE(),
      Item: { ...submission, submittedAt },
    })
  );
}

export async function listSubmissions(): Promise<Submission[]> {
  const result = await getDdbClient().send(
    new ScanCommand({ TableName: TABLE() })
  );
  const items = (result.Items ?? []) as Submission[];
  return items.sort((a, b) => b.createdAt - a.createdAt);
}

export async function updateSubmissionFlags(
  id: string,
  flags: SubmissionFlag[]
): Promise<void> {
  // Scan to find the DynamoDB composite key for this submission id
  const result = await getDdbClient().send(
    new ScanCommand({
      TableName: TABLE(),
      FilterExpression: "id = :id",
      ExpressionAttributeValues: { ":id": id },
    })
  );
  const item = result.Items?.[0] as
    | (Submission & { submittedAt: string })
    | undefined;
  if (!item) throw new Error(`Submission ${id} not found`);

  await getDdbClient().send(
    new UpdateCommand({
      TableName: TABLE(),
      Key: { tagNumber: item.tagNumber, submittedAt: item.submittedAt },
      UpdateExpression: "SET flags = :flags",
      ExpressionAttributeValues: { ":flags": flags },
    })
  );
}

export async function getLatestSubmissionByTag(
  tagNumber: string
): Promise<Submission | null> {
  const result = await getDdbClient().send(
    new QueryCommand({
      TableName: TABLE(),
      KeyConditionExpression: "tagNumber = :tag",
      ExpressionAttributeValues: { ":tag": tagNumber },
      ScanIndexForward: false, // Descending order (newest first)
      Limit: 1,
    })
  );
  return (result.Items?.[0] as Submission) || null;
}

export async function updateSubmissionDetails(
  id: string,
  updates: Partial<Omit<Submission, "id" | "createdAt" | "submittedAt">>
): Promise<void> {
  const result = await getDdbClient().send(
    new ScanCommand({
      TableName: TABLE(),
      FilterExpression: "id = :id",
      ExpressionAttributeValues: { ":id": id },
    })
  );
  const item = result.Items?.[0] as
    | (Submission & { submittedAt: string })
    | undefined;
  if (!item) throw new Error(`Submission ${id} not found`);

  const expressionAttributeValues: Record<string, any> = {};
  const expressionAttributeNames: Record<string, string> = {};
  const updateExpressions: string[] = [];

  for (const [key, value] of Object.entries(updates)) {
    expressionAttributeValues[`:${key}`] = value;
    expressionAttributeNames[`#${key}`] = key;
    updateExpressions.push(`#${key} = :${key}`);
  }

  if (updateExpressions.length === 0) return;

  await getDdbClient().send(
    new UpdateCommand({
      TableName: TABLE(),
      Key: { tagNumber: item.tagNumber, submittedAt: item.submittedAt },
      UpdateExpression: `SET ${updateExpressions.join(", ")}`,
      ExpressionAttributeValues: expressionAttributeValues,
      ExpressionAttributeNames: expressionAttributeNames,
    })
  );
}
