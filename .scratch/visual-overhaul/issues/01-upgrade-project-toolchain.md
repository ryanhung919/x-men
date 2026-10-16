# 01: Upgrade the project toolchain with working application and CI

**What to build:** Developers can install, build, run, lint, and test NODAL on a verified current stable project toolchain before visual work starts.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

## Spec coverage

Approved prerequisite added after the parent spec.

## Acceptance criteria

- [ ] Inventory declared and installed versions, runtime pins, package-manager settings, lockfiles, CI actions, browser binaries, Deno/Supabase tooling, and deployment runtime requirements. Record a baseline of working commands and pre-existing failures before changes.
- [ ] Resolve current stable releases at implementation time using package registries and version-specific documentation; use a supported Node LTS. Record chosen versions and any justified holds. Do not infer the latest release from a documentation index alone.
- [ ] Use the Context7 CLI for library/tool migration documentation: resolve the library first, then fetch version-specific guidance. It was verified working during ticket publication. Follow session Context7 instructions, use outside-sandbox requests where required, and never send secrets. Report quota or access failures; use official documentation transparently if Context7 is unavailable.
- [ ] Upgrade project-scoped Node/pnpm configuration, TypeScript and type packages, Next.js/React/React DOM, lint tooling, Vitest and companion packages, testing libraries, Playwright/browser binaries, and relevant CI runtime/tool pins in compatible groups. Align local and CI versions without changing machine-wide defaults for unrelated projects.
- [ ] Review Next.js migration requirements for routing, authentication/session handling, middleware, server/client boundaries, build behavior, and request APIs. Preserve the adopted Oxlint command through the migration; do not reintroduce next lint or add ESLint unless a concrete unsupported rule requires it.
- [ ] Keep a reproducible pnpm install and frozen lockfile. Resolve competing package-manager artifacts deliberately after checking consumers; do not leave contradictory installation instructions or duplicate tooling definitions.
- [ ] Preserve application behavior, permissions, schema, metric calculations, and hosted demo data. Any migration prefactoring lands before dependent visual changes.
- [ ] Verify clean installation, type checking, linting, production build/start, unit/component tests, and representative authenticated browser navigation. Exercise integration/end-to-end mutations only against a confirmed isolated local database; existing test setup can seed destructively.
- [ ] Update project setup/CI instructions with the selected toolchain and migration evidence. Do not claim CI or hosted deployment passed unless actually run.

## Execution constraints

- Use the approved NODAL visual-overhaul spec and later user-approved upgrade prerequisite. Existing data model, report calculations, accounts, permissions, and rich demo scenarios remain the baseline.
- Use Context7 CLI for current library/tool documentation when needed, following the session instructions; do not infer that an installed skill guarantees MCP tool access.
- Test externally observable outcomes. Reuse the browser-level seam, existing Playwright suites, and globally installed Playwright CLI. Verify isolated database targeting before running tests that seed or mutate data.
- Preserve unrelated user changes. No hosted reseed, deployment, broad machine-wide upgrades, or unrelated portfolio changes.

## Comments

The user subsequently approved Oxlint and Oxfmt installation. Oxlint 1.88.0 and Oxfmt 0.73.0 were installed as exact project development dependencies. Lint, safe lint-fix, format, format-check, and separate TypeScript-check commands are configured. The existing Prettier style was transferred to Oxfmt; no bulk formatting or lint fixes were applied.

Initial baseline: 180 lint errors and 6 warnings, including unused variables, accessibility, and React correctness findings; formatting check reports 193 files requiring formatting. These are existing source findings, not a clean baseline. Resolve or explicitly triage them during the upgrade/overhaul rather than suppressing rules broadly. The installation also reported an existing Supabase SSR/client peer-version mismatch; verify it during application-library upgrades. This partial tooling setup does not complete this upgrade ticket.


## Resolution: implemented

2026-10-17: toolchain prerequisite delivered. User narrowed scope during implementation to a presentable portfolio demo with minimal logic work; comprehensive baseline lint cleanup, integration/e2e mutation suites and hosted validation are superseded. The visual frontier can proceed.

Registry/API verified stable pins: Node24.22.0 LTS (Node release API), pnpm12.14.0, Next16.4.2, React/DOM19.3.1, TypeScript7.0.2, matching React types19.3.0 and Node24 types24.19.2, Vitest/coverage/UI5.0.5, Playwright1.64.1, React plugin6.1.2, testing-library React16.3.3/jest-dom7.0.1/user-event14.6.8, happy-dom21.0.3, tsx4.23.15, concurrently10.0.6, wait-on9.5.1. Oxlint1.88.0/Oxfmt0.73.0 already current. Supabase CLI2.121.0 current (held); Deno CI2.9.7 verified from official release API. CI checkout7.0.1/setup-node7.1.0/upload-artifact7.0.2, Deno setup2.0.5, pnpm setup6.1.0, Supabase setup3.0.1 verified using official GitHub releases. Application dependencies stay with ticket02.

Context7 migration guidance: Next.js `/vercel/next.js/v16.2.9` (latest indexed version, registry determined target), Vitest `/vitest-dev/vitest/v5.0.3`, pnpm `/websites/pnpm_io`. Renamed middleware entry to proxy without changing session handling, preserved already asynchronous cookies/request APIs and tightened archive route parameter to Promise. Next updated JSX automatic runtime and dev generated type include. Vitest removed poolOptions replaced with sequential file execution; constructor mocks now use constructible functions. pnpm12 needs workspace allowBuilds rather than ignored package.json settings. Removed stale npm lockfile; no consumers referenced it. pnpm is canonical.

Baseline: frozen install succeeds; compiler succeeds; 28 unit files/589 tests and15 component files/195 tests pass. Lint180 errors/6 warnings pre-exist, unchanged after upgrade. Baseline sandbox build failed due worker port restrictions.

Upgrade validation: exact Node24.22.0/pnpm12.14.0 frozen install, typecheck and589 unit tests pass;195 component tests pass; production build passes outside sandbox using verified local-only Supabase env, production start on3001 ready. No hosted data, schema, permissions or metric changes. No CI run or deployment claimed. Existing lint remains180 errors/6 warnings (unused105, keyboard/static interaction32, React correctness28, remaining accessibility/syntax findings); address affected files during visual tickets and integrated validation, with no broad rule suppression. Existing formatting debt unchanged. Required checks revised by explicit user scope narrowing; authenticated browser, full integration/e2e and CI execution deferred.
