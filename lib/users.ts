// lib/users.ts
import "server-only";
import { Redis } from "@upstash/redis";
import bcrypt from "bcryptjs";
import type { UserRecord } from "./types";

const redis = Redis.fromEnv();

const USERS_INDEX_KEY = "users:index";
const userKey = (u: string) => `user:${u}`;
const ADMIN_USERNAME = "Admin";

async function ensureAdminExists(): Promise<void> {
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!hash) throw new Error("ADMIN_PASSWORD_HASH env var is not set.");
  const exists = await redis.sismember(USERS_INDEX_KEY, ADMIN_USERNAME);
  if (!exists) {
    const admin: UserRecord = { username: ADMIN_USERNAME, password: hash, role: "admin", isProtected: true };
    await redis.set(userKey(ADMIN_USERNAME), JSON.stringify(admin));
    await redis.sadd(USERS_INDEX_KEY, ADMIN_USERNAME);
  }
}

async function readUser(username: string): Promise<UserRecord | null> {
  const raw = await redis.get<string>(userKey(username));
  if (!raw) return null;
  return typeof raw === "string" ? JSON.parse(raw) : raw as UserRecord;
}

export async function getUser(username: string): Promise<UserRecord | undefined> {
  await ensureAdminExists();
  const user = await readUser(username);
  return user ?? undefined;
}

export async function addUser(username: string, password: string): Promise<void> {
  if (!username || !password) throw new Error("Missing username or password");
  await ensureAdminExists();
  const already = await redis.sismember(USERS_INDEX_KEY, username);
  if (already) throw new Error("User already exists");
  const hashed = await bcrypt.hash(password, 10);
  const record: UserRecord = { username, password: hashed, role: "user", isProtected: false };
  await redis.set(userKey(username), JSON.stringify(record));
  await redis.sadd(USERS_INDEX_KEY, username);
}

export async function listUsers(): Promise<Array<Pick<UserRecord, "username" | "role">>> {
  await ensureAdminExists();
  const usernames = await redis.smembers(USERS_INDEX_KEY);
  if (!usernames || usernames.length === 0) return [];
  const records = await Promise.all(usernames.map(readUser));
  return records
    .filter((u): u is UserRecord => u !== null)
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
  const user = await readUser(username);
  if (!user) throw new Error("User not found");
  if (user.isProtected) throw new Error("Cannot remove a protected user");
  await redis.del(userKey(username));
  await redis.srem(USERS_INDEX_KEY, username);
}

export async function verifyPassword(user: UserRecord, plaintext: string): Promise<boolean> {
  return bcrypt.compare(plaintext, user.password);
}