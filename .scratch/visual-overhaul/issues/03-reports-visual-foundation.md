# 03: Establish the blue/red visual system through Logged Time Reports

**What to build:** Logged Time Reports becomes the finished reference screen for a coherent blue/red interface in light and dark mode.

**Blocked by:** 02: Upgrade application libraries while preserving workflows.

**Status:** ready-for-agent

## Owner scope revision — 2026-10-17

Prioritize presentable design and the portfolio recording; implement only necessary supporting logic. See the revised delivery priority in `../spec.md`. Broad library migrations, unrelated correctness cleanup, and exhaustive regression/failure-path testing are deferred. Use both-theme Playwright CLI visual checks, build/type checks, and targeted demo-path validation. Record completion against this revised scope and distinguish unverified original checklist items from verified work.

## Spec coverage

1–6, 28–32, 35–37.

## Acceptance criteria

- [ ] Capture baseline screenshots of the existing report palette before changing it. Preserve its vibrant light/dark blues and red, especially against near-black backgrounds; do not replace the brand with teal.
- [ ] Introduce compatible shared tokens and consolidate conflicting HSL/OKLCH usage without breaking unmigrated screens. Give text, surfaces, borders, charts, positive/progress states, and problem states deliberate theme-specific values.
- [ ] Use a pale blue-gray canvas and white working surfaces in light mode; near-black canvas, distinct surface levels, and bright chart accents in dark mode. Tune contrast separately for both.
- [ ] Apply loaded Geist Sans, restrained Geist Mono identifiers, tabular metrics, consistent type hierarchy, control heights, spacing, radii, borders, and subtle shadows. Document the chosen values for reuse.
- [ ] Blue denotes affirmative/progress/success; red denotes blocked/overdue/error/destructive. Neutral controls cover cancellation and absence. Pair colors with labels/icons; distinguish completion from progress and priority from failure.
- [ ] Recompose Logged Time Reports into a clear hierarchy with legible key measures and chart areas; retain every existing metric and its accessible detail even when secondary metrics move.
- [ ] Ensure chart axes, units, legends, tooltips, selected filters, loading indicators, and export affordances are readable in both themes and at narrower widths.
- [ ] Preserve system/saved theme preference and ensure changes apply coherently to overlays and charts without unreadable intermediate states.
- [ ] Use existing CSS/tw-animate-css capabilities for restrained feedback; introduce no GSAP/Lenis dependency. Respect reduced motion.
- [ ] Verify the reference screen using Playwright CLI screenshots and existing report/theme tests. Check AA contrast, keyboard focus, empty/loading/error states, and no broken global styling on other main screens.

## Execution constraints

- Use the approved NODAL visual-overhaul spec and later user-approved upgrade prerequisite. Existing data model, report calculations, accounts, permissions, and rich demo scenarios remain the baseline.
- Use Context7 CLI for current library/tool documentation when needed, following the session instructions; do not infer that an installed skill guarantees MCP tool access.
- Test externally observable outcomes. Reuse the browser-level seam, existing Playwright suites, and globally installed Playwright CLI. Verify isolated database targeting before running tests that seed or mutate data.
- Preserve unrelated user changes. No hosted reseed, deployment, broad machine-wide upgrades, or unrelated portfolio changes.

## Resolution: implemented (revised scope)

2026-10-17: delivered the first finished reference screen under the owner's design/demo-first revision. Logged Time now has a headline metric strip, dominant time-distribution ring with labeled values, compact delivery health, and aligned task-hour/delay comparisons. Every existing metric and export descriptor/calculation remains available. Reports gains a composed header/export area and grouped scope toolbar; ticket04 owns shared navigation/frame and ticket12 the remaining report types.

Consolidated complete CSS color tokens, applied loaded Geist, added reusable positive/problem tokens and independent chart fills, corrected invalid popover HSL wrapping, and documented typography/geometry/contrast in `docs/design/visual-system.md`. Dark retains the existing vivid two blues and red on near-black; light uses a pale blue-gray canvas and white surfaces. Blocked/overdue charts use red with explicit labels/icons. Reduced-motion handling, visible focus, loading skeleton composition and responsive groups included. Project-only Logged Time scope can fetch without a selected department.

Necessary compatibility correction: newer Supabase rejects adding callbacks to the same already-subscribed channel shared by desktop/mobile notification mounts. A unique per-effect notification channel preserves cleanup and unblocks authenticated rendering. No database/model/permission changes. Next16 generated its agent-doc block in AGENTS.md; retained it and read the shipped CSS/font guides.

Verified Node24.22.0/pnpm12.14.0: typecheck and production build pass; existing theme-token suite2/2 pass. Playwright CLI captured/visually reviewed light and dark1440x900 plus light390x844 at `/tmp/nodal-ticket03-shots/`. Baselines preserved `/tmp/nodal-baseline/`. Read-only local presenter walkthrough confirmed scope clear→empty→department restored→charts and exports available. No seeds or task mutations. Token contrast calculations documented with actual chosen pairs.

Original checklist items not exhaustively verified: broad all-screen AA/keyboard audit, report failure/retry paths, all PDF/spreadsheet downloads, all theme/report tests and all mobile overlay states. Targeted visual/demo-path validation follows revised scope; remaining reports and application-wide refinement continue in downstream tickets. Existing stale-data/fetch error handling is not claimed solved.
