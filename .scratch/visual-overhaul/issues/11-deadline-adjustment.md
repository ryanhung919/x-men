# 11: Make deadline adjustment precise and accessible

**What to build:** Authorized users change deadlines confidently through a visible drag preview or an equivalent accessible date control.

**Blocked by:** 10: Make the staff timeline readable and connected.

**Status:** ready-for-agent

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

