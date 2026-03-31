import "server-only";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function makeClient() {
  return new S3Client({
    region: process.env.AWS_APP_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_APP_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_APP_SECRET_ACCESS_KEY!,
    },
  });
}

let _client: S3Client | null = null;
function getS3() {
  if (!_client) _client = makeClient();
  return _client;
}

const BUCKET = () => process.env.S3_BUCKET_NAME!;

/** Upload a buffer/stream to S3 and return a presigned view URL (7-day expiry). */
export async function uploadAndSign(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  await getS3().send(
    new PutObjectCommand({
      Bucket: BUCKET(),
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  return getSignedUrl(
    getS3(),
    new GetObjectCommand({ Bucket: BUCKET(), Key: key }),
    { expiresIn: 7 * 24 * 3600 } // 7 days
  );
}
