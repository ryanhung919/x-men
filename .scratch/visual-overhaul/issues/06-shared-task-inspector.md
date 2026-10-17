# 06: Introduce shared task inspection and inline properties

**What to build:** Users inspect and edit authorized task properties beside their current work without losing context, while direct task URLs still work.

**Blocked by:** 05: Focus task browsing and preserve scope across views.

**Status:** ready-for-agent

## Owner scope revision — 2026-10-17

Prioritize presentable design and the portfolio recording; implement only necessary supporting logic. See the revised delivery priority in `../spec.md`. Broad library migrations, unrelated correctness cleanup, and exhaustive regression/failure-path testing are deferred. Use both-theme Playwright CLI visual checks, build/type checks, and targeted demo-path validation. Record completion against this revised scope and distinguish unverified original checklist items from verified work.

## Spec coverage

15–18, 20, 35–38.

## Acceptance criteria

- [ ] Prefactor existing detail content and property editors into a reusable task inspection boundary without changing data contracts; deliver it through the task-list entry point in this ticket.
- [ ] Open a desktop inspector that preserves originating filters, sorting, scroll position, and task selection. Use a full-screen mobile treatment and retain full-detail navigation/deep links.
- [ ] Lay out title/description and collaboration content as the main reading area with a compact properties area for status, priority, deadline, assignees, project, recurrence, and related metadata.
- [ ] Preserve current property editing behavior and validations; do not imply editable project fields where the existing workflow does not support them.
- [ ] Show local pending/success/failure feedback and retain recoverable input on failed edits. Refresh affected task summaries and originating content without full context loss.
- [ ] Display guest properties read-only with understandable restrictions. Preserve role-based assignment and other editor permissions at UI and server boundaries.
- [ ] Implement keyboard opening, Escape/close behavior, focus containment and restoration, meaningful headings, and usable inspector loading/not-found/error states.
- [ ] Keep existing subtasks/comments/attachments reachable while their visual refinement follows in ticket 7.
- [ ] Expose a reusable way for Calendar and Schedule to inspect a task without duplicating modal logic.
- [ ] Verify list opening/closing, direct URL access, mobile behavior, permissions, and success/failure editing paths using existing task lifecycle tests and Playwright CLI.

## Execution constraints

- Use the approved NODAL visual-overhaul spec and later user-approved upgrade prerequisite. Existing data model, report calculations, accounts, permissions, and rich demo scenarios remain the baseline.
- Use Context7 CLI for current library/tool documentation when needed, following the session instructions; do not infer that an installed skill guarantees MCP tool access.
- Test externally observable outcomes. Reuse the browser-level seam, existing Playwright suites, and globally installed Playwright CLI. Verify isolated database targeting before running tests that seed or mutate data.
- Preserve unrelated user changes. No hosted reseed, deployment, broad machine-wide upgrades, or unrelated portfolio changes.

## Resolution: implemented (revised scope)

2026-10-17: extracted a reusable task-detail presentation shared by direct URLs and a contextual Radix Sheet. Desktop uses a readable960px panel, mobile fills the viewport; description/subtasks/files/discussion occupy the main reading area and properties a compact sidebar. Existing task editors and PATCH contracts remain. List anchors open the inspector on normal/keyboard activation while retaining real URLs and modified-click navigation. Dashboard-level provider and `useTaskInspector` in `components/tasks/task-inspector-context.ts` support Calendar/Schedule downstream integration.

Added authenticated GET through the existing session/RLS task-detail service with positive integer validation, private/no-store response and unavailable/error handling. Response stays flat for attachment refetch compatibility. Guest receives no staff directory and mounts no task editors, upload/comment/delete/create/archive controls; explicit read-only copy accompanies readable properties/records. Assignment removal and archiving retain existing manager permissions. Existing server/RLS write guards unchanged.

Property save callbacks refresh originating server data while retaining mounted browser scope. Subtask creation no longer reloads the whole page; structural refresh callback refetches the inspector. Archive callback closes the inspector without navigating Schedule away. Accessible editor labels, keyboard title/description editing, blue save controls and toast errors replace alert-based status/priority failures where touched. Collaboration refinement continues07.

Verified Node24.22.0/pnpm12.14.0 typecheck and production build. Playwright CLI references `/tmp/nodal-ticket06-shots/`: light/dark inspector, mobile390x844, direct full detail, guest dark. Browser checks: keyboard Enter opens; Escape restores exact opening link focus and search;12Tab steps remain contained; full-page action uses `/tasks/1` with same content; mobile panel390px/no page overflow; local guest has read-only view/no write controls and GET returns empty allUsers plus flat attachments. Presenter edits were opened visually but no changes submitted. No seeds/hosted mutations.

Unverified original checklist: mutation success/failure lifecycle and all editor keyboard combinations, race/error recovery under network failure, exhaustive role matrix and every mobile property overlay. Supporting layout/error states implemented; thorough regression remains deferred under owner design/demo scope.07 should compact default attachment upload UI and replace the temporary generic title helper with concise real metadata so discussion appears sooner.
