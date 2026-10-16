# 07: Refine task collaboration in inspection and detail views

**What to build:** Users understand a task's supporting work, discussion, recurrence, and files without excessive scrolling or duplicated presentation.

**Blocked by:** 06: Introduce shared task inspection and inline properties.

**Status:** ready-for-agent

## Spec coverage

17–18, 20, 35–38.

## Acceptance criteria

- [ ] Refine descriptions, notes, subtasks, tags, recurrence, attachments, and comments in both inspector and full detail views using shared presentation.
- [ ] Show subtask titles, statuses, due information, and appropriate counts with clear hierarchy; preserve nested task navigation and a predictable path back.
- [ ] Make discussion readable with author identity, timestamps, ordering, and comment actions; preserve authorized creation/edit/delete behavior.
- [ ] Present attachment name, type, size where available, and available actions clearly; retain upload/download behavior, validation, progress, errors, and supported limits.
- [ ] Keep notes and recurrence understandable without oversize empty sections. Show the existing recurrence schedule truthfully and preserve editing rules.
- [ ] Render guest and role-specific actions accurately, including clear read-only affordances and authorized destructive confirmations.
- [ ] Provide focused empty states for no subtasks, no attachments, and no comments rather than one generic blank panel.
- [ ] Ensure long descriptions, filenames, tags, and discussion content remain usable on mobile and in both themes.
- [ ] Verify nested navigation, comments, attachments, tags, and recurrence with existing workflow tests on isolated data; check focus and visual hierarchy through browser inspection.

## Execution constraints

- Use the approved NODAL visual-overhaul spec and later user-approved upgrade prerequisite. Existing data model, report calculations, accounts, permissions, and rich demo scenarios remain the baseline.
- Use Context7 CLI for current library/tool documentation when needed, following the session instructions; do not infer that an installed skill guarantees MCP tool access.
- Test externally observable outcomes. Reuse the browser-level seam, existing Playwright suites, and globally installed Playwright CLI. Verify isolated database targeting before running tests that seed or mutate data.
- Preserve unrelated user changes. No hosted reseed, deployment, broad machine-wide upgrades, or unrelated portfolio changes.

