# 12: Redesign report navigation and comparisons

**What to build:** Report viewers discover all report types and compare delivery information within a clear, consistently scoped visual layout.

**Blocked by:** 04: Unify navigation and page framing.

**Status:** ready-for-agent

## Spec coverage

28–32, 35–38.

## Acceptance criteria

- [ ] Expose Logged Time, Task Completions, and Team Summary as visible accessible tabs, preserving valid selected scope across report changes.
- [ ] Align department/project/date controls, active-filter summaries, clear actions, and exports. Handle dependent filter changes without displaying stale or misleading results.
- [ ] Prioritize a small set of meaningful measures, one dominant visualization, and compact comparison detail. Preserve access to all existing report information.
- [ ] Replace repetitive per-person pies with aligned stacked bars/numerical comparisons where they improve comparison; retain accurate denominators and units.
- [ ] Use the shared vibrant blue/red palette consistently, with labels/icons or legend text distinguishing states; ensure narrow chart segments and tooltips remain readable.
- [ ] Retain metric calculations, date semantics, and permission scope. Explain update-time-based completion measures accurately rather than presenting improved visual design as improved data precision.
- [ ] Preserve PDF and spreadsheet export behavior and selected-report/filter alignment; exports must not use stale data during loading.
- [ ] Provide clear initial scope, no filters, no matching data, loading, partial refresh, and error states. Keep prior content readable only when visibly identified as updating.
- [ ] Verify all report tabs, dependent filters, legends/tooltips, layouts, and exports in both themes. Reuse report workflow/export tests on isolated data.

## Execution constraints

- Use the approved NODAL visual-overhaul spec and later user-approved upgrade prerequisite. Existing data model, report calculations, accounts, permissions, and rich demo scenarios remain the baseline.
- Use Context7 CLI for current library/tool documentation when needed, following the session instructions; do not infer that an installed skill guarantees MCP tool access.
- Test externally observable outcomes. Reuse the browser-level seam, existing Playwright suites, and globally installed Playwright CLI. Verify isolated database targeting before running tests that seed or mutate data.
- Preserve unrelated user changes. No hosted reseed, deployment, broad machine-wide upgrades, or unrelated portfolio changes.

