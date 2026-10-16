# NODAL

NODAL is a Smart Task Management System created for our client All-In-One.

It's a Next.js application backed by Supabase (Postgres + Auth), styled with Tailwind, and deployed on Vercel.

**Production URL**: https://x-men-rosy.vercel.app/

## Try it

Open https://x-men-rosy.vercel.app/ and log in with the guest account:

- Email: `guest@nodal.demo`
- Password: `nodal91guest`

The guest is a read-only demo account (staff plus the `demo_viewer` role). It can browse tasks, the calendar, the schedule and the reports (`/report`), but every write is rejected by the database (restrictive RLS policies) and by the API. The data is shared demo data and may be reset at any time.

Access the our GitHub Repository [here](https://github.com/ryanhung919/x-men)

## Prerequisites

- Node.js 22+ (LTS recommended)
- pnpm 10+ (repo is pinned to pnpm and uses a lockfile)
- A Supabase project with the following environment variables configured locally:
	- NEXT_PUBLIC_SUPABASE_URL
	- NEXT_PUBLIC_SUPABASE_ANON_KEY
	- SUPABASE_SERVICE_ROLE_KEY (server-only)
	- POSTGRES_URL (direct connection string for seeding)
	- NEXT_PUBLIC_APP_URL
	- DEMO_PASSWORD and GUEST_PASSWORD (passwords the seed gives the demo accounts)

Create a `.env` in the project root using .env.example with values like:

```
NEXT_PUBLIC_SUPABASE_URL=...        # from Supabase project settings
NEXT_PUBLIC_SUPABASE_ANON_KEY=...   # from Supabase project settings
SUPABASE_SERVICE_ROLE_KEY=...       # service role (keep secret)
POSTGRES_URL=...                    # e.g. postgres://user:pass@host:5432/postgres
NEXT_PUBLIC_APP_URL=http://localhost:3000
DEMO_PASSWORD=...                   # password for every demo persona
GUEST_PASSWORD=...                  # password for guest@nodal.demo
# POSTGRES_SSL=disable              # optional; defaults to off for localhost, require elsewhere
```

### Running against a local Supabase

With Docker running and the Supabase CLI installed:

```bash
supabase start                      # uses supabase/config.toml (creates the task-attachments bucket)
supabase status -o env              # copy API_URL, ANON_KEY, SERVICE_ROLE_KEY and DB_URL into .env
```

Point `NEXT_PUBLIC_SUPABASE_URL` at the local API URL and `POSTGRES_URL` at the local DB URL
(port 54322). Keep credentials for any hosted project out of `.env` while working locally,
because `/seed` drops and recreates the schema of whatever database `POSTGRES_URL` points at.

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
It also creates (or updates) the demo auth users from `lib/sample-data.ts`, using `DEMO_PASSWORD`
and `GUEST_PASSWORD`. All demo personas are fictional `@nodal.demo` accounts, and all sample dates
are relative to the time you seed.

With the dev server running, run:

```bash
pnpm db:seed
```

## Running Tests

### Linting and formatting

Use the project-pinned Oxlint and Oxfmt tools:

```bash
pnpm lint          # Next.js, React/hooks, TypeScript and accessibility lint rules
pnpm lint:fix      # Apply supported automatic lint fixes
pnpm format:check  # Check formatting without changing files
pnpm format       # Format the repository
pnpm typecheck    # TypeScript compiler checks (separate from linting)
```

Oxfmt uses the existing style: semicolons, single quotes, ES5 trailing commas,
100-column print width, and two-space indentation. Configure it in `.oxfmtrc.json`;
lint rules live in `.oxlintrc.json`. Generated output and lockfiles are excluded
from formatting. Tool adoption does not automatically reformat existing source
or resolve its existing lint findings; run checks before applying broad fixes.

- Unit tests:

```bash
pnpm test:unit
```

Component tests:
```bash
pnpm test:component
```

- Integration tests (require dev server running on port 3000 for seeding):

```bash
# in one terminal
pnpm dev

# in another terminal
pnpm test:integration
```

- e2e tests

```bash
pnpm test:e2e
```

## Auth & Roles

- Users log in with email + password (Supabase Auth).
- Roles are stored in `user_roles` (staff, manager, admin) and enforced via RLS policies.
- Passwords are never stored in plain text; Supabase handles hashing.


## Tech Stack

- Next.js 15 (App Router, React 19)
- Supabase (Auth, Postgres, RLS, Edge Functions, Realtime)
- Tailwind CSS + shadcn/ui
- Vitest (unit + integration) + Playwright (e2e)
– Vercel (Deployment)

## Collaborators

- [Ryan Hung](https://github.com/ryanhung919)
- [Joel Wang](https://github.com/joelwangg)
- [Mitch Shona](https://github.com/mitchshona)
- [Garrison Koh](https://github.com/garrikyx)
- [Kester Yeo](https://github.com/echokes)
