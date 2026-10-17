# NODAL visual system

The Logged Time report is the reference composition. Preserve existing vibrant blues and red; use hierarchy and whitespace rather than additional colors.

## Shared tokens

All tokens in `ui/globals.css` are complete CSS colors (no HSL wrapper). Existing shadcn names remain compatible. Light: pale blue-gray `#f4f7fb`, white cards, ink `#142033`; dark: near-black `#0c0e12`, cards `#13171e`, raised surfaces `#1a2029`. Border separation comes before shadows.

Positive/progress text uses `--positive`, problem text `--problem`; soft surfaces use `--positive-soft` and `--problem-soft`. Primary filled controls have independently contrasting foreground tokens. Positive means affirmative, progress and completed; problems mean blocked, overdue, failed and destructive. Keep ordinary cancellation and numeric priority neutral. Pair color with explicit words and icons.

Chart blue `--chart-1` denotes completed/affirmative, lighter blue `--chart-2` active work. Problem fills use `--chart-problem` and `--chart-problem-secondary`; blue3–5 remain available for neutral data series, not blocked states. Chart fills differ from text colors. Clear labels/values make native charts understandable without hover.

Computed WCAG contrast examples on actual token pairs: light muted text/canvas4.77:1, positive text/soft4.53:1, primary white/blue5.20:1; dark muted text/card7.01:1, positive text/soft6.02:1, problem text/soft5.48:1, primary ink/blue7.27:1. This is a token check, not a claim that every legacy screen is fully audited.

## Typography, geometry and motion

Geist Sans is global; Geist Mono is reserved for IDs. Use tabular numerals for metrics. Page titles30px, section titles16px, interface14px, contextual labels12px, headline metrics36–40px. Compact control radius8px; surface radius12–16px; card padding20–24px; section gaps20px. Use discreet borders and clear groups, avoiding repetitive equal-weight cards.

Controls transition colors/borders150ms. Focus uses a2px blue outline offset3px. ThemeProvider preserves saved/system choice and suppresses intermediate theme transitions. Reduced-motion preference suppresses nonessential motion. Native report charts do not animate on mount or every theme change.

## Reference layout

Reports header/export actions → grouped scope controls → headline metric strip → dominant time-distribution visualization and compact delivery health → secondary task/time and delay comparisons. Keep all calculations and export definitions intact. Task status categories can overlap; never label their sum as all tasks. Completion timing uses latest task update, not a definitive completion timestamp.
