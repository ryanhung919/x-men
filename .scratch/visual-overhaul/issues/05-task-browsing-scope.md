# 05: Focus task browsing and preserve scope across views

**What to build:** Users quickly find work in a readable task list and keep the same task scope when switching to Calendar.

**Blocked by:** 04: Unify navigation and page framing.

**Status:** ready-for-agent

## Owner scope revision — 2026-10-17

Prioritize presentable design and the portfolio recording; implement only necessary supporting logic. See the revised delivery priority in `../spec.md`. Broad library migrations, unrelated correctness cleanup, and exhaustive regression/failure-path testing are deferred. Use both-theme Playwright CLI visual checks, build/type checks, and targeted demo-path validation. Record completion against this revised scope and distinguish unverified original checklist items from verified work.

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

## Resolution: implemented (revised scope)

2026-10-17: replaced the dense ten-metadata-column table with six default columns: title, status, neutral numeric priority, deadline, assignees and project. Titles stay readable; quiet IDs/subtask/file/recurrence indicators retain useful context. Optional metadata remains in keyboard-operable column controls. Blue progress/completion and red blocked/overdue labels/icons are shared in `components/tasks/task-status.tsx`; overdue dates are emphasized without painting whole rows red. Mobile uses readable task cards and assignee names with no page-level horizontal overflow.

TasksViewWrapper now owns search, project/status/tag selections, completion visibility, presets and display columns. List and Calendar receive the same filtered tasks, with recurrence applied exactly once using the existing helper. A compact scoped summary replaces decorative count cards; All work, Blocked and Due this week presets, clear behavior, coherent search/filter/display/view toolbar and contextual empty messages are included. List stays mounted while hidden to retain sorting during Calendar roundtrips. Standalone Calendar retains its legacy controls; embedded Calendar uses the shared toolbar to avoid conflicting scope.

Validation with Node24.22.0/pnpm12.14.0: typecheck and production build pass. Playwright CLI screenshots `/tmp/nodal-ticket05-shots/tasks-dark.png`, `tasks-light.png`, `tasks-light-mobile.png` reviewed at1440x900 and390x844. Local presenter search “Integrate SSO” narrows to one task; List→Calendar→List retains search and exact summary; completion visibility survives Calendar switching; unmatched search displays the empty state and clears correctly. Mobile document width verified390px. No seeds, task mutations or hosted data used.

Original exhaustive sorting/filter-combination, recurrence suite, initial/error loading and accessibility coverage not all rerun under revised design/demo priority. Existing sorting algorithm and recurrence helper retained; server-side loading/errors remain route-level concerns. Calendar visual refinement and shared inspector follow in09/06. No URL/global-store state introduced.
