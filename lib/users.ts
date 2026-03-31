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

async function ensureAdminExists(): Promise<void> {
  const existing = await getDdbClient().send(
    new GetCommand({ TableName: TABLE(), Key: { username: ADMIN_USERNAME } })
  );
  if (!existing.Item) {
    const hash =
      process.env.ADMIN_PASSWORD_HASH ?? (await bcrypt.hash("Gridstorm", 10));
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
  await ensureAdminExists();
  const result = await getDdbClient().send(
    new GetCommand({ TableName: TABLE(), Key: { username } })
  );
  return result.Item as UserRecord | undefined;
}

export async function addUser(username: string, password: string): Promise<void> {
  if (!username || !password) throw new Error("Missing username or password");
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
  await ensureAdminExists();
  const result = await getDdbClient().send(new ScanCommand({ TableName: TABLE() }));
  const records = (result.Items ?? []) as UserRecord[];
  return records
    .map((u) => ({ username: u.username, role: u.role }))
    .sort((a, b) => {
      if (a.username === ADMIN_USERNAME) return -1;
      if (b.username === ADMIN_USERNAME) return 1;
      return a.username.localeCompare(b.username);
    });
}

export async function removeUser(username: string): Promise<void> {
  if (!username) throw new Error("Missing username");
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
  return bcrypt.compare(plaintext, user.password);
}
