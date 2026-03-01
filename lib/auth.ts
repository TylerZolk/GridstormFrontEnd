// lib/auth.ts
import "server-only";

import { createHmac } from "crypto";
import { cookies } from "next/headers";
import { getUser } from "./users";
import type { Role } from "./types";

const COOKIE_NAME = "portal_session";
export const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 8; // 8 hours

export type SessionUser = {
  username: string;
  role: Role;
};

function hmac(data: string, secret: string) {
  return createHmac("sha256", secret).update(data).digest("hex");
}

export function makeSessionCookieValue(username: string) {
  const secret = process.env.SESSION_SECRET || "";
  if (!secret) throw new Error("SESSION_SECRET not set");

  const payload = JSON.stringify({ username, iat: Date.now() });
  const sig = hmac(payload, secret);
  const b64 = Buffer.from(payload).toString("base64url");

  return `${b64}.${sig}`;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const secret = process.env.SESSION_SECRET || "";
  if (!secret) return null;

  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE_NAME)?.value;
  if (!value) return null;

  const dotIndex = value.lastIndexOf(".");
  if (dotIndex === -1) return null;

  const b64 = value.slice(0, dotIndex);
  const sig = value.slice(dotIndex + 1);
  if (!b64 || !sig) return null;

  const payload = Buffer.from(b64, "base64url").toString("utf8");
  const expected = hmac(payload, secret);

 
  if (expected.length !== sig.length) return null;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  }
  if (mismatch !== 0) return null;

  let parsed: { username: string; iat: number };
  try {
    parsed = JSON.parse(payload);
  } catch {
    return null;
  }

  // ✅ FIX: Enforce session expiry
  if (!parsed.iat || Date.now() - parsed.iat > SESSION_MAX_AGE_MS) {
    return null;
  }

  const user = await getUser(parsed.username);
  return user ? { username: user.username, role: user.role } : null;
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;