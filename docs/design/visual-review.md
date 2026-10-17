# Integrated visual review

Completed 2026-10-17 against the owner's revised design/demo scope on `integration/visual-overhaul`.

## Verified presentation

Playwright CLI captured final Reports (all three tabs), Tasks and Calendar in both themes at 1440×900. Calendar month/week/day navigation works with real deadline buckets; shared inspection retains context. Mobile Reports and Calendar have no document horizontal overflow at 390×844. Dark mobile creation retains its fixed actions and scrollable fields. Screenshots: `/tmp/nodal-final-{report,task,team,tasks,month}-{light,dark}.png`, `/tmp/nodal-final-report-mobile-{light,dark}.png`, `/tmp/nodal-final-calendar-mobile-{light,dark}.png`, `/tmp/nodal-final-create-mobile-dark.png`, `/tmp/nodal-final-inspector-dark.png`.

Scoped Customer Portal Revamp timeline shows blue active work, red overdue/blocked work, actual weekends/today, readable short-bar labels and accessible deadline popover. Opened and canceled the date editor without saving. Screenshot `/tmp/nodal-final-schedule-dark.png`. Reduced-motion emulation confirmed the preference; token contrast evidence remains in visual-system.md. This is targeted verification, not an exhaustive accessibility certification.

Fixed invalid legacy HSL wrappers in six shared popovers, unified progress and editable error/link colors, and removed doubled report section spacing. Final reviewer identified stale inspector data after a successful property save; fixed by refreshing the client-fetched task while keeping content mounted. A database-free save → re-edit → Cancel regression confirms the latest saved value remains visible.

## Checks and review

- TypeScript and production build passed.
- Unit suite: 28 files, 593 tests passed.
- Component suite after updating obsolete layout/mouse expectations and inspector mocks: 16 files, 189 tests passed.
- Code review since `eb4b2d9`: Standards 0 material findings; Spec 1 material finding, corrected by `038ebbd`.
- Existing broad Oxlint/format backlog remains; no blanket suppression or unrelated cleanup.

No hosted seeding, project-data mutation tests, deployment or account reconstruction. Exhaustive failure/loading/empty-state permutations and backend mutation regressions remain outside the revised delivery scope. Earlier ticket evidence covers guest/auth/notification presentation; the final recording uses the existing local presenter.
