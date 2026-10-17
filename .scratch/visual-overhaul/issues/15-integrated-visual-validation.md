# 15: Validate the complete visual experience and close integration gaps

**What to build:** The completed application has consistent, verified behavior and visual quality across workflows, themes, and viewport sizes.

**Blocked by:** 07: Refine task collaboration in inspection and detail views; 08: Streamline creation, subtask creation, and archiving; 09: Polish Calendar day, week, and month views; 11: Make deadline adjustment precise and accessible; 13: Connect supported report measures to matching tasks; 14: Finish notifications, authentication, and guest presentation.

**Status:** ready-for-agent

## Owner scope revision — 2026-10-17

Prioritize presentable design and the portfolio recording; implement only necessary supporting logic. See the revised delivery priority in `../spec.md`. Broad library migrations, unrelated correctness cleanup, and exhaustive regression/failure-path testing are deferred. Use both-theme Playwright CLI visual checks, build/type checks, and targeted demo-path validation. Record completion against this revised scope and distinguish unverified original checklist items from verified work.

## Spec coverage

1–38; recording readiness for 39–43.

## Acceptance criteria

- [ ] Create a review matrix covering light/dark tasks, inspector/full detail, creation/subtasks, collaboration/attachments/recurrence, calendar day/week/month, schedule, all reports/exports, notifications, and authentication/error surfaces.
- [ ] Use the globally installed Playwright CLI for browser inspection and screenshots, alongside existing automated workflow suites. Record observed outcomes; a passing build alone is not visual validation.
- [ ] Check palette semantics, typography, spacing, control sizes, radii, gutters, layering, chart labels/units/tooltips, and long/empty/dense content. Fix cross-screen inconsistencies without postponing unfinished feature work into this ticket.
- [ ] Validate text and applicable UI contrast against WCAG AA targets, non-color status cues, visible focus, logical keyboard order, dialog focus restoration, and touch alternatives.
- [ ] Review desktop capture composition at the existing recorder size and actual portfolio embed scale, plus mobile layouts. Resolve clipped actions, accidental nested scrolling, and unreadable data.
- [ ] Verify restrained control/panel motion, reduced-motion equivalents, no decorative hover scaling, and native scrolling without GSAP/Lenis additions.
- [ ] Exercise loading, filtered-empty, true-empty, save-pending, failure, and recovery behavior without misleading stale states.
- [ ] Verify guest/read scope and authorized editing end to end; preserve seeded content and intentional notification exceptions. Run database-mutating suites only against confirmed isolated local services.
- [ ] Run appropriate build/type/lint and existing task, report/export, auth/preference, calendar, schedule, and notification checks once fixes settle; document limitations honestly.
- [ ] Deliver a concise visual review record with representative screenshots and coverage of every main feature group, suitable for planning the final silent recording.

## Execution constraints

- Use the approved NODAL visual-overhaul spec and later user-approved upgrade prerequisite. Existing data model, report calculations, accounts, permissions, and rich demo scenarios remain the baseline.
- Use Context7 CLI for current library/tool documentation when needed, following the session instructions; do not infer that an installed skill guarantees MCP tool access.
- Test externally observable outcomes. Reuse the browser-level seam, existing Playwright suites, and globally installed Playwright CLI. Verify isolated database targeting before running tests that seed or mutate data.
- Preserve unrelated user changes. No hosted reseed, deployment, broad machine-wide upgrades, or unrelated portfolio changes.


## Resolution: implemented

Completed targeted visual integration checks against the revised design/demo scope. Fixed shared popover surfaces, progress/error/link token consistency and report spacing. Reviewed both themes and mobile containment, real calendar views, task inspection/creation and scoped deadline controls. Corrected the review finding about stale inspector values after save, backed by a database-free regression.

TypeScript, production build, 593 unit tests and 189 component tests pass. Full evidence, screenshot paths, two-axis review and honest deferred coverage: `docs/design/visual-review.md`. Existing broad lint debt was not suppressed or expanded into unrelated cleanup.
