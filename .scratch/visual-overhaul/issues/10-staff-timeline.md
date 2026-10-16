# 10: Make the staff timeline readable and connected

**What to build:** Users understand who owns scheduled work, where it falls in time, and the task context behind each bar.

**Blocked by:** 06: Introduce shared task inspection and inline properties.

**Status:** ready-for-agent

## Spec coverage

15, 22–24, 27, 35–38.

## Acceptance criteria

- [ ] Keep person labels and date headers visible during relevant scrolling with correct layering; preserve readable names and task counts.
- [ ] Use a precise today marker, actual weekend shading, clear date hierarchy, restrained grid lines, and readable bars in both themes.
- [ ] Adopt shared status colors and labels, retaining distinguishable completed, active, blocked, and overdue meaning; provide information beyond color.
- [ ] Open the shared task inspector from bars using keyboard and pointer interactions without conflicting with deadline handles.
- [ ] Preserve project/staff/date filtering, refresh behavior, supported range limits, and role visibility. Show loading, empty, error, and range-truncation states clearly.
- [ ] Handle tasks outside the visible interval, clipped spans, long titles, missing deadlines, and many tasks per person without misleading geometry or inaccessible information.
- [ ] Label creation-to-deadline and updated-time completion spans according to existing semantics. Do not imply planned allocation, task-duration estimates, or staff overload.
- [ ] Preserve existing authorized deadline adjustment while reserving its interaction refinements for ticket 11.
- [ ] Provide usable horizontal scrolling and task inspection on small screens; do not introduce smooth-scroll interception.
- [ ] Verify filter results, sticky behavior, date geometry, direct task inspection, and empty/range states through browser checks and existing schedule tests.

## Execution constraints

- Use the approved NODAL visual-overhaul spec and later user-approved upgrade prerequisite. Existing data model, report calculations, accounts, permissions, and rich demo scenarios remain the baseline.
- Use Context7 CLI for current library/tool documentation when needed, following the session instructions; do not infer that an installed skill guarantees MCP tool access.
- Test externally observable outcomes. Reuse the browser-level seam, existing Playwright suites, and globally installed Playwright CLI. Verify isolated database targeting before running tests that seed or mutate data.
- Preserve unrelated user changes. No hosted reseed, deployment, broad machine-wide upgrades, or unrelated portfolio changes.

