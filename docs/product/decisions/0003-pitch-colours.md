# 0003 — Green clean, warm sharp, blue flat

- **Status:** Accepted
- **Date:** 2026-11-01

## Context

Cents colours were inconsistent across programs. Do-Re-Mi, the Pitch Detector's Focus tab and the Voice Range Finder showed flat notes in blue. Most other programs coloured by size only (green → yellow → red whatever the sign), so a flat note looked orange, the same as a sharp one.

Once flat turned blue everywhere, a second problem showed: on thin lines and small charts a clean (green) note was hard to tell from a slightly flat (light blue) one.

## Decision

One colour language for every cents colour:

- **Clean** (within `CLEAN_CENTS`): green.
- **Sharp**: yellow → orange → red.
- **Flat**: blue → deep blue, never sky or cyan.
- The clean green stays clearly brighter than every flat blue, at least 1.5× the luminance.
- The 10–20¢ fade is eased, so it passes the teal mix of green and blue within a few cents.
- Green also means success ("you hit it": game targets, the Tuner's in-tune ring). During a game the singer's preview line stays orange, so green there only means a hit.
- Colours that say _who_ or _what_ rather than _how in tune_ keep off these hues. The duet high-lane is violet.

## Alternatives considered

- **Size-only colours** (green → yellow → red by distance, either sign). Rejected: a flat note looked like a sharp one, so the colour couldn't say which way to move.
- **Grey for clean** (tried 2026-11-01, first on the Voice Range Finder, then everywhere; reverted the same day). The idea was that grey sits further from blue than green does. It didn't help: grey next to blue was as hard to tell apart as green next to blue. Thin lines are told apart by **brightness more than hue**, and for small targets the eye loses most of its blue–yellow discrimination (small-field tritanopia). The real culprit was the slightly-flat **sky blue**, about as bright as the clean colour: sky-300 ≈ 0.58 vs green-400 ≈ 0.55 luminance in dark-mode text. The grey (≈ 0.36) sat in the same range. Grey also removed the "in tune" reward, so the Tuner needed a green exception.
- **Lime for clean.** Rejected: further from blue in hue, but too close to the yellow of slightly sharp.
- **A hard step at `CLEAN_CENTS`** (green, then straight to blue or yellow). Rejected: a note wobbling around 10¢ would flip green ↔ blue on every frame.
- **An even 10–20¢ fade.** Rejected: −15¢ came out teal, neither green nor blue.

## Consequences

- Every program uses the helpers in `pitchColors.ts` (`directionalTextColor`, `directionalCleanColor(Rgb)`, `usePitchPreviewColor`); no pitch colour is hardcoded.
- During a slide, nearest-note cents flip sign halfway between two notes, so the colour turns from warm to blue there: sharp of the lower note, then flat of the upper one. Trails take the newer point across that wrap instead of averaging it into a green blip.
- The "pitch colour rule" tests in `pitchColors.test.ts` assert the hues and the brightness gap, not exact shades. A retune passes as long as it keeps the rule. Dark-mode text is the tightest margin (about 1.52 against the 1.5 limit).
