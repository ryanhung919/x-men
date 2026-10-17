# Visual overhaul ticket index

Implementation is active on `integration/visual-overhaul`, using isolated ticket worktrees. Work only on tickets whose blockers are complete. Triage remains `ready-for-agent`; individual `Resolution:` fields and validation evidence record delivered work against the revised scope.

The parent spec remains unchanged. The user subsequently approved project-scoped toolchain and library upgrades before visual implementation, Context7 documentation lookup, and using existing CSS animation utilities without adding GSAP or Lenis. Tickets 01–02 capture those additions.

| Ticket | Blocked by |
| --- | --- |
| [01: Upgrade the project toolchain with working application and CI](issues/01-upgrade-project-toolchain.md) | None |
| [02: Upgrade application libraries while preserving workflows](issues/02-upgrade-application-libraries.md) | 01 |
| [03: Establish the blue/red visual system through Logged Time Reports](issues/03-reports-visual-foundation.md) | 02 |
| [04: Unify navigation and page framing](issues/04-navigation-page-framing.md) | 03 |
| [05: Focus task browsing and preserve scope across views](issues/05-task-browsing-scope.md) | 04 |
| [06: Introduce shared task inspection and inline properties](issues/06-shared-task-inspector.md) | 05 |
| [07: Refine task collaboration in inspection and detail views](issues/07-task-collaboration.md) | 06 |
| [08: Streamline creation, subtask creation, and archiving](issues/08-task-creation-archive.md) | 06 |
| [09: Polish Calendar day, week, and month views](issues/09-calendar-views.md) | 06 |
| [10: Make the staff timeline readable and connected](issues/10-staff-timeline.md) | 06 |
| [11: Make deadline adjustment precise and accessible](issues/11-deadline-adjustment.md) | 10 |
| [12: Redesign report navigation and comparisons](issues/12-report-comparisons.md) | 04 |
| [13: Connect supported report measures to matching tasks](issues/13-report-task-drilldown.md) | 05, 12 |
| [14: Finish notifications, authentication, and guest presentation](issues/14-supporting-screens.md) | 04 |
| [15: Validate the complete visual experience and close integration gaps](issues/15-integrated-visual-validation.md) | 07, 08, 09, 11, 13, 14 |
| [16: Produce and integrate the one-minute portfolio showcase](issues/16-portfolio-showcase.md) | 15 |

Each ticket contains its own acceptance criteria and spec-story coverage. Main workflow tickets must validate both themes and relevant accessibility/responsive states before completion; ticket 15 verifies their integration, and ticket 16 creates the portfolio showcase.

## Delivery priority

The owner revised scope on 2026-10-17: prioritize the visual overhaul and recording, with minimal supporting logic. Finish the current coherent toolchain changes; hold unrelated application migrations. See the scope revision in the spec and each ticket. Completion is assessed against the revised scope, with actual verification recorded.

## Implementation record

- Baseline: `cefe280` preserves the approved spec, tickets, and adopted Oxlint/Oxfmt setup.
- Screenshot/video tooling clarification: `23bae0b` records Playwright CLI and FFmpeg.
- Completion is recorded separately from triage using a ticket's `Resolution:` field and checked acceptance criteria, with validation evidence under Comments. Unverified acceptance criteria remain unchecked.
- Local browser preparation confirmed a populated loopback Supabase instance. Existing hosted demo data must remain untouched.

