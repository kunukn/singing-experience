# 0001 — Pitch accuracy tiers: 10/20/50¢

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

Every program judges "how in tune" a sung note is: colours, Do-Re-Mi difficulty, `isOnPitch()`, the Pitch Detector's Focus bands. Separate local thresholds drifted apart, so the same note could read as in tune in one program and off in another.

## Decision

Three shared tiers, defined once in `pitchColors.ts` and imported everywhere:

- `CLEAN_CENTS` = 10¢: imperceptible to most listeners; studio-tight.
- `CLOSE_CENTS` = 20¢: within a trained singer's typical accuracy. Untrained voices average about 25¢.
- `OFF_CENTS` = 50¢: half a semitone, where the nearest note flips; clearly off.

Scoring (right note vs wrong note, for points) is a separate concept: `SCORE_TOLERANCE_CENTS` stays forgiving at ±50¢ for children.

## Alternatives considered

- **Per-program thresholds.** Rejected: they drifted, and a retune had to find every copy.
- **Using `CLOSE_CENTS` for scoring.** Rejected: ±20¢ is too strict for children to earn points; judging accuracy and awarding points are different questions.

## Consequences

- A retune moves every program together.
- Comments name the constant, not the number, so a retune can't leave stale text.
- `pitchColors.test.ts` guards the order (clean < close < off) and that off is half a semitone.
