# 12: Redesign report navigation and comparisons

**What to build:** Report viewers discover all report types and compare delivery information within a clear, consistently scoped visual layout.

**Blocked by:** 04: Unify navigation and page framing.

**Status:** ready-for-agent

## Owner scope revision — 2026-10-17

Prioritize presentable design and the portfolio recording; implement only necessary supporting logic. See the revised delivery priority in `../spec.md`. Broad library migrations, unrelated correctness cleanup, and exhaustive regression/failure-path testing are deferred. Use both-theme Playwright CLI visual checks, build/type checks, and targeted demo-path validation. Record completion against this revised scope and distinguish unverified original checklist items from verified work.

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


## Resolution: implemented (revised scope)

2026-10-17: report navigation and comparisons delivered under the owner’s design/demo-first revision. Logged Time, Task Completions and Team Summary are visible Radix tabs with keyboard navigation and blue selected state in both themes. Scope controls, active-filter summary and exports retain the selected report and valid project/department/date scope.

Task Completions replaces repeated person pies/cards with one aligned, shared-scale status comparison surface, completion percentages and compact timing/logged-hour details. All existing per-person values remain visible, including on-time/late counts, on-time rate, average cycle, total hours and hours/task. Team Summary now uses a compact metric strip, one weekly status chart and aligned contributor comparisons. Shared vibrant completed/progress blues, neutral To Do and red Blocked are paired with visible labels/counts. Native chart figures avoid new dependencies and mount animations. Mobile preserves readable stacked rows and horizontal scrolling inside the weekly chart.

Labels now honestly describe creator-based grouping rather than assignments/productivity; weekly cohorts use creation date. Cycle/on-time definitions explicitly describe latest-update timestamps and the on-time denominator. Service calculations, backend queries, permission scope and export-object construction remain intact. Minimal request cancellation, scope-key export gating and local retry states prevent stale results/exports after tab or filter changes. Scope changes show loading rather than silently retaining earlier data. Zero matching results and cleared filters have explicit states.

Verified before the brief usage interruption: all three tabs at1440px in light/dark, all three at390px in light/dark, no mobile page overflow (scrollWidth390); filter selection persists across tabs, clear removes prior export actions, arrow-key tab navigation works. CLI browser console reported zero errors. Screenshots `/tmp/nodal12-{logged,completions,team}-{light,dark}.png` and mobile counterparts. Final small polish removed new render-time ref access, used native figure semantics, aligned weekly scale labels and blue dark-tab underline; final typecheck/build rerun.

Automated validation: existing report service fixture34 tests and export component23 tests pass. Production build and typecheck pass with exact project runtime and private verified local-only environment. No database mutations, hosted reseed, dependency or schema changes. Actual PDF/XLSX downloads and exhaustive original integration/failure-path suites remain deferred under the revised scope; export construction and existing fixtures were preserved/checked. Existing legacy effect/LoggedTime lint debt is not presented as repository-wide lint clean.
