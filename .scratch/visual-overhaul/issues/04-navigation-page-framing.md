# 04: Unify navigation and page framing

**What to build:** Users navigate a consistent application shell with clear location, predictable actions, and usable mobile navigation.

**Blocked by:** 03: Establish the blue/red visual system through Logged Time Reports.

**Status:** ready-for-agent

## Owner scope revision — 2026-10-17

Prioritize presentable design and the portfolio recording; implement only necessary supporting logic. See the revised delivery priority in `../spec.md`. Broad library migrations, unrelated correctness cleanup, and exhaustive regression/failure-path testing are deferred. Use both-theme Playwright CLI visual checks, build/type checks, and targeted demo-path validation. Record completion against this revised scope and distinguish unverified original checklist items from verified work.

## Spec coverage

7–9, 34–38.

## Acceptance criteria

- [ ] Retain compact top navigation with route-aware selected states, accessible current-page semantics, and consistent destination naming; rename Report to Reports.
- [ ] Apply coherent page titles, content gutters, maximum widths where appropriate, and primary-action alignment to Tasks, Schedule, and Reports. Eliminate accidental nested-padding differences.
- [ ] Refine account presentation and distinguish actual roles/demo identity without displaying unsupported capabilities. Keep default-view preferences and sign-out functional.
- [ ] Remove or redirect unsupported Profile/Settings destinations to useful existing behavior rather than creating new product scope. Check sign-in/sign-out targets against actual routes.
- [ ] Ensure mobile navigation opens/closes predictably, exposes available destinations according to existing permissions, and restores focus.
- [ ] Replace navigation hover scaling and decorative motion with subtle surface/focus transitions; establish control and panel timing guidance with reduced-motion equivalents.
- [ ] Preserve route protection, theme controls, notification access, and default landing-view behavior.
- [ ] Verify authenticated, unauthenticated, guest, and relevant role navigation in both themes; check narrow layouts, long names, loading states, and keyboard use.

## Execution constraints

- Use the approved NODAL visual-overhaul spec and later user-approved upgrade prerequisite. Existing data model, report calculations, accounts, permissions, and rich demo scenarios remain the baseline.
- Use Context7 CLI for current library/tool documentation when needed, following the session instructions; do not infer that an installed skill guarantees MCP tool access.
- Test externally observable outcomes. Reuse the browser-level seam, existing Playwright suites, and globally installed Playwright CLI. Verify isolated database targeting before running tests that seed or mutate data.
- Preserve unrelated user changes. No hosted reseed, deployment, broad machine-wide upgrades, or unrelated portfolio changes.


## Resolution: implemented

2026-10-17: delivered against owner's revised visual/demo scope. Compact sticky navigation now shares a restrained NODAL glyph, route icons, selected blue surfaces and aria-current (including task detail routes). Reports naming consistent, unsupported Profile/Settings removed, sign-in/sign-out target the actual root login route. Account shows real display name and actual Administrator/Manager/Team member or Read-only demo role; long identities truncate. Existing default-view preference remains in desktop account menu and mobile sheet, with saving state and recoverable failure copy. No permission or preference API changes.

Dashboard owns consistent max width and gutters; removed nested Tasks/Reports padding. Tasks and Schedule use the report title scale, short descriptions, contextual labels and aligned actions; Schedule filters grouped on shared card surface. Report dominant chart still fits1440x900. Removed nav/theme/notification hover scale and bell rotation; focus and motion tokens inherited from foundation. Mobile Radix sheet closes on selection/Escape and restores trigger focus; unsupported destinations absent.

Validation: TypeScript passes; production build/start passes on verified loopback env. Both-theme1440x900 Reports inspected via Playwright CLI (`/tmp/nodal04-report-light.png`, `-dark.png`), plus Tasks/Schedule screenshots, mobile390x844 menu (`/tmp/nodal04-mobile-nav.png`), guest account (`/tmp/nodal04-guest.png`). Computed header/scope x32 alignment verified; mobile overflow false, Escape focus restoration true, Reports aria-current page. Existing guest Reports access/read-only identity verified. Targeted lint for Navbar/ThemeToggle/NotificationPanel/TasksPageHeader passes. No seed, task edits or preference writes. Exhaustive role/error-path tests and signout submission deferred under owner revised scope.
