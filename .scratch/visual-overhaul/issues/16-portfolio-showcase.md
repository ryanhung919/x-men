# 16: Produce and integrate the one-minute portfolio showcase

**What to build:** Portfolio visitors see a professional one-minute silent showcase of NODAL's main screens and feature groups in both themes behind the existing translucent layer.

**Blocked by:** 15: Validate the complete visual experience and close integration gaps.

**Status:** ready-for-agent

## Spec coverage

39–43, with visible coverage of 1–38.

## Acceptance criteria

- [ ] Adapt the existing recorder and timing marks rather than building a new recording framework. Use the existing recording persona and authenticate before final footage begins.
- [ ] Inspect current visible demo scenarios and dates before recording. Select useful existing projects/date ranges; do not reseed hosted data or recreate accounts to refresh dates.
- [ ] Prepare a timed coverage checklist for reports/report switching/filtering/export affordances; task list/search/filters/display controls; inspector and inline-edit affordances; creation controls; subtasks/comments/attachments/recurrence; calendar; staff schedule; notifications; and theme change.
- [ ] Represent every main feature group, allowing some to be shown rather than exercised end to end. Authentication/recovery/error routes remain outside the main tour. Avoid an unreadable rapid click sequence.
- [ ] Begin in light mode and switch to dark on Reports with several colored chart elements visible, preserving the vibrant blue/red-on-black moment. Give reporting prominent opening/closing treatment.
- [ ] Deliver one recording targeting 60 seconds with at most one second encoding variance. Include no audio track, captions, narration text, login credential footage, music, or added marketing overlays.
- [ ] Keep recording browsing-only: open/dismiss editable controls and forms without saving tasks, submitting creation, deleting records, or initiating unnecessary export downloads. Avoid notification actions that alter the curated dataset.
- [ ] Use deliberate eased cursor movement, restrained click feedback, readable dwell times, and limited controlled scrolling. Show real app interactions, not staged fake success states.
- [ ] Produce MP4 and WebM encodings of the same sequence, a matching poster, and coherent poster-time/playback metadata. Choose a strong still and composed loop boundary without a jarring black or login frame.
- [ ] Inspect the existing portfolio's current instructions and player before minimal media integration. Preserve its muted looping playback and translucent layer; change only media assets/references/poster timing needed for this delivery.
- [ ] Validate actual embedded size, overlay opacity, chart/text legibility, both format playback paths, paused poster, theme-switch moment, loop behavior, and reduced-motion poster behavior where supported.
- [ ] Verify duration and absence of audio/captions with media inspection, record the final coverage/timing checklist, and report final artifact locations. Do not deploy or redesign unrelated portfolio content.

## Execution constraints

- Use the approved NODAL visual-overhaul spec and later user-approved upgrade prerequisite. Existing data model, report calculations, accounts, permissions, and rich demo scenarios remain the baseline.
- Use Context7 CLI for current library/tool documentation when needed, following the session instructions; do not infer that an installed skill guarantees MCP tool access.
- Test externally observable outcomes. Reuse the browser-level seam, existing Playwright suites, and globally installed Playwright CLI. Verify isolated database targeting before running tests that seed or mutate data.
- Preserve unrelated user changes. No hosted reseed, deployment, broad machine-wide upgrades, or unrelated portfolio changes.

