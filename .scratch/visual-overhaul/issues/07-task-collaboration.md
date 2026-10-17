# 07: Refine task collaboration in inspection and detail views

**What to build:** Users understand a task's supporting work, discussion, recurrence, and files without excessive scrolling or duplicated presentation.

**Blocked by:** 06: Introduce shared task inspection and inline properties.

**Status:** ready-for-agent

## Owner scope revision — 2026-10-17

Prioritize presentable design and the portfolio recording; implement only necessary supporting logic. See the revised delivery priority in `../spec.md`. Broad library migrations, unrelated correctness cleanup, and exhaustive regression/failure-path testing are deferred. Use both-theme Playwright CLI visual checks, build/type checks, and targeted demo-path validation. Record completion against this revised scope and distinguish unverified original checklist items from verified work.

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


## Resolution: implemented (revised scope)

2026-10-17: shared task-detail content now gives description, subtasks, files and discussion a compact hierarchy in both contextual inspection and full detail routes. Removed the generic affirmative filler beneath the title; save feedback appears only after an update. Subtasks include completed/total counts, task IDs and due dates; local inspector history provides a Back control for nested task inspection without data/API changes.

Files use compact name/type/open/remove rows, with upload collapsed behind Add files so discussion appears sooner. Existing FileUploadZone file counts, selected-file sizes,50MB total/10-file limits, progress/error behavior and upload/download routes remain. Stored attachments do not supply byte sizes, so none are invented. Healthy upload capacity stays blue; validation failures use problem tokens. Discussion preserves comment ordering, authors, timestamps, edit/admin-delete rules and5000-character validation while using quiet avatar rows, readable text and blue save actions. Notes remain collapsed, tags/long text wrap, recurrence labels reflect actual daily/weekly/monthly rules and read-only recurrence includes its start date when available.

Validation: exact-runtime typecheck and production build pass. Presenter Playwright checks opened/cancelled upload, add-comment and edit-comment controls without submission; nested subtask inspection and Back passed. Shared full-page and drawer screenshots in light/dark and390px layouts are saved `/tmp/nodal07-*.png`;390px inspector page width remains390. Guest rich-task inspection hides upload/comment/create/archive actions. Browser console has only the pre-existing favicon404, no application errors. No database mutations, file downloads, seeded-data changes or hosted reseed. Comprehensive mutation suites remain deferred under the owner’s revised scope.

Environment safeguard: automatic approval review rejected copying a private environment file. The safe alternative generated an ignored0600 localhost-only runtime directly from running local Supabase status, with loopback URLs verified and credentials never printed; no private/hosted environment files were read.
