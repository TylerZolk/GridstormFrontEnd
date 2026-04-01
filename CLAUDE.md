# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from the project root (where `package.json` lives):

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
node scripts/create-admin-hash.mjs  # Generate bcrypt hash for ADMIN_PASSWORD_HASH env var
```

No test framework is configured.

---

## Architecture

This is a **Next.js App Router** application called **PolePadAI** — a role-based portal for field inspectors to photograph and submit utility pole / pad-mounted equipment inspection records. The PolePad AI backend analyses photos for asset tag IDs and vegetation coverage. All application source lives in the project root (not in a subdirectory).

---

## Authentication

Custom session-based auth (no NextAuth or similar):

- Login → `POST /api/auth/login` looks up the user in DynamoDB (`polepad-users` table), verifies the bcrypt password hash, then sets an HTTP-only cookie (`portal_session`).
- Cookie value is `base64url(payload).HMAC-SHA256(payload, SESSION_SECRET)`.
- `lib/auth.ts` owns session creation and validation via `getSessionUser()`.
- Sessions expire after **8 hours** (enforced in `getSessionUser()` via the `iat` claim).
- `SESSION_SECRET` env var is required at runtime (no fallback in production).
- Passwords are stored as **bcrypt hashes** in DynamoDB — never plaintext.

---

## Route Protection

Two client-side guard components wrap protected pages:

- `components/RequireAuth` — redirects to `/login` if no valid session.
- `components/RequireAdmin` — redirects to `/login` (unauthenticated) or `/portal` (authenticated non-admin).

`app/portal/layout.tsx` also applies auth checking at the layout level (server-side redirect).

---

## Data Layer — AWS (fully integrated)

All data is persisted to **AWS** — there is no local file store in production.

### DynamoDB Tables

Both tables are managed by the CDK stack in `infra/` and accessed via `lib/aws/dynamodb.ts`.

| Table | Env var | Purpose |
|---|---|---|
| `polepad-users` | `DYNAMODB_USERS_TABLE_NAME` | User accounts (PK: `username`) |
| `polepad-submissions` | `DYNAMODB_TABLE_NAME` | Inspection records (PK: `tagNumber`, SK: `submittedAt`) |

- `lib/users.ts` — DynamoDB CRUD for users (get, add, list, remove, verifyPassword). Lazily seeds the protected `Admin` account on first access using `ADMIN_PASSWORD_HASH`.
- `lib/submissions.ts` — DynamoDB CRUD for submissions (save, list, updateSubmissionFlags). A `byAuthor` GSI supports querying by `submittedBy`.

### S3 Bucket

- Bucket name set via `S3_BUCKET_NAME` env var.
- All public access is blocked. Photos are accessed only via **presigned URLs** (24-hour expiry).
- `lib/aws/s3.ts` — `uploadAndSign(key, buffer, contentType)` uploads a file and returns a presigned view URL.
- Photos are stored under the key path: `submissions/{username}/{timestamp}-{rand}-{category}.{ext}`.

### Submission Schema (`lib/submissions.ts`)

```ts
type Submission = {
  id: string;              // UUID
  createdAt: number;       // Unix ms
  submittedBy: string;     // username
  tagNumber: string;
  poleCondition: string;   // "Excellent"|"Good"|"Fair"|"Poor"|"Critical"
  padCondition: string;    // same options
  overviewNotes: string;
  baseNotes: string;
  vegetationEncroachment: boolean;
  flags: ("processing" | "vegetation" | "review")[];
  photoUrls: { tag: string[]; overview: string[]; base: string[]; pad: string[] };
};
```

---

## AI Integration — PolePad AI Backend

The submission flow calls an external **PolePad AI** service for computer-vision analysis. This is proxied through Next.js to avoid Cloudflare browser challenges.

- **Proxy route**: `app/api/polepad/[...path]/route.ts` — forwards authenticated POST requests to `POLEPAD_URL` (env var). Returns 503 if `POLEPAD_URL` is not set.
- **Tag endpoint**: `POST /api1/analyze-asset-tag/` — returns `asset_id`, `vegetation_percent`, `detection_status`, `image_base64` (annotated image).
- **Pole endpoint**: `POST /api2/analyze-pole/` — returns `vegetation_percent`, `flagged`, `detection_status`, `image_base64` (annotated image).
- The client-side fallback URL is the value of `NEXT_PUBLIC_POLEPAD_URL`; a hardcoded Cloudflare tunnel URL is used if that env var is not set. Set the env var for production.
- AI failures are **non-fatal**: the inspector is forwarded to the review screen with fallback values and can correct everything manually before saving.
- **Pad condition** has no AI endpoint — always defaults to `"Fair"`, must be corrected by the inspector.

---

## API Routes

All under `app/api/`:

| Route | Method | Description |
|---|---|---|
| `auth/login` | POST | Validate credentials, set session cookie |
| `auth/logout` | POST | Clear session cookie |
| `auth/me` | GET | Return current session user |
| `admin/users` | GET | List all users (admin only) |
| `admin/add-user` | POST | Create a new `user`-role account (admin only) |
| `admin/remove-user` | POST | Delete a user by username (admin only; protected users cannot be deleted) |
| `submissions/upload-photos` | POST | Upload photos to S3; return presigned view URLs. Max 10 MB/file, JPEG/PNG/WebP only. `maxDuration = 60`. |
| `submissions/save` | POST | Save a submission record to DynamoDB |
| `submissions/list` | GET | Scan all submissions from DynamoDB, newest first |
| `polepad/[...path]` | POST | Authenticated reverse proxy to the PolePad AI backend |

All routes require a valid session; admin routes additionally enforce the `admin` role.

---

## Pages & Components

### Public
- `/` — Landing page with Login and Go to Portal links.
- `/login` — Login form.

### Portal (requires auth)
- `/portal` — Dashboard with Submission and View Database cards. Shows username and role.
- `/portal/submission` — Multi-slot photo upload form (tag, overview, base, pad). On submit: uploads photos to S3 → calls PolePad AI → passes results to review page via `sessionStorage`.
- `/portal/submission/review` — AI-prefilled review screen. Inspector can correct all fields, toggle flags, view AI-annotated images in a lightbox, then confirm to save to DynamoDB. Redirects to `/portal` on success.
- `/portal/database` — Full submission table with flag filters. Click any row for a detail modal with inline photo gallery and full-screen lightbox.

### Admin (requires `admin` role)
- `/admin` — Admin dashboard: Add User form + User List with remove buttons.

### Shared Components
- `components/Header.tsx` — Top navigation bar.
- `components/LogoutButton.tsx` — Calls `POST /api/auth/logout` and redirects.
- `components/RequireAuth.tsx` — Client-side auth guard.
- `components/RequireAdmin.tsx` — Client-side admin guard.

---

## Infrastructure (CDK)

`infra/` contains an AWS CDK stack (`infra/lib/polepad-stack.ts`) that provisions all AWS resources:

- `polepad-submissions` DynamoDB table (PK: `tagNumber`, SK: `submittedAt`, GSI: `byAuthor`, PAY_PER_REQUEST, retain on destroy).
- `polepad-users` DynamoDB table (PK: `username`, PAY_PER_REQUEST, retain on destroy).
- S3 bucket (block all public access, S3-managed encryption, CORS for PUT from `*`).
- IAM user `polepad-app` with minimum permissions on both tables and the bucket.
- CDK outputs: `TableName`, `UsersTableName`, `BucketName`, `Region`, `AccessKeyId`, `SecretAccessKey`.

Deploy:
```bash
cd infra && npm install && cdk deploy
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SESSION_SECRET` | ✅ | Random hex string for HMAC signing of session cookies |
| `AWS_APP_REGION` | ✅ | AWS region (e.g. `us-east-1`) |
| `AWS_APP_ACCESS_KEY_ID` | ✅ | IAM access key for DynamoDB + S3 |
| `AWS_APP_SECRET_ACCESS_KEY` | ✅ | IAM secret key |
| `DYNAMODB_TABLE_NAME` | ✅ | Submissions DynamoDB table name |
| `DYNAMODB_USERS_TABLE_NAME` | ✅ | Users DynamoDB table name |
| `S3_BUCKET_NAME` | ✅ | S3 bucket name for photo storage |
| `ADMIN_PASSWORD_HASH` | ✅ prod | bcrypt hash of the Admin password. Required in production; falls back to hashing `"Gridstorm"` in dev. Generate with `node scripts/create-admin-hash.mjs`. |
| `POLEPAD_URL` | ⚠️ | Base URL of the PolePad AI backend. Proxy route returns 503 if unset. |
| `NEXT_PUBLIC_POLEPAD_URL` | ⚠️ | Client-side PolePad URL. A hardcoded Cloudflare tunnel URL is used as fallback if unset — set this for production. |

> **Note:** `AWS_APP_*` naming is intentional — Vercel reserves `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` internally.

---

## User Roles

Defined in `lib/types.ts`:
- `"admin"` — can add/remove users, access `/admin`.
- `"user"` — can submit inspections and view the database.

The `Admin` account (`isProtected: true`) cannot be deleted via the admin panel.

---

