# 03: Establish the blue/red visual system through Logged Time Reports

**What to build:** Logged Time Reports becomes the finished reference screen for a coherent blue/red interface in light and dark mode.

**Blocked by:** 02: Upgrade application libraries while preserving workflows.

**Status:** ready-for-agent

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

