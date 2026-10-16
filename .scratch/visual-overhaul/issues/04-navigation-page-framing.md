# 04: Unify navigation and page framing

**What to build:** Users navigate a consistent application shell with clear location, predictable actions, and usable mobile navigation.

**Blocked by:** 03: Establish the blue/red visual system through Logged Time Reports.

**Status:** ready-for-agent

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

