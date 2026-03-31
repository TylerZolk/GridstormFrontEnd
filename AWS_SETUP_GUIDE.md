# PolepadAI — AWS Integration Setup Guide

## Architecture Overview

```
Browser
  │
  ├─ Upload photos ──► S3 (via presigned PUT URLs)
  │
  └─ Submit form ──► Vercel (Next.js API Routes)
                        │
                        ├─ Generate presigned URLs ──► S3
                        └─ Save metadata ──► DynamoDB
```

**Key design decisions:**
- Photos upload directly from browser → S3 (no Vercel bandwidth cost)
- DynamoDB stores metadata only (tag, flags, notes, S3 keys, author, date)
- IAM user scoped to only the specific table + bucket
- CDK manages all infrastructure as code

---

## Prerequisites

1. **AWS CLI** configured with admin credentials (`aws configure`)
2. **Node.js 20+**
3. **AWS CDK CLI**: `npm install -g aws-cdk`
4. If first time using CDK in this account/region: `cdk bootstrap`

---

## Step 1: Deploy AWS Infrastructure

```bash
cd infra
npm install
cdk deploy
```

CDK will show you the resources it's creating and ask for confirmation.
After deployment, it outputs:

| Output            | What it is                          |
|-------------------|-------------------------------------|
| `TableName`       | DynamoDB table name                 |
| `BucketName`      | S3 bucket name                      |
| `AccessKeyId`     | IAM access key for Vercel           |
| `SecretAccessKey`  | IAM secret key for Vercel           |
| `Region`          | AWS region                          |

**Save these values** — you need them for Step 2.

---

## Step 2: Configure Vercel Environment Variables

In your Vercel project dashboard → Settings → Environment Variables, add:

| Variable                    | Value (from CDK output)            |
|-----------------------------|------------------------------------|
| `SESSION_SECRET`            | (your existing session secret)     |
| `AWS_APP_REGION`            | `Region` output                    |
| `AWS_APP_ACCESS_KEY_ID`     | `AccessKeyId` output               |
| `AWS_APP_SECRET_ACCESS_KEY` | `SecretAccessKey` output           |
| `DYNAMODB_TABLE_NAME`       | `TableName` output                 |
| `S3_BUCKET_NAME`            | `BucketName` output                |

> **Note:** We use `AWS_APP_*` instead of `AWS_*` because Vercel reserves
> the `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` names internally.

For local development, create a `.env.local` file:
```bash
cp .env.example .env.local
# Fill in the values from CDK output
```

---

## Step 3: Install AWS SDK Dependencies

```bash
cd dominion-front
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb \
            @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

---

## Step 4: Add the New Files

Copy the new/modified files into your project:

### New files to add:
```
dominion-front/
├── lib/aws/
│   ├── dynamodb.ts          # DynamoDB client + CRUD operations
│   └── s3.ts                # S3 presigned URL generation
├── app/api/submissions/
│   ├── route.ts             # GET (list) + POST (create) submissions
│   └── presign/
│       └── route.ts         # POST to get presigned upload URLs
├── app/portal/submission/
│   ├── page.tsx             # Updated submission page
│   └── parts/
│       └── SubmissionForm.tsx  # Client form with S3 upload
└── app/portal/database/
    ├── page.tsx             # Updated database page
    └── parts/
        └── SubmissionsTable.tsx  # Client table with search/pagination
```

---

## Step 5: Deploy & Test

```bash
# Local testing
npm run dev

# Deploy to Vercel
git add .
git commit -m "feat: add AWS DynamoDB + S3 integration"
git push
```

---

## DynamoDB Table Schema

| Attribute      | Type   | Role            |
|----------------|--------|-----------------|
| `tagNumber`    | String | Partition Key   |
| `submittedAt`  | String | Sort Key (ISO)  |
| `submittedBy`  | String | GSI PK          |
| `flags`        | List   | e.g. ["Damaged"]|
| `overviewNotes`| String | Free text       |
| `photos`       | Map    | S3 key references|

**Access patterns supported:**
- Get all submissions for a tag (sorted by date) → Query on PK
- List all submissions → Scan with pagination
- Get submissions by author → Query on `byAuthor` GSI

---

## S3 Bucket Structure

```
submissions/
  └── {tagNumber}/
      └── {submittedAt}/
          ├── tagCloseUp/
          │   └── photo.jpg
          ├── overview/
          │   ├── photo1.jpg
          │   └── photo2.jpg
          ├── base/
          │   └── photo1.jpg
          └── padMounted/
              └── photo1.jpg
```

---

## Security Notes

- The IAM user has **minimum permissions** — only the specific table and bucket
- S3 bucket has **all public access blocked**
- Photos are accessed only via **presigned URLs** (time-limited)
- All API routes check for an authenticated session before proceeding
- Presigned upload URLs expire after **10 minutes**
- Presigned view URLs expire after **1 hour**

---

## Tightening for Production

1. **S3 CORS**: Replace `"*"` origin with your Vercel domain in `infra/lib/stack.ts`
2. **Rate limiting**: Add rate limiting to the presign endpoint
3. **File size limits**: Add `ContentLengthRange` conditions to presigned URLs
4. **Monitoring**: Add CloudWatch alarms on DynamoDB throttling + S3 errors
5. **Backup**: Enable DynamoDB Point-in-Time Recovery in the CDK stack
