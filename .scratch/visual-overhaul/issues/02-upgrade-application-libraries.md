# 02: Upgrade application libraries while preserving workflows

**What to build:** Users retain working authentication, task management, charts, and exports after application dependencies move to verified supported releases.

**Blocked by:** 01: Upgrade the project toolchain with working application and CI.

**Status:** ready-for-agent

## Owner scope revision — 2026-10-17

Prioritize presentable design and the portfolio recording; implement only necessary supporting logic. See the revised delivery priority in `../spec.md`. Broad library migrations, unrelated correctness cleanup, and exhaustive regression/failure-path testing are deferred. Use both-theme Playwright CLI visual checks, build/type checks, and targeted demo-path validation. Record completion against this revised scope and distinguish unverified original checklist items from verified work.

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


## Resolution: implemented (revised scope)

2026-10-17: minimum compatibility prerequisites delivered under the owner's design/demo-first scope revision. Broad library migration and exhaustive workflow testing are explicitly deferred, rather than claimed complete against the original checklist.

- Pin Supabase SSR to 0.10.3 and upgrade JS client 2.58.0→2.105.3, satisfying its verified ^2.105.3 peer requirement. Toolchain01's floating SSR resolution briefly moved to0.12.7; the explicit pin restores the previously working SSR API and avoids a session-contract migration.
- Upgrade tailwind-merge2.6.0→3.7.0 for existing Tailwind4 utilities. Context7 `/dcastil/tailwind-merge` official README/changelog confirms v3 supports Tailwind4 and v2 supports Tailwind3. Direct before/after check: `outline-hidden outline-none` formerly retained both; now correctly returns `outline-none`.
- Preserve Recharts2, DayPicker9, TanStack8, exports, existing CSS animation utilities and all other working application versions. No schema, permission, report-calculation or seed changes. Malformed unused tooltip link, unused bcrypt and SheetJS CDN distribution migration are documented deferred cleanup; postgres is required by seed code and retained.

Validation with exact Node24.22.0/pnpm12.14.0: initial non-frozen dependency installation succeeds; typecheck and production build pass using ignored0600 verified local-only environment. Supabase peer mismatch resolved. Remaining peer warning: transitive tsconfck3.1.6 declares TypeScript^5 while toolchain01 uses7.0.2; compiler/build pass, unrelated migration deferred. Existing Recharts2 deprecation and older transitive advisories remain held under revised scope. No hosted data or mutation tests used. Both-theme authenticated browser validation follows visual tickets; comprehensive original checklist remains unverified.

Reproducible installation: pnpm12 initially rejected toolchain01's newly published Next16.4.2 env/SWC packages and happy-dom21.0.3 under its existing minimum-release-age policy. Automatic approval review rejected adding persistent exact-version age exceptions because dependency authorization did not clearly authorize weakening that policy. No bypass was applied; the install-generated exception was reverted. Instead registry publish timestamps verified compatible stable holds Next16.4.1 (2026-10-14) and happy-dom21.0.1 (2026-10-12), which satisfy the unchanged policy. These replace the two too-recent toolchain01 patch versions. Frozen installation and policy verification now pass; typecheck and production build were rerun on the final held versions.
