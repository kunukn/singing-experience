# Product Design Rules

The current product and design rules that hold across every program. Each rule says what to do; the linked decision record says why, including what was tried and rejected. When a rule changes, update its section here **and** add or supersede a record in [decisions/](decisions/).

[AGENTS.md](../../AGENTS.md) carries a one-line summary of each rule and points here.

## Vertical Ordering

_More at the top._ **Anything with a magnitude reads high at the top and low at the bottom.** It starts with pitch, because this is a singing app and every chart draws high notes up top — [midiToChartY](../../src/utils/chartGrid.ts) inverts the ratio for exactly that reason — but the same mindset carries to every measurable quantity in a vertical list, so a dropdown reads the way the charts do.

**Pitch**

- **Order pitch options high to low.** Soprano before Bass, C5 before C3. [NOTE_NAMES_HIGH_TO_LOW and NOTE_OPTIONS_HIGH_TO_LOW](../../src/utils/noteUtils.ts) already encode this for single notes — reach for them instead of re-sorting by hand.
- **A range sorts on its midpoint**, `(midiMin + midiMax) / 2` descending, because a span has no single pitch. Sorting a span by its top or bottom note gives a list that reads wrong.
- **Catch-all options go last**, below the pitch-ordered ones — `choir` and `full` in [VOICE_RANGES](../../src/constants/voiceRanges.ts).

**Every other quantity — same direction**

Seconds, BPM, counts, semitone steps: the **largest value sits at the top**, the smallest at the bottom. Hold duration runs `1s` down to `0.05s`; Step runs `5` down to `1`. Build the list in whatever order reads best in source, then reverse it at the point of use:

```typescript
/* ✅ Largest first, matching every other dropdown in the app */
const durationOptions = [...HOLD_DURATION_OPTIONS].toReversed()
const bpmOptions = [...ALLOWED_BPMS].sort((a, b) => b - a)

/* ❌ Ascending — reads upside down next to its siblings */
const durationOptions = [0.05, 0.1, 0.2, 0.5, 1]
```

Always copy before sorting: `.sort()` mutates, and these option arrays are usually shared module constants.

**What this rule does not cover**

- **Named ordinal scales** keep their conventional order — difficulty stays Easy, Normal, Hard. The rule is about measurable quantities, not every list that happens to have an order.
- **Pitch _classes_ are not pitches.** [SCALE_ROOT_OPTIONS](../../src/utils/scaleHighlight.ts) lists keys C → B ascending and stays that way. A key has no octave — picking D highlights every D on the instrument — so the chromatic circle has no top or bottom to sort by, and listing keys from C is the universal convention. Pinned by `scaleHighlight.test.ts`.
- **Lists with no magnitude at all** — timbres, scale modes, tunings, languages — are ordered however suits them.
- **A horizontal control flips**: left to right runs low to high, the way a keyboard does. See the comment in [GraceKellyPartLadder.vue](../../src/components/grace-kelly/GraceKellyPartLadder.vue), which stacks vertically high-first and lays out horizontally low-first.

The pitch half is guarded by [voiceRanges.test.ts](../../src/constants/voiceRanges.test.ts), which asserts the rule rather than snapshotting today's order. Adding another ordered list? Add a case there too.

Why: [0002 — Vertical ordering](decisions/0002-vertical-ordering.md)

## Pitch Accuracy Thresholds

Three shared tiers in [pitchColors.ts](../../src/utils/pitchColors.ts) define "how in tune" across every program:

| Constant      | Value | Meaning                                                |
| ------------- | ----- | ------------------------------------------------------ |
| `CLEAN_CENTS` | 10¢   | Spot on — studio-tight (green)                         |
| `CLOSE_CENTS` | 20¢   | Clean / on pitch — a trained singer's typical accuracy |
| `OFF_CENTS`   | 50¢   | Half a semitone — clearly off; colour saturates to red |

- **Import these; never hardcode 10/20/50 or add a feature-local copy.** Colours, the Do-Re-Mi difficulty rules, `isOnPitch()` and the Focus tab bands all read them, so a change moves every program together.
- **Comments name the constant, not the number** — write "within `CLOSE_CENTS`", not "within ±20¢", so a retune can't leave stale text behind.
- **Scoring tolerance is a separate concept.** `SCORE_TOLERANCE_CENTS` (±50¢, [useDwellSingScore.ts](../../src/composables/useDwellSingScore.ts)) decides right note vs wrong note for points and stays forgiving for children. Don't reuse `CLOSE_CENTS` for it, or vice versa.

The tier order is guarded by `pitchColors.test.ts`.

Why: [0001 — Pitch accuracy tiers](decisions/0001-pitch-accuracy-tiers.md)

## Pitch Colours

Every cents colour in every program speaks one language, built on the tiers above:

| Pitch                        | Colour                    |
| ---------------------------- | ------------------------- |
| Clean (within `CLEAN_CENTS`) | **Green**                 |
| Sharp (positive cents)       | **Yellow → orange → red** |
| Flat (negative cents)        | **Blue → deep blue**      |

- **Use the helpers in [pitchColors.ts](../../src/utils/pitchColors.ts); never hardcode a pitch colour.** `directionalTextColor` for text and thin lines (theme-aware), `directionalCleanColor` / `directionalCleanColorRgb` for canvas trails and bars, `usePitchPreviewColor().colorForCents` for idle "See my voice" previews.
- **Brightness separates thin lines, not hue.** On a 1–2 px line or a small dot the eye barely tells blue from green, so the clean green stays clearly brighter than every flat blue, and flat never uses sky or cyan (as bright as the green). The 10–20¢ fade is eased, so it is past the teal mix of green and blue within a few cents.
- **Green also means success.** A game target hit, the Tuner's in-tune ring, a "correct note" line. During a game the singer's preview line stays the neutral orange, so green there only ever means "you hit it".
- **Other colours keep off the pitch hues.** A colour that says _who_ or _what_ rather than _how in tune_ must avoid green, blue and the yellow → red ramp. The duet high-lane is violet for this reason.

The rule is guarded by the "pitch colour rule" tests in `pitchColors.test.ts`. They assert the hues and the brightness gap, not exact shades, so a retune passes as long as it keeps the rule.

Why: [0003 — Pitch colours](decisions/0003-pitch-colours.md)

## Copy Tone

The app is used by children as well as adults. Every user-facing string reads as friendly, plain, everyday language: the casual "you" form where a language has one, no polite filler ("please"), no parenthetical plurals, and established music words kept (soprano, cents, octave).

- The detailed rules, per language, are in [translation.instructions.md](../../.github/instructions/translation.instructions.md), which applies to `src/locales/*.json`.
- Wrap every user-facing string with `$t()` / `t()`; never hardcode display text.

Why: [0004 — Child-friendly copy](decisions/0004-copy-tone.md)
