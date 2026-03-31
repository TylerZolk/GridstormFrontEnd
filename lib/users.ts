import "server-only";
import {
  PutCommand,
  GetCommand,
  ScanCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import bcrypt from "bcryptjs";
import type { UserRecord } from "./types";
import { getDdbClient } from "./aws/dynamodb";

const TABLE = () => process.env.DYNAMODB_USERS_TABLE_NAME!;
const ADMIN_USERNAME = "Admin";

// ─── Hardcoded test user (bypasses DynamoDB entirely) ───
// TODO: Remove this once AWS credentials are properly configured
const TEST_USER: UserRecord = {
  username: "test",
  password: "$BYPASS$",
  role: "admin",
  isProtected: true,
};
const TEST_PASSWORD = "test";
function isTestUser(username: string): boolean {
  return username === TEST_USER.username;
}
// ─────────────────────────────────────────────────────────

async function ensureAdminExists(): Promise<void> {
  const existing = await getDdbClient().send(
    new GetCommand({ TableName: TABLE(), Key: { username: ADMIN_USERNAME } })
  );
  if (!existing.Item) {
    const hashEnv = process.env.ADMIN_PASSWORD_HASH;
    if (!hashEnv && process.env.NODE_ENV === "production") {
      throw new Error("ADMIN_PASSWORD_HASH env var is required in production");
    }
    const hash = hashEnv ?? (await bcrypt.hash("Gridstorm", 10));
    const admin: UserRecord = {
      username: ADMIN_USERNAME,
      password: hash,
      role: "admin",
      isProtected: true,
    };
    await getDdbClient().send(new PutCommand({ TableName: TABLE(), Item: admin }));
  }
}

export async function getUser(username: string): Promise<UserRecord | undefined> {
  // Hardcoded test user — no DynamoDB needed
  if (isTestUser(username)) return TEST_USER;

  await ensureAdminExists();
  const result = await getDdbClient().send(
    new GetCommand({ TableName: TABLE(), Key: { username } })
  );
  return result.Item as UserRecord | undefined;
}

export async function addUser(username: string, password: string): Promise<void> {
  if (!username || !password) throw new Error("Missing username or password");
  if (isTestUser(username)) throw new Error("User already exists");
  await ensureAdminExists();
  const existing = await getDdbClient().send(
    new GetCommand({ TableName: TABLE(), Key: { username } })
  );
  if (existing.Item) throw new Error("User already exists");
  const hashed = await bcrypt.hash(password, 10);
  const record: UserRecord = { username, password: hashed, role: "user", isProtected: false };
  await getDdbClient().send(new PutCommand({ TableName: TABLE(), Item: record }));
}

export async function listUsers(): Promise<Array<Pick<UserRecord, "username" | "role">>> {
  try {
    await ensureAdminExists();
    const result = await getDdbClient().send(new ScanCommand({ TableName: TABLE() }));
    const records = (result.Items ?? []) as UserRecord[];
    const list = records
      .map((u) => ({ username: u.username, role: u.role }))
      .sort((a, b) => {
        if (a.username === ADMIN_USERNAME) return -1;
        if (b.username === ADMIN_USERNAME) return 1;
        return a.username.localeCompare(b.username);
      });
    // Ensure test user appears in the list
    if (!list.find((u) => u.username === TEST_USER.username)) {
      list.unshift({ username: TEST_USER.username, role: TEST_USER.role });
    }
    return list;
  } catch {
    // DynamoDB unavailable — return just the test user
    return [{ username: TEST_USER.username, role: TEST_USER.role }];
  }
}

export async function removeUser(username: string): Promise<void> {
  if (!username) throw new Error("Missing username");
  if (isTestUser(username)) throw new Error("Cannot remove a protected user");
  await ensureAdminExists();
  const result = await getDdbClient().send(
    new GetCommand({ TableName: TABLE(), Key: { username } })
  );
  const user = result.Item as UserRecord | undefined;
  if (!user) throw new Error("User not found");
  if (user.isProtected) throw new Error("Cannot remove a protected user");
  await getDdbClient().send(
    new DeleteCommand({ TableName: TABLE(), Key: { username } })
  );
}

export async function verifyPassword(
  user: UserRecord,
  plaintext: string
): Promise<boolean> {
  // Hardcoded test user — plaintext match, no bcrypt
  if (isTestUser(user.username)) return plaintext === TEST_PASSWORD;
  return bcrypt.compare(plaintext, user.password);
}
