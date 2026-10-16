# 02: Upgrade application libraries while preserving workflows

**What to build:** Users retain working authentication, task management, charts, and exports after application dependencies move to verified supported releases.

**Blocked by:** 01: Upgrade the project toolchain with working application and CI.

**Status:** ready-for-agent

## Spec coverage

Approved prerequisite; regression coverage supports stories 1–43.

## Acceptance criteria

- [ ] Inventory every direct application dependency, including UI primitives, styling utilities, charts, Supabase clients, database client, dates/calendars, icons, notifications, validation, uploads, and PDF/spreadsheet export libraries; identify unused or malformed dependency entries before removing them.
- [ ] Resolve current stable compatible versions at implementation time with Context7 and official migration documentation. Audit export-library distribution channels and support status rather than assuming the registry tag is authoritative.
- [ ] Migrate application dependencies in compatible batches, adapting call sites and tests as needed. Account for Recharts major-version behavior, Tailwind/merge compatibility, date-picker APIs, and Supabase SSR/session behavior.
- [ ] Preserve existing data semantics, schemas, permission scope, seed richness, and route/API contracts. Record any necessary exception rather than silently expanding the redesign.
- [ ] Confirm login/session renewal/sign-out, task loading/editing, recurring work, attachments/comments, calendar, scheduling, report scoping, and notification behavior. Run mutation checks on isolated data.
- [ ] Verify report calculations remain equivalent on fixed fixtures and generated PDF/spreadsheet exports retain content, scope, and usable formatting.
- [ ] Keep dependency declarations and lockfile reproducible; resolve peer compatibility and document remaining advisories/holds with concrete reasons.
- [ ] Keep existing CSS animation utilities as the initial motion stack. Do not add GSAP or Lenis for speculative use; retain native application scrolling.
- [ ] Finish with production build, relevant automated suites, and browser smoke checks in both themes. Record before/after versions and actual validation results.

## Execution constraints

- Use the approved NODAL visual-overhaul spec and later user-approved upgrade prerequisite. Existing data model, report calculations, accounts, permissions, and rich demo scenarios remain the baseline.
- Use Context7 CLI for current library/tool documentation when needed, following the session instructions; do not infer that an installed skill guarantees MCP tool access.
- Test externally observable outcomes. Reuse the browser-level seam, existing Playwright suites, and globally installed Playwright CLI. Verify isolated database targeting before running tests that seed or mutate data.
- Preserve unrelated user changes. No hosted reseed, deployment, broad machine-wide upgrades, or unrelated portfolio changes.

