// lib/users.ts
import "server-only";
import path from "path";
import { promises as fs } from "fs";
import bcrypt from "bcryptjs";
import type { UserRecord } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

// The seed admin record. Password must be a bcrypt hash.
// Run `node scripts/create-admin-hash.mjs` to generate one.
// Never commit a plaintext password here.
const ADMIN_SEED: UserRecord = {
  username: "Admin",
  password: process.env.ADMIN_PASSWORD_HASH || "",
  role: "admin",
  isProtected: true,
};

async function fileExists(p: string) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function ensureStorage() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  const exists = await fileExists(USERS_FILE);
  if (!exists) {
    if (!ADMIN_SEED.password) {
      throw new Error("ADMIN_PASSWORD_HASH env var is not set. Cannot seed users file.");
    }
    await fs.writeFile(USERS_FILE, JSON.stringify([ADMIN_SEED], null, 2), "utf8");
  }
}

async function readUsersUnsafe(): Promise<UserRecord[]> {
  const raw = await fs.readFile(USERS_FILE, "utf8");
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? (parsed as UserRecord[]) : [];
}

async function writeUsers(users: UserRecord[]) {
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
}

async function readUsers(): Promise<UserRecord[]> {
  await ensureStorage();

  const users = await readUsersUnsafe();

  const hasAdmin = users.some((u) => u.username === ADMIN_SEED.username);
  if (!hasAdmin) {
    if (!ADMIN_SEED.password) {
      throw new Error("ADMIN_PASSWORD_HASH env var is not set. Cannot re-seed admin user.");
    }
    const next = [...users, ADMIN_SEED];
    await writeUsers(next);
    return next;
  }

  return users;
}

export async function getUser(username: string): Promise<UserRecord | undefined> {
  const users = await readUsers();
  return users.find((u) => u.username === username);
}

// ✅ FIX: Hash password with bcrypt before storing
export async function addUser(username: string, password: string): Promise<void> {
  if (!username || !password) throw new Error("Missing username/password");

  const users = await readUsers();
  if (users.some((u) => u.username === username)) {
    throw new Error("User already exists");
  }

  const hashed = await bcrypt.hash(password, 10);
  users.push({ username, password: hashed, role: "user" });
  await writeUsers(users);
}

export async function listUsers(): Promise<Array<Pick<UserRecord, "username" | "role">>> {
  const users = await readUsers();
  return users.map((u) => ({ username: u.username, role: u.role }));
}

// ✅ FIX: Use isProtected flag instead of hardcoded username string check
export async function removeUser(username: string): Promise<void> {
  if (!username) throw new Error("Missing username");

  const users = await readUsers();
  const target = users.find((u) => u.username === username);

  if (!target) throw new Error("User not found");
  if (target.isProtected) throw new Error("Cannot remove a protected user");

  const next = users.filter((u) => u.username !== username);
  await writeUsers(next);
}

// ✅ NEW: Exported helper used by the login route
export async function verifyPassword(user: UserRecord, plaintext: string): Promise<boolean> {
  return bcrypt.compare(plaintext, user.password);
}