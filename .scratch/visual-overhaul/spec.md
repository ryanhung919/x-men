# NODAL visual overhaul and portfolio showcase

Status: ready-for-agent

## Problem Statement

NODAL already supports substantial workforce and project management workflows, but inconsistent visual hierarchy, dense task metadata, disconnected views, and generic component styling obscure that depth. Its owner wants a sophisticated, distinctive SaaS interface suitable for a personal portfolio without sacrificing everyday usability.

The portfolio showcase is a single, silent, caption-free, approximately one-minute recording played behind an existing translucent layer. It must communicate the breadth of the product quickly and show both light and dark modes. The owner particularly values the existing reports' vibrant light/dark blues and red against black.

The existing guest account, rich seeded scenarios, permissions, and data model are already established. This is a visual overhaul, not a database redesign or new demo-environment project.

## Solution

Unify NODAL as a calm, precise workspace connecting people, tasks, schedules, and delivery information. Retain the reports' blue/red identity across the application; refine typography, surfaces, layout, hierarchy, and interaction feedback in both themes. Make existing features easier to discover and understand through consistent navigation, compact task views, shared task inspection, a polished staff timeline, and clearer report comparisons.

Produce one professional recording that showcases all main screens and feature groups. Open inside the authenticated application, emphasize reporting as the owner's stated contribution, and switch from light to dark on Reports, where the colored charts make the change most visible. Use deliberate browsing and composed frames suitable for the existing portfolio presentation; some features are presented visibly rather than exercised end to end within sixty seconds.

## User Stories

1. As a team member, I want consistent typography and spacing, so that every screen feels like part of the same product.
2. As a user, I want recognizable blue positive/progress states and red problem states, so that I can interpret work consistently across views.
3. As a user, I want labels and icons alongside colors, so that status meaning does not depend on color perception.
4. As a light-mode user, I want readable blues and reds on pale surfaces, so that charts and controls retain clear contrast.
5. As a dark-mode user, I want vibrant blues and reds against a near-black canvas, so that the existing reporting identity is preserved.
6. As a user, I want my system or saved theme preference respected, so that the app opens comfortably.
7. As a user, I want navigation to identify my current destination, so that I can orient myself immediately.
8. As a user, I want consistent page titles and action placement, so that switching screens does not require relearning the layout.
9. As a user, I want visible navigation links to lead somewhere useful, so that I do not encounter unfinished profile or settings destinations.
10. As a team member, I want an actionable task summary, so that I can see active, overdue, and upcoming work at a glance.
11. As a team member, I want a readable default task table, so that titles and important properties remain prominent.
12. As a team member, I want secondary metadata accessible through display controls, so that simplifying the table does not remove information.
13. As a team member, I want task search and useful filter presets, so that I can quickly find relevant work.
14. As a team member, I want filters and completion visibility preserved between List and Calendar, so that changing presentation does not unexpectedly change scope.
15. As a team member, I want task inspection without losing my list or calendar context, so that I can investigate and continue working efficiently.
16. As a user, I want direct task links and a full detail view, so that tasks remain shareable and usable independently.
17. As a task collaborator, I want descriptions, subtasks, comments, and attachments easy to reach, so that I can understand progress and context quickly.
18. As an authorized editor, I want compact inline property editing with visible saving and failure feedback, so that I know whether changes succeeded.
19. As a task creator, I want essential fields prioritized and optional configuration progressively revealed, so that creation feels manageable.
20. As a user managing recurring work, I want recurrence visible and understandable in lists, details, and calendars, so that repeated work is recognizable.
21. As a calendar user, I want consistent status styling across day, week, and month views, so that dates and task states are easy to scan.
22. As a schedule user, I want person labels and date headers to stay visible while scrolling, so that timeline bars remain understandable.
23. As a schedule user, I want clear today and weekend indicators, so that I can orient tasks in time.
24. As a schedule user, I want readable task bars and contextual inspection, so that I can identify the work behind a schedule entry.
25. As an authorized schedule editor, I want a larger deadline handle and live date preview, so that adjusting a deadline is predictable.
26. As a keyboard or touch user, I want an alternative to dragging deadlines, so that scheduling remains accessible.
27. As a schedule user, I want bars labeled according to their actual date semantics, so that creation-to-deadline spans are not mistaken for allocated effort.
28. As an authorized report viewer, I want report types visibly discoverable, so that I can explore completion, logged time, and team summaries.
29. As a report viewer, I want consistent department, project, and date scope, so that comparisons have an understandable context.
30. As a report viewer, I want aligned charts and numerical comparisons, so that I can compare people and task states efficiently.
31. As a report viewer, I want metric units and definitions, so that I understand what each number measures.
32. As a report viewer, I want existing PDF and spreadsheet exports preserved, so that visual improvements retain practical reporting functionality.
33. As a report viewer, I want supported chart drill-downs to matching tasks, so that I can investigate the work behind a measure.
34. As a user, I want clear notifications and restrained interaction feedback, so that updates are noticeable without distracting motion.
35. As a user, I want distinct loading, empty, filtered-empty, saving, and error states, so that I understand what the application is doing.
36. As a user with reduced-motion preferences, I want nonessential animation suppressed, so that the interface remains comfortable.
37. As a mobile user, I want usable navigation, task details, filters, and alternative timeline interactions, so that the redesign is not desktop-only.
38. As a guest visitor, I want demo restrictions explained before attempting unavailable edits, so that the application feels intentional rather than broken.
39. As a portfolio viewer, I want to see the main screens and feature groups in one minute, so that I can understand the product without narration.
40. As a portfolio viewer, I want to see the reports switch from light to dark, so that the application's visual range is evident.
41. As a portfolio owner, I want a caption-free, silent recording with deliberate cursor movement, so that it looks professional behind the portfolio's translucent layer.
42. As a portfolio owner, I want the showcase to use existing rich scenarios without mutating them, so that recording does not damage the demonstration dataset.
43. As a portfolio owner, I want a strong poster and a composed loop boundary, so that paused and repeated playback remain attractive.

## Implementation Decisions

- **Design foundation:** retain the reports' light and dark blues as the brand anchor. Blue communicates affirmative actions, progress, and success; red communicates blocked, overdue, failed, and destructive states. Neutral styling covers ordinary cancellation, unselected controls, and absence of a condition. Distinguish progress and completion with labels and icons rather than hue alone. Preserve numerical priority meaning rather than treating every high-priority task as failed work.
- **Theme treatment:** light mode uses a pale blue-gray canvas and clear white working surfaces. Dark mode preserves a near-black canvas with distinguishable surface levels and bright chart accents. Tune foreground/background combinations separately; do not mechanically reuse low-contrast light-theme shades. Consolidate overlapping color-token definitions and inconsistent color-function usage.
- **Typography and geometry:** apply the already-loaded Geist Sans to the interface; use Geist Mono sparingly for identifiers and tabular numerals for metrics. Establish consistent type hierarchy, spacing, control heights, borders, and corner radii. Prefer restrained shadows and clear surface separation.
- **Application frame:** retain compact top navigation initially, with active-route indication, consistent headers, and predictable primary actions. Rename Report to Reports. Resolve unfinished navigation destinations by removing or redirecting unsupported links rather than introducing unscoped settings/profile products. Defer a large sidebar until saved views or project navigation justify it.
- **Tasks:** make title, status, priority, deadline, assignees, and project the default table information. Move secondary metadata to quiet indicators and optional columns. Align search, filters, display controls, and view selection in one coherent toolbar. Add useful derived summaries and filter presets using existing task information. Preserve filtering and completion visibility across list/calendar transitions.
- **Task inspection:** share an inspector across task list, calendar, and schedule. Desktop inspection preserves the originating view; mobile uses a full-screen treatment. Retain existing task URLs and focused detail access. Group description, subtasks, attachments, and discussion in the reading area, with a compact properties area. Reuse existing editors and permission checks.
- **Task creation and editing:** prioritize required fields and progressively disclose optional recurrence, tags, and attachments without weakening validation. Show local pending/success/failure feedback. Preserve all current task operations, including authorized creation, editing, comments, assignment, recurrence, attachment handling, and archiving.
- **Calendar and timeline:** use the shared status language. Improve today/weekend cues, task previews, timeline legibility, sticky labels and headers, and empty states. Deadline adjustment gains a usable handle, live preview, visible save result, and keyboard/touch alternative. Offer Undo only if a correct reverse operation is implemented; otherwise provide clear success or recovery feedback.
- **Date semantics:** existing timeline starts derive from creation time, and completion-related metrics use update time. Preserve these calculations and describe them accurately. Do not advertise effort allocation, capacity, overload detection, or definitive completion timestamps that the current model cannot establish.
- **Reports:** expose existing report types as visible tabs, retain scope controls and exports, and establish a clear hierarchy of key measures, one dominant visualization, and compact comparisons. Replace repetitive per-person pies where aligned bars and values communicate comparison better. Reuse the blue/red status vocabulary. Chart drill-downs are limited to measures with an exact supported task mapping and must preserve scope and permissions; omit unsupported affordances.
- **Feedback and motion:** replace decorative hover scaling and bell rotation with restrained surface changes. Use approximately 120–180ms control transitions and 180–240ms panel transitions, with reduced-motion support. Preserve readable content during refresh and provide layout-matched loading placeholders. Differentiate no data, no matching results, and errors.
- **Guest and demo data:** preserve the existing guest credentials, role scope, seeded scenarios, and write restrictions. Do not blanket-disable operations that are intentionally allowed, such as the guest's own notification handling. Render unavailable task edits as understandable read-only affordances. Do not reseed hosted data as part of visual work.
- **Recording implementation:** adapt the existing browser recorder, including its eased visible cursor and timing marks. Authenticate before the delivered footage begins. Use the existing recording persona for browsing; no task mutations, submitted creation forms, destructive actions, or unnecessary export downloads in the showcase. Controls can be opened and dismissed to demonstrate features.
- **Recording coverage:** cover reports and report switching/filtering/export affordances; tasks, search/filter/display controls; task inspection and inline edit affordances; subtasks, comments, attachments, and recurrence; calendar; staff schedule; notifications; and theme switching. Creation controls can be briefly presented without submission. Authentication/recovery/error routes are outside the core feature tour. All main feature groups must be represented, but not every option exercised.
- **Recording composition:** deliver a 60-second target, allowing at most one second of encoding variance, without audio, captions, or added narration text. Switch light to dark on a report screen with several colored elements. Give reports prominent opening/closing treatment, deliberate pauses, limited scrolling, and restrained pointer feedback. Final timing should follow the validated interface rather than force an unreadable click sequence.
- **Portfolio compatibility:** produce MP4 and WebM versions of the same recording plus a matching poster. Preserve the existing portfolio's muted looping presentation and translucent layer. Validate the result at its actual embedded size and overlay opacity, not only full-screen. Update media references/poster timing only as necessary; avoid unrelated portfolio redesign.
- **Prioritization:** implement the visual system and application frame first, then tasks and shared inspection, then schedule/report refinement and remaining screen consistency, then recording and integration. Persistent saved views and a focused keyboard command menu remain accepted follow-up opportunities, not prerequisites for this visual-overhaul delivery. Kanban remains deferred new functionality.

## Testing Decisions

- Use the existing browser-level application boundary as the primary seam. Test visible behavior and user outcomes, not component internals, Tailwind class strings, or exact implementation structure.
- Reuse existing Playwright task-lifecycle coverage, reporting workflow and PDF/spreadsheet export tests, route/access-control coverage, and theme/default-view preference tests. Adapt selectors to accessible names and final behavior rather than introducing duplicate test infrastructure.
- The globally installed Playwright CLI is available for interactive inspection, screenshots, keyboard walkthroughs, and visual verification of light/dark and responsive behavior. The CLI and automated suite exercise the same application boundary; a second component architecture is unnecessary.
- Verify task filter continuity across views, inspector opening/closing and focus restoration, deep links, permitted inline edits, deadline preview/commit/recovery, and report filtering/export outcomes. Exercise mutations only against isolated test data.
- Verify guest restrictions and intended notification exceptions through the existing permission tests and a read-only guest walkthrough. Preserve role and department scope across all new entry points.
- Validate both themes across tasks, task detail/creation, day/week/month calendar, schedule, reports, notifications, and authentication surfaces. Check readable text, chart labels, status distinction, focus visibility, keyboard navigation, dialog focus handling, and mobile overflow. Use WCAG AA contrast targets for text and applicable controls; preserve labels/icons as non-color cues.
- Use visual review and targeted browser screenshots for reversible styling changes rather than writing tests that simply repeat CSS values. Existing theme-token tests may be updated where they enforce a meaningful token contract.
- Check reduced-motion behavior and loading/empty/error states at the browser seam. Avoid broad test expansion unrelated to changed behavior.
- Inspect the test setup before execution: the existing end-to-end global setup seeds a database. Run it only against a confirmed isolated test database, never the hosted demo merely because credentials are present.
- Validate the recording's duration, absence of audio/captions, main-feature coverage, visible report-theme switch, legibility behind the actual portfolio layer, coherent loop, and matching poster. Confirm both encoded formats play in the existing portfolio player. Recording remains browsing-only and separate from mutation tests.

## Out of Scope

- Rebuilding the data model, changing report calculations, adding planned-start/completion fields, changing API contracts, or migrating schemas unless a required approved interface change makes it necessary. Document any such dependency before expanding scope.
- Recreating guest accounts, replacing rich demo data, refreshing dates through a destructive hosted reseed, or building a new resettable visitor sandbox.
- Implementing Kanban, capacity forecasting, dependency scheduling, AI features, or a new standalone project-management workspace.
- Persistent saved views, a global command menu, and a large project sidebar in the initial visual-overhaul delivery.
- Captions, narration, music, login credential footage, separate theme-specific videos, flashy decorative animations, and marketing overlays inside the recording.
- Unrelated portfolio architecture, copy, theme, or overlay redesign.
- Automated deployment, remote Git operations, or changes to the repository remote as part of specification/setup work.

## Further Notes

- The user approved this direction after a design interview. Blue/red supersedes the original teal proposal; the final silent background-video brief supersedes earlier captioned/presenter-demo proposals. Existing data semantics supersede the earlier suggestion to add timestamp fields now.
- The repository was renamed to nodal on GitHub according to the user. Local Markdown was selected as the issue tracker to minimize tool-call overhead; GitHub publication is not part of this spec.
- Source inspection found a deliberately rich fictional dataset with blocked and overdue work, nested subtasks, recurrence, discussion, attachments, and varied reporting outcomes. Source inspection does not verify the current hosted database contents.
- Seed dates are relative to seed execution, not continuously refreshed. Inspect current visible data before recording and choose existing appropriate scopes/date ranges without resetting hosted data.
- The current recording infrastructure already supplies browser capture, eased cursor movement, and timing marks. Extend it rather than introducing a separate recorder.
- Portfolio media currently references one recording in two formats and a poster. Both themes belong in that one recording, with the switch on Reports.
- Completion means a coherent, usable visual overhaul of the existing main workflows in both themes, validated permissions and behavior, and the specified portfolio-compatible showcase artifacts. The specification itself authorizes no implementation during this documentation task.
