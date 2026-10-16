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

