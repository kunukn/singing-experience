# 0009 — Game cues point at the target

- **Status:** Accepted
- **Date:** 2026-11-15

## Context

In Singfly it was hard to tell mid-round whether the voice was on course for the next gap, and which way to adjust. The bird's note label named the note in plain text colour and said nothing more. The pitch colour rule ([0003](0003-pitch-colours.md)) kept green out of a running game except for "you hit it", so the singer's own pitch had no colour during play.

## Decision

A cue shown during a round judges the pitch against what the game is asking for, not against the nearest note, and uses the three-state pitch variables: `--pitch-low` sing higher, `--pitch-clean` on course, `--pitch-high` sing lower, with a shape beside the colour. Green during a game therefore means "you hit it" or "you are about to". Singfly's bird label is the first use: coloured against the next gap, with an up or down arrow.

## Alternatives considered

- **Colour the label by cents to the nearest note**, as the idle preview does. Familiar, and it teaches intonation, but it answers a different question. Singfly's gap is one to two semitones either side of the note, so a clean note of the wrong pitch would show green just before a crash, and a note 50 cents off, the reddest colour, would still pass.
- **Show cents from the gap's note, on Hard only.** A number tells the margin, but a changing number is hard to read while flying and the app is also used by children. Left out until Hard proves to need it.
- **Colour alone, no arrow.** Hue is hard to tell apart on 13px text and fails for colour-blind singers.
- **Keep green for a hit only** and use two colours for too low and too high with plain text in between. It keeps the old rule intact, but the state the singer most wants confirmed, on course, would be the one with no signal.

## Consequences

Green in a running game no longer means only a target already hit; it also means the singer is on course for one. The two never disagree in Singfly, because "inside the gap" is the same test the crash rule uses (`isPitchInGap`, through `gapSide`): a bird that stays inside is flown through, and a pipe flown through scores. Intonation practice stays on the idle "See my voice" preview, the one place cents to the nearest note are coloured. A new game that adds a mid-round cue follows this rule instead of reusing the cents ramp.
