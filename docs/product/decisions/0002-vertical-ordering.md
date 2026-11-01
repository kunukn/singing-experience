# 0002 — More at the top

- **Status:** Accepted
- **Date:** 2026-09-20

## Context

Every chart in the app draws high notes at the top. Dropdowns beside those charts listed pitches low to high, and other quantities (seconds, BPM, counts) in whatever order they were written, so lists read upside down next to the charts and next to each other.

## Decision

Anything with a magnitude reads high at the top and low at the bottom: pitches (a range sorts on its midpoint), and every other measurable quantity. Catch-all options go last. Named ordinal scales (Easy, Normal, Hard), pitch classes (keys C → B) and lists with no magnitude keep their own order. A horizontal control runs low to high, like a keyboard.

## Alternatives considered

- **Ascending everywhere** (the programmer's default). Rejected: reads upside down beside every chart.
- **High-first for pitch only.** Rejected: a duration or BPM select next to a pitch select then reads the opposite way.
- **Sorting a range by its top or bottom note.** Rejected: a span has no single pitch, and either end gives a list that reads wrong.

## Consequences

- Option arrays are often shared constants, so they are copied before sorting (`.sort()` mutates).
- `voiceRanges.test.ts` asserts the rule for pitch lists rather than snapshotting today's order; new ordered lists add a case there.
