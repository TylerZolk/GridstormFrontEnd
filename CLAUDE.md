# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from `dominion-front/`:

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

No test framework is configured.

## Architecture

This is a **Next.js App Router** application ("PolePadAI") — a role-based portal with session authentication, user management, and photo submission. The source lives entirely in `dominion-front/`.

### Authentication

Custom session-based auth (no NextAuth or similar):
- Login → `/api/auth/login` validates against `data/users.json`, sets an HTTP-only cookie (`portal_session`)
- Cookie value is `base64url(payload).HMAC-SHA256(payload, SESSION_SECRET)`
- `lib/auth.ts` owns session creation/validation via `getSessionUser()`
- `SESSION_SECRET` env var is required at runtime (no fallback)
- Passwords stored in plaintext — this is acknowledged as demo-only

### Route Protection

Two client-side guard components wrap protected pages:
- `RequireAuth` — redirects to `/login` if no valid session
- `RequireAdmin` — redirects to `/login` (unauthenticated) or `/portal` (authenticated non-admin)

`portal/layout.tsx` also applies auth checking at the layout level.

### Data Layer

- User data persisted to `data/users.json` via `lib/users.ts` (file-based, no database)
- Default admin seeded on startup: username `Admin`, password `Gridstorm`, role `admin`
- User roles: `"admin"` | `"user"` (defined in `lib/types.ts`)

### API Routes

All under `app/api/`:
- `auth/login`, `auth/logout`, `auth/me`
- `admin/users`, `admin/add-user`, `admin/remove-user`

API calls from client components use native `fetch` with no wrapper library.

### Incomplete Features

`/portal/submission` (photo upload) and `/portal/database` are UI placeholders with no backend integration yet.
