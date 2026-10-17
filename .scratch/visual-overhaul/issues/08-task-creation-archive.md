# 08: Streamline creation, subtask creation, and archiving

**What to build:** Authorized users create tasks and subtasks through a focused form and archive work with clear consequences and feedback.

**Blocked by:** 06: Introduce shared task inspection and inline properties.

**Status:** ready-for-agent

## Owner scope revision — 2026-10-17

Prioritize presentable design and the portfolio recording; implement only necessary supporting logic. See the revised delivery priority in `../spec.md`. Broad library migrations, unrelated correctness cleanup, and exhaustive regression/failure-path testing are deferred. Use both-theme Playwright CLI visual checks, build/type checks, and targeted demo-path validation. Record completion against this revised scope and distinguish unverified original checklist items from verified work.

## Spec coverage

18–20, 35–38.

## Acceptance criteria

- [ ] Place required project/title/description/assignment/deadline/status/priority inputs according to actual existing validation; preserve required-field rules rather than silently weakening them.
- [ ] Group optional recurrence, tags, and attachments behind clear progressive disclosure while retaining discoverability.
- [ ] Retain assignee/project selection, recurrence choices, file limits, and validation messages. Keep selected values and recoverable input when submission fails.
- [ ] Give task and subtask creation consistent visual structure; preserve inherited parent/project context and existing constraints.
- [ ] Show pending state, prevent duplicate submission, and update the originating task view after success without losing unrelated filters.
- [ ] Keep forms usable at narrow widths with reachable actions, keyboard focus, and scrolling that does not hide validation errors.
- [ ] Refine archive placement and confirmation, including existing subtask implications and permission rules. Show clear success/failure outcomes.
- [ ] Explain guest restrictions before submission; do not submit blocked mutations just to discover the restriction.
- [ ] Verify creation, recurrence, attachments, subtask inheritance, and archiving on isolated test data. Inspect all form states in both themes.

## Execution constraints

- Use the approved NODAL visual-overhaul spec and later user-approved upgrade prerequisite. Existing data model, report calculations, accounts, permissions, and rich demo scenarios remain the baseline.
- Use Context7 CLI for current library/tool documentation when needed, following the session instructions; do not infer that an installed skill guarantees MCP tool access.
- Test externally observable outcomes. Reuse the browser-level seam, existing Playwright suites, and globally installed Playwright CLI. Verify isolated database targeting before running tests that seed or mutate data.
- Preserve unrelated user changes. No hosted reseed, deployment, broad machine-wide upgrades, or unrelated portfolio changes.


## Resolution: implemented

2026-10-17 delivered under owner's revised visual/demo scope. Creation now uses a680px focused dialog with scrollable body/pinned actions, prominent title/context and grouped required project/deadline/assignment/status/priority. Primary Create Task is blue; subtask action secondary. Native More options reveals recurrence/tags/files while keeping selected values, file limits50MBtotal/max10 and actual required-field validation unchanged. Creation priority remains original1–9 offer; existing API1–10 untouched. Repeat interval copy correctly says every1/7/30days. Project inheritance remains locked for subtasks.

Keyboard-accessible project/user choices and connected labels, clear file Browse button, removable-item names, problem token validation/file errors. Prevent duplicate creation and dismissal during pending request; failures preserve input and focus footer error. Existing06subtask/inspector refresh callbacks retained; linking failure honestly reports that task was created but linkage failed rather than silent reload/alert. Guests receive existing demo_viewer capability from server role helper and see read-only explanation without mounting a submission form. No permission/data/schema changes.

Archive stays manager-only through existing parent/API, with quiet red outline trigger and true red final confirmation including current subtask implications. Pending/error/success and06context callback preserved.

Validation: typecheck, production build/start, targeted creation/selector/upload/archive lint pass;15 existing archive unit tests pass. CLI screenshots inspected:1440x900 creation light/dark, optionalEvery30days,390x844 scrollbody/sticky actions (footer reachable true; overflow false), inherited subtask project (visible1), canceled archive confirmation (visible1), guest explanation (visible1; editableforms0). Artifacts `/tmp/nodal08-{create-light,create-dark,options-dark,create-mobile,subtask,archive,guest}.png`. No submit, archive, uploads, seeds, or preference writes. Mutation/failure-path matrix deferred under revised scope.
