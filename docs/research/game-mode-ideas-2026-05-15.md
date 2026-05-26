# Game Mode Ideas

Brainstormed game modes that build on the existing voice/pitch primitives in this app. Grouped by how much new code each needs — the early ones reuse [usePitchGame](../src/components/pitch-game/usePitchGame.ts) and [PitchHistoryCanvas](../src/components/pitch-game/PitchHistoryCanvas.vue) almost verbatim; the later ones need a fresh renderer but still ride on [usePitchDetection](../src/composables/usePitchDetection.ts).

## Reusable primitives

The strongest building blocks for new game modes:

- **[usePitchDetection](../src/composables/usePitchDetection.ts)** — `frequency`, `midiNote`, `isClean` at rAF rate — the "voice controller"
- **[usePitchGame](../src/components/pitch-game/usePitchGame.ts)** — scrolling timed-target engine with `HIT_TOLERANCE_CENTS = 50`, already decoupled from rendering
- **[PitchHistoryCanvas](../src/components/pitch-game/PitchHistoryCanvas.vue)** — canvas renderer accepting arbitrary `GameTarget[]`, pickup-line, MIDI Y-axis
- **[useTonePlayer](../src/composables/useTonePlayer.ts)** / `playBellFeedback` — audio feedback on hits
- **[useDoReMiPlaySequence](../src/components/do-re-mi/useDoReMiPlaySequence.ts)** — melody playback for any sequence of MIDI notes
- **[VOICE_RANGES](../src/constants/voiceRanges.ts)** — ready-made difficulty presets
- **[useConfetti](../src/composables/useConfetti.ts)** — `fireMicroConfetti(x, y)` celebration at exact screen coordinate
- **[useIdlePreview](../src/composables/useIdlePreview.ts)** — mic stays warm between rounds

---

## 1. Flappy Notes

A bird flies left→right at a fixed X. Y-position = the MIDI you're singing, mapped through the active [VOICE_RANGE](../src/constants/voiceRanges.ts). Gaps in vertical pipes scroll toward the bird; each gap's center is a target MIDI. Survive = continuously matching the gap's pitch (±50 cents, reusing `HIT_TOLERANCE_CENTS`). `isClean` gate ensures noise/breath doesn't count. Reuse [PitchHistoryCanvas](../src/components/pitch-game/PitchHistoryCanvas.vue) — the pickup line *is* the bird, the targets become pipe gaps.

Why it fits: literally `usePitchGame` with hit-zone = "any time pickup-line crosses pipe", failure = miss instead of zero score. ~150 lines of new logic.

## 2. Lava Floor / Don't Touch the Bottom

Inverse of pitch-game: a rising lava line climbs the MIDI axis at a steady rate. Your live pitch must stay **above** it. Survive as long as possible. Difficulty curve = lava speed. Teaches sustained high singing without locking to a single note.

## 3. Asteroid Dodge

Scrolling obstacles (red dots) at random MIDIs you must **avoid** instead of hit. Same engine, inverted scoring — `onHit` becomes "damage taken." Pair with green pickups (bonus targets) so the player weaves up and down.

## 4. Pitch Surfer / Wave Rider

A continuous target *curve* (sinusoid, melody contour) scrolls past the pickup line. Score = % of frames within tolerance of the curve. No discrete targets — `useGame` becomes a tolerance-band integrator. Visually: a thick ribbon to ride. Great for legato practice.

## 5. Echo / Call & Response

Use [useDoReMiPlaySequence](../src/components/do-re-mi/useDoReMiPlaySequence.ts) to *play* a short phrase, then the canvas scrolls those same notes as targets the player must sing back. Each round adds one note (Simon-style). Reuses everything; only adds a state machine: `listening → recall → playing`.

## 6. Glide / Portamento Trainer

Two targets shown: a start note and an end note connected by a sloped line. Player must trace the slide from one to the other within a time window. Score on path adherence (sampled MIDI vs. expected). Encourages controlled vocal slides.

## 7. Interval Catcher

A reference tone plays via [playTone](../src/composables/toneEngine.ts), and the target that appears is "+5 semitones from that" — never the absolute pitch. Trains relative-pitch / interval singing. Same renderer; just label targets with `+P5`, `-m3`, etc. via [frequencyToCents](../src/utils/noteUtils.ts) helpers.

## 8. Pitch Pong / Volley

Single-mic version: your pitch moves a paddle, ball bounces, you score by intercepting. Brick-Breaker variant is equally easy: bricks live at specific MIDIs and break when sung.

## 9. Sustain Hero / Long Tone Boss

A boss bar at the top drains while you hold a clean tone within tolerance. Each "hit" = N consecutive frames of `isClean && |cents| < 50`. Variation per level: target wanders slowly (vibrato challenge), or shifts in steps you have to chase. Closest to [sing-tone](../src/components/sing-tone/) but gamified with a health-bar enemy and `fireConfetti()` on KO.

## 10. Solfege Memory / Match-3

Grid of face-down "do/re/mi/…" tiles. Tap a tile → it plays the solfege tone; the player must sing it back to flip it face-up. Match pairs by singing them. Pure reuse of `useDoReMiPlaySequence` + `usePitchDetection`, no canvas needed — a totally different visual style.

---

## Highest fun-per-effort picks

- **#1 Flappy Notes** — biggest "wow," reuses everything, child-friendly.
- **#4 Pitch Surfer** — most musically educational, low new-code surface.
- **#3 Asteroid Dodge** — natural companion to pitch-game; same screen, opposite goal, doubles content with shared code.
