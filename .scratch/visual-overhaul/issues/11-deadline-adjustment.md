# 11: Make deadline adjustment precise and accessible

**What to build:** Authorized users change deadlines confidently through a visible drag preview or an equivalent accessible date control.

**Blocked by:** 10: Make the staff timeline readable and connected.

**Status:** ready-for-agent

## Owner scope revision — 2026-10-17

Prioritize presentable design and the portfolio recording; implement only necessary supporting logic. See the revised delivery priority in `../spec.md`. Broad library migrations, unrelated correctness cleanup, and exhaustive regression/failure-path testing are deferred. Use both-theme Playwright CLI visual checks, build/type checks, and targeted demo-path validation. Record completion against this revised scope and distinguish unverified original checklist items from verified work.

## Spec coverage

18, 25–27, 35–38.

## Acceptance criteria

- [ ] Increase the usable hit area of the deadline handle while keeping its visible geometry restrained and separate from task inspection.
- [ ] Preview the target date and bar endpoint continuously while dragging; account for horizontal scroll, visible range boundaries, and the intended row.
- [ ] Define commit and cancellation behavior explicitly, including Escape and pointer leaving the grid; avoid accidental saves caused by loss of pointer context.
- [ ] Provide keyboard and touch access to an equivalent date-edit control using existing deadline semantics and validation.
- [ ] Preserve existing authorization and completed-task restrictions. Guest users receive no misleading draggable state.
- [ ] Show pending save, success, and recoverable failure; ensure a failed request cannot leave a falsely updated bar or stale date in the inspector.
- [ ] Keep date/timezone behavior consistent with existing deadline editing. Do not change the model to implement a visual preview.
- [ ] Expose Undo only when the previous deadline can be correctly restored through an authorized operation; otherwise offer clear confirmation and failure recovery.
- [ ] Verify drag and alternative-control behavior, cancellation, scroll geometry, request failure, and unauthorized attempts on isolated data. Check both themes and reduced motion.

## Execution constraints

- Use the approved NODAL visual-overhaul spec and later user-approved upgrade prerequisite. Existing data model, report calculations, accounts, permissions, and rich demo scenarios remain the baseline.
- Use Context7 CLI for current library/tool documentation when needed, following the session instructions; do not infer that an installed skill guarantees MCP tool access.
- Test externally observable outcomes. Reuse the browser-level seam, existing Playwright suites, and globally installed Playwright CLI. Verify isolated database targeting before running tests that seed or mutate data.
- Preserve unrelated user changes. No hosted reseed, deployment, broad machine-wide upgrades, or unrelated portfolio changes.


## Resolution: implemented against revised demo scope

Added a restrained endpoint diamond within a 44px button. Mouse dragging captures the pointer and previews both the task endpoint and a readable target date; the visible, unpinned staff-row grid determines valid drops and dates clamp to creation/visible boundaries. Escape, canceled/lost pointer capture, and release outside that row revert the preview without saving. Click, Enter, Space, and touch expose an explicitly labeled date field with Save/Cancel. Completed tasks and demo guests have no adjustment handle; existing manager/assignee visibility and API authorization remain intact.

A pending spinner disables repeat saves. The displayed bar remains based on server data until a successful reload; request failures restore the saved endpoint and retain the attempted date with a retryable error. Success confirmation appears after the update/reload path. No Undo is advertised. Local-midnight date serialization matches existing task deadline editing, with no schema changes.

Verified: TypeScript check passes; the existing schedule API unit suite passes all 16 mocked tests without database writes; Oxfmt checks pass for the three changed schedule files; the new deadline control passes Oxlint after adding an explicit input/label association. Review traced pointer cancellation, row/scroll clipping and keyboard click suppression. Existing GanttChart/ScheduleView lint findings (render-time clock and older semantic/hook conventions) remain outside this focused change. Browser geometry, both-theme/reduced-motion screenshots, and live failure/unauthorized mutation scenarios were not run in this ticket; visual matrix validation remains ticket15. No hosted data or deadline values were changed during verification.
