// lib/types.ts
export type Role = "admin" | "user";

export type UserRecord = {
  username: string;
  password: string; // bcrypt hash — never store plaintext
  role: Role;
  isProtected?: boolean; // true = cannot be deleted via admin panel
};