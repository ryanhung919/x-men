This is a Smart Task Management System created by XMEN for our client All-In-One.

It’s a Next.js application backed by Supabase (Postgres + Auth), styled with Tailwind, and deployed on Vercel.

View our deployed website using Vercel -here-

## Prerequisites

- Node.js 18+ (LTS recommended)
- pnpm 10+ (repo is pinned to pnpm and uses a lockfile)
- A Supabase project with the following environment variables configured locally:
	- NEXT_PUBLIC_SUPABASE_URL
	- NEXT_PUBLIC_SUPABASE_ANON_KEY
	- SUPABASE_SERVICE_ROLE_KEY (server-only)
	- POSTGRES_URL (direct connection string for seeding)
	- NEXT_PUBLIC_APP_URL

Create a `.env` (or `.env.local`) in the project root with values like:

```
NEXT_PUBLIC_SUPABASE_URL=...        # from Supabase project settings
NEXT_PUBLIC_SUPABASE_ANON_KEY=...   # from Supabase project settings
SUPABASE_SERVICE_ROLE_KEY=...       # service role (keep secret)
POSTGRES_URL=...                    # e.g. postgres://user:pass@host:5432/postgres
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Getting Started

First, install dependencies:

```bash
pnpm i
```

Then run the development server:

```bash
pnpm dev
```

Install the VS Code extension: Tailwind CSS IntelliSense.

Open [http://localhost:3000](http://localhost:3000) in your browser to see the app.

## Seeding the Database

We ship a full seed endpoint at `/seed` that (re)creates schema, policies, triggers, and sample data.

With the dev server running, run:

```bash
pnpm db:seed
```

## Running Tests

- Unit tests:

```bash
pnpm test:unit
```

- Integration tests (require dev server running on port 3000 for seeding):

```bash
# in one terminal
pnpm dev

# in another terminal
pnpm test:integration
```

- CI convenience (unit then integration):

```bash
pnpm ci:test
```

## Auth & Roles (at a glance)

- Users log in with email + password (Supabase Auth).
- Roles are stored in `user_roles` (staff, manager, admin) and enforced via RLS policies.
- After login, managers are redirected to `/schedule`; others go to `/report`.
- Passwords are never stored in plain text; Supabase handles hashing.

Contact the administrators for admin access to view `/report`.

## Tech Stack

- Next.js 15 (App Router, React 19)
- Supabase (Auth, Postgres, RLS)
- Tailwind CSS + shadcn/ui
- Vitest (unit + integration)

## Collaborators

- [Ryan Hung](https://github.com/ryanhung919)
- [Joel Wang](https://github.com/joelwangg)
- [Mitch Shona](https://github.com/mitchshona)
- [Garrison Koh](https://github.com/garrikyx)
- [Kester Yeo](https://github.com/echokes)