# 0006 — One pitch palette per theme

- **Status:** Accepted
- **Date:** 2026-11-11

## Context

[0003](0003-pitch-colours.md) fixed the hues (green clean, warm sharp, blue flat) but not the shades. Three sets were in use at once:

- Text and thin lines used a theme-aware set (green-600 on light, green-400 on dark).
- Trails and bars used one canvas set for both themes (green-500).
- Chart highlights, correct-note lines and the too low / too high readouts hardcoded the dark-mode 400s.

In light mode one Pitch Detector screen showed three greens: the note text, the sung trail and the highlighted grid line.

## Decision

Every pitch colour takes the shade of the active theme, from one palette:

| Meaning            | Light                | Dark                 |
| ------------------ | -------------------- | -------------------- |
| Clean / on pitch   | green-600            | green-400            |
| Sharp ramp         | yellow-600 → red-600 | yellow-300 → red-400 |
| Flat ramp          | blue-600 → blue-800  | blue-400 → blue-500  |
| Too high (no ramp) | orange-600           | orange-400           |
| Too low (no ramp)  | blue-600             | blue-400             |

The ramps live in `pitchColors.ts`. The three fixed colours are the CSS variables `--pitch-clean`, `--pitch-low` and `--pitch-high` in `style.css`.

## Alternatives considered

- **Two roles: darker text, brighter fills.** Rejected: it keeps two greens on one screen, which is the inconsistency this record removes.
- **Too high follows the ramp** (red at `OFF_CENTS`). Rejected: a readout without a ramp has one "too high" state, and red reads as an error; orange already means too high in Do-Re-Mi and Sing Tone.
- **The dark-mode 400s in both themes.** Rejected: green-400 text fails contrast on white.

## Consequences

- `directionalCleanColor` and `directionalCleanColorRgb` require the theme, so a caller cannot draw the other theme's shades by leaving it out. `cleanPitchColor` gives the clean green alone, for canvas marks.
- Light-mode trails, bars and chart highlights are darker than before (green-500 or green-400 → green-600). Dark-mode trails are slightly brighter (green-500 → green-400).
- The neutral orange preview line of a running game is not a pitch colour and keeps its fixed orange-400.
- `pitchColors.test.ts` asserts that a trail and the cents text beside it are the same colour in both themes.
