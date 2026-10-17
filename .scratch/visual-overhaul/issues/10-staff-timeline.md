# 10: Make the staff timeline readable and connected

**What to build:** Users understand who owns scheduled work, where it falls in time, and the task context behind each bar.

**Blocked by:** 06: Introduce shared task inspection and inline properties.

**Status:** ready-for-agent

## Owner scope revision — 2026-10-17

Prioritize presentable design and the portfolio recording; implement only necessary supporting logic. See the revised delivery priority in `../spec.md`. Broad library migrations, unrelated correctness cleanup, and exhaustive regression/failure-path testing are deferred. Use both-theme Playwright CLI visual checks, build/type checks, and targeted demo-path validation. Record completion against this revised scope and distinguish unverified original checklist items from verified work.

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

## Resolution: implemented (revised scope)

2026-10-17: redesigned Schedule around a coherent native-scroll staff timeline. People column and two-level month/date header stay visible with opaque layered surfaces; actual Saturday/Sunday shading and a current-time marker replace index-based weekend coloring. Readable blue active/completed and red blocked/overdue bars include status icons, explicit accessible labels and full title/date information. Short spans gain adjacent labels without inflating their date geometry; clipped spans have edge indicators. Bars open the shared task inspector by keyboard or pointer. Existing authorized deadline handles remain for11; guest handles are hidden.

Preserved project/staff/date queries, role scope and creation→deadline or latest-update endpoints for completed tasks. Copy explicitly describes task lifetime, not effort allocation or definitive completion dates. Missing-deadline tasks remain in Tasks as the existing schedule API excludes them. Compact range/task/person summary, clear filters, loading skeleton, refresh/error feedback and the60-day range notice are included; stale data responses cannot overwrite a newer selected scope.

Verified Node24.22.0/pnpm12.14.0 typecheck and production build. Playwright CLI screenshots `/tmp/nodal-ticket10-shots/`: dark/light desktop,390px mobile, project-filtered dark composition. Sticky coordinates checked after vertical/horizontal scrolling; keyboard task-bar Enter opens inspector and Escape returns to schedule; mobile document width stays390px while timeline scrolls natively. Customer Portal project filtering verified. No deadline edits, seeds or hosted writes.

Original exhaustive date-boundary/empty/range-truncation/error combinations and legacy schedule test suites not rerun under revised design/demo priority. Existing drag interaction limitations intentionally continue to11. Accurate date/status semantics are preserved; backend range filtering still uses existing deadline overlap rather than a changed data contract.
