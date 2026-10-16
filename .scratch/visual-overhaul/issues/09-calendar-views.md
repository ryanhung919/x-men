# 09: Polish Calendar day, week, and month views

**What to build:** Users scan dates and recurring work clearly in every calendar view and inspect tasks without losing calendar context.

**Blocked by:** 06: Introduce shared task inspection and inline properties.

**Status:** ready-for-agent

## Spec coverage

14–15, 20–21, 35–38.

## Acceptance criteria

- [ ] Apply shared status colors/icons and typography across day/week/month layouts, with readable date headings, navigation, and view controls.
- [ ] Make today and actual weekends recognizable; preserve selected date and appropriate calendar-view preferences.
- [ ] Maintain shared task filters and completion visibility from ticket 5, including search/presets where applicable; ensure displayed results agree with the list.
- [ ] Show recurrence indicators consistently and retain current recurring-date calculations and unscheduled-task behavior without inventing events.
- [ ] Handle crowded days, long titles, multiple assignees, overflow indicators, and compact cards without hiding access to tasks.
- [ ] Replace duplicated preview behavior with the shared inspector. Closing it restores the original calendar date/view, filters, scroll, and focus.
- [ ] Use readable small-screen controls and accessible task activation rather than hover-only information.
- [ ] Provide layout-matched loading and distinct no-results/no-dated-work/error feedback.
- [ ] Verify day/week/month switching, date navigation, recurring tasks, filter continuity, and inspection in both themes with browser checks and existing calendar tests.

## Execution constraints

- Use the approved NODAL visual-overhaul spec and later user-approved upgrade prerequisite. Existing data model, report calculations, accounts, permissions, and rich demo scenarios remain the baseline.
- Use Context7 CLI for current library/tool documentation when needed, following the session instructions; do not infer that an installed skill guarantees MCP tool access.
- Test externally observable outcomes. Reuse the browser-level seam, existing Playwright suites, and globally installed Playwright CLI. Verify isolated database targeting before running tests that seed or mutate data.
- Preserve unrelated user changes. No hosted reseed, deployment, broad machine-wide upgrades, or unrelated portfolio changes.

