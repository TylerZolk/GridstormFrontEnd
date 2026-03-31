import "server-only";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

function makeClient() {
  return DynamoDBDocumentClient.from(
    new DynamoDBClient({
      region: process.env.AWS_APP_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_APP_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_APP_SECRET_ACCESS_KEY!,
      },
    })
  );
}

// Lazily created so env vars are read at request time (not module load)
let _client: DynamoDBDocumentClient | null = null;
export function getDdbClient() {
  if (!_client) _client = makeClient();
  return _client;
}
