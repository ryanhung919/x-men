# 05: Focus task browsing and preserve scope across views

**What to build:** Users quickly find work in a readable task list and keep the same task scope when switching to Calendar.

**Blocked by:** 04: Unify navigation and page framing.

**Status:** ready-for-agent

## Spec coverage

10–14, 20, 35–38.

## Acceptance criteria

- [ ] Add a concise derived summary for active, overdue, and upcoming work with explicit scope. Do not bury work under a dashboard of decorative count cards.
- [ ] Default to title, status, priority, due date, assignees, and project. Keep creator and other metadata available through display options; show attachments/subtasks/recurrence as quiet useful indicators.
- [ ] Align task search, filters, display controls, and List/Calendar selection in a coherent toolbar with responsive wrapping and a clear primary create action.
- [ ] Implement useful presets such as blocked work and due this week using existing fields. Make active filters and clearing behavior understandable.
- [ ] Share task scope, search/filter selections, and completion visibility across List/Calendar switches. Switching presentation must not silently reset the visible task set.
- [ ] Preserve existing sorting, column visibility behavior, project/tag/status filters, recurring-date handling, and task access scope. Define empty search and clear-filter behavior.
- [ ] Use shared status icons/colors and a deliberate priority treatment that preserves existing values. Avoid saturating every row with badges.
- [ ] Keep long titles and multi-assignee rows readable; preserve access to truncated information and avoid unnecessary horizontal scrolling.
- [ ] Distinguish initial loading, no tasks, no matching results, and data errors; maintain keyboard-operable task navigation.
- [ ] Verify filtering/sorting and list-to-calendar round trips with browser tests plus screenshots in both themes and mobile widths.

## Execution constraints

- Use the approved NODAL visual-overhaul spec and later user-approved upgrade prerequisite. Existing data model, report calculations, accounts, permissions, and rich demo scenarios remain the baseline.
- Use Context7 CLI for current library/tool documentation when needed, following the session instructions; do not infer that an installed skill guarantees MCP tool access.
- Test externally observable outcomes. Reuse the browser-level seam, existing Playwright suites, and globally installed Playwright CLI. Verify isolated database targeting before running tests that seed or mutate data.
- Preserve unrelated user changes. No hosted reseed, deployment, broad machine-wide upgrades, or unrelated portfolio changes.

