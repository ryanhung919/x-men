# 14: Finish notifications, authentication, and guest presentation

**What to build:** Supporting screens feel as polished as the main workflows and communicate session and demo state clearly.

**Blocked by:** 04: Unify navigation and page framing.

**Status:** ready-for-agent

## Owner scope revision — 2026-10-17

Prioritize presentable design and the portfolio recording; implement only necessary supporting logic. See the revised delivery priority in `../spec.md`. Broad library migrations, unrelated correctness cleanup, and exhaustive regression/failure-path testing are deferred. Use both-theme Playwright CLI visual checks, build/type checks, and targeted demo-path validation. Record completion against this revised scope and distinguish unverified original checklist items from verified work.

## Spec coverage

6–9, 34–38.

## Acceptance criteria

- [ ] Apply shared typography, blue/red surfaces, hierarchy, and responsive form layout to login, password recovery/update, auth errors, unauthorized, and existing error surfaces.
- [ ] Preserve authentication, redirect, password-reset, validation, and session behavior; make pending and failed operations visible.
- [ ] Refine notification list and detail hierarchy, timestamps, read/unread indicators, long content, and relevant task links while preserving current functionality.
- [ ] Replace decorative bell rotation/scaling with restrained hover/focus and unread feedback.
- [ ] Retain mark-read, mark-all-read, archive/delete behavior according to actual permissions, with appropriate confirmation for destructive bulk actions.
- [ ] Make guest mode recognizable. Preserve the guest's intentionally allowed own-notification operations instead of treating demo_viewer as universally immutable.
- [ ] Ensure drawers/dialogs have coherent focus handling, keyboard navigation, accessible names, scrolling, and mobile action placement.
- [ ] Cover initial loading, no notifications, refreshing, deletion pending, and failed operations in both themes.
- [ ] Verify auth routes and notification behavior using existing tests and browser inspection; exercise mutations only with isolated test accounts.

## Execution constraints

- Use the approved NODAL visual-overhaul spec and later user-approved upgrade prerequisite. Existing data model, report calculations, accounts, permissions, and rich demo scenarios remain the baseline.
- Use Context7 CLI for current library/tool documentation when needed, following the session instructions; do not infer that an installed skill guarantees MCP tool access.
- Test externally observable outcomes. Reuse the browser-level seam, existing Playwright suites, and globally installed Playwright CLI. Verify isolated database targeting before running tests that seed or mutate data.
- Preserve unrelated user changes. No hosted reseed, deployment, broad machine-wide upgrades, or unrelated portfolio changes.


## Resolution: implemented

2026-10-17 delivered under the owner revised design/demo scope. Branded responsive auth shell pairs focused forms with quiet product typography and the shared blue/near-black identity. Login/recovery/update and errors now share coherent form sizing, token error panels, autocomplete and pending states. Existing error/unauthorized routes use compact status surfaces and useful workspace return actions. Corrected two broken existing auth paths: exact existing recovery/update/error/confirm routes are public in session middleware (no wildcard or validation bypass), and successful password update targets Tasks instead of nonexistent /protected. Existing session/token handlers and reset-email contracts preserved.

Notification drawer now has calm inbox hierarchy, blue unread dots/surfaces, readable long-content buttons with keyboard semantics, quiet relative/exact timestamps, refreshing/loading/empty/deleting states and recoverable inline errors. Detail adds timestamp and a neutral Done action. Destructive bulk removal requires confirmation; per-notification operations and guest permissions unchanged. Source notification records have no task_id/link identifier, so no invented task links added. Bell motion already restrained in04 preserved. Existing task loading layouts remain with their respective workflow tickets.

Validation: typecheck and production build/start passed with verified loopback env on3003. Auth public-route tests demonstrated red4fail before the correction and green18pass afterward;12 existing notification detail component tests pass. Targeted new supporting-component lint passes. Playwright CLI screenshots inspected: login1440x900 light/dark (`/tmp/nodal14-login-{light,dark}.png`), public recovery, notifications light/dark, already-read notification detail, canceled bulk confirmation and390x844 notification/mobile auth/error/unauthorized. Drawer populated with11read/3unread; opened only already-read record, no mark/delete/preference/password writes or seeds. Exhaustive failure-state/empty-fixture and credential submission regressions deferred by owner scope.
