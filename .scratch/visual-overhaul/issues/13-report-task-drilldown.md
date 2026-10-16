# 13: Connect supported report measures to matching tasks

**What to build:** Report viewers investigate a measure through its exact underlying tasks without losing report scope or access boundaries.

**Blocked by:** 05: Focus task browsing and preserve scope across views; 12: Redesign report navigation and comparisons.

**Status:** ready-for-agent

## Spec coverage

13, 29–33, 38.

## Acceptance criteria

- [ ] Audit each candidate measure against existing query/filter semantics before adding interaction. Document which measures have an exact task mapping and which do not.
- [ ] Implement drill-down only for measures whose task membership can be reproduced with existing data/contracts. Unsupported aggregates remain clearly noninteractive.
- [ ] Carry relevant department, project, date, status, and user scope into task browsing without leaking tasks or silently changing the denominator.
- [ ] Ensure the destination can actually display the report-authorized task set; do not substitute a narrower personal list and claim it represents the aggregate.
- [ ] Provide an understandable return to the prior report/tab/filter state and preserve keyboard focus where feasible.
- [ ] Indicate interactive chart segments/values accessibly, with keyboard-operable equivalents; retain informational tooltips independently.
- [ ] Handle empty results and stale-data changes honestly. Do not invent approximate mappings or expand the schema to force an affordance.
- [ ] Verify exact task membership on deterministic isolated fixtures, access control, filter carry-over, and return navigation. If no exact mapping is feasible, document that result and leave no misleading clickable UI.

## Execution constraints

- Use the approved NODAL visual-overhaul spec and later user-approved upgrade prerequisite. Existing data model, report calculations, accounts, permissions, and rich demo scenarios remain the baseline.
- Use Context7 CLI for current library/tool documentation when needed, following the session instructions; do not infer that an installed skill guarantees MCP tool access.
- Test externally observable outcomes. Reuse the browser-level seam, existing Playwright suites, and globally installed Playwright CLI. Verify isolated database targeting before running tests that seed or mutate data.
- Preserve unrelated user changes. No hosted reseed, deployment, broad machine-wide upgrades, or unrelated portfolio changes.

