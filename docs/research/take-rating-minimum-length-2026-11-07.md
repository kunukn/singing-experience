# Voice Recorder — How Much Singing a Take Rating Needs

## Executive Summary

The take rating ("How steady it was") needed **15 s of clear singing**. That number was a round guess: the commit that added it said the scores were uncalibrated. Scoring slices of three real takes showed that **10 s is enough**, but only once the **tuning drift penalty** stops counting on short takes. That penalty is what made short takes unreliable: fitted over 8–10 s, the drift estimate reached 266–862¢ on a take that drifted 8¢. Since every 100¢ of drift wipes out the whole key score, the overall score dropped with it.

**Shipped:**

- `MIN_RATED_VOICED_MS` lowered from 15 s to **10 s**.
- The drift penalty **phases in linearly from 15 s to 30 s** of clear singing. It is zero below 15 s, full from 30 s, and takes of 30 s or more score exactly as before.

Both are in [takeRating.ts](../../src/components/voice-recorder/takeRating.ts). The live "Clear singing" pill and the "X of Y seconds" message read the same constant.

---

## Background

- A rating needs `voicedMs ≥ MIN_RATED_VOICED_MS` and at least 8 notes (`MIN_NOTES`). `voicedMs` counts every analysis frame with clarity ≥ 0.9, pitch between 60 and 1500 Hz, and level above the take's sound gate. Pauses, breaths and noise don't count.
- The minimum is a gate, not a window: once it's met, the whole take (up to the 60 s recording cap) is scored.
- Overall score = 0.5 × centring ("Middle of the note") + 0.3 × steadiness ("Steady notes") + 0.2 × key ("Staying in key").
  - The key score is the in-key share of note time minus `|drift| / 100¢`.
  - Drift comes from `estimateTuningCurve` in [takeTuning.ts](../../src/components/voice-recorder/takeTuning.ts).
- The rating levels are about 0.15–0.20 wide (`TAKE_LEVEL_RULES`). A spread of ±0.07 is roughly a third to half a level.

## Method

Script: [take-rating-slices.test.ts](./take-rating-slices.test.ts). It is skipped unless `WAV` is set.

1. Read the recorder's 16-bit WAV and resample it to 22,050 Hz with a windowed sinc, as the browser decoder would (`decodeTake` uses an `OfflineAudioContext` at `ANALYSIS_SAMPLE_RATE`).
2. Analyse the whole take with `analyzeTake`.
3. For each target N (6, 8, 10, 12, 15, 20 s), start a slice every 0.5 s. Each slice ends once it holds N s of clear singing, then is analysed **as its own take**, re-fitting tuning, drift, key and notes.
4. Rate each slice with `buildTakeRating`, with only the time gate lifted (the notes gate stays).
5. Compare the spread of scores across slices (SD) with the whole take.

The SD across slices answers: if a singer stopped after N seconds, how much would the rating depend on _which_ N seconds they sang?

## Takes

Three takes by one adult singer, on 2026-11-07, recorded in the voice recorder (48 kHz mono, no backing music):

| Take            | Length | Clear singing | Notes | Overall (old formula) | Centring / Steadiness / Key | Drift |
| --------------- | ------ | ------------- | ----- | --------------------- | --------------------------- | ----- |
| 1, free singing | 34.8 s | 21.3 s        | 70    | 0.66                  | 0.57 / 0.93 / 0.49          | −8¢   |
| 2, song A       | 26.7 s | 19.7 s        | 46    | 0.69                  | 0.65 / 1.00 / 0.35          | 34¢   |
| 3, song B       | 26.5 s | 20.1 s        | 56    | 0.49                  | 0.25 / 1.00 / 0.30          | 17¢   |

Songs A and B were one in a lower range and one in a higher range; which was which wasn't recorded. No key was detected for any whole take, so the key score fell back to `commonScaleCoverage`. The WAVs were scratch files; only take 3's survived for the re-run below.

## Results

### With the old formula (full drift penalty at any length)

Overall score across slices, mean ± SD:

| Clear singing | Take 1            | Take 2      | Take 3      | Worst drift estimate (takes 1 / 2 / 3) |
| ------------- | ----------------- | ----------- | ----------- | -------------------------------------- |
| 6 s           | 0.59 ± 0.16       | 0.78 ± 0.10 | 0.49 ± 0.10 | 51¢ / 0¢ / 0¢                          |
| 8 s           | 0.56 ± 0.13       | 0.73 ± 0.08 | 0.43 ± 0.09 | **862¢** / 140¢ / 266¢                 |
| 10 s          | 0.58 ± 0.09       | 0.73 ± 0.07 | 0.45 ± 0.06 | **392¢** / 47¢ / 74¢                   |
| 12 s          | 0.60 ± 0.08       | 0.72 ± 0.09 | 0.47 ± 0.05 | 136¢ / 37¢ / 25¢                       |
| 15 s          | 0.54 ± 0.06       | 0.71 ± 0.04 | 0.46 ± 0.05 | 71¢ / 42¢ / 16¢                        |
| 20 s          | 0.52 ± 0.07 (n=5) | —           | 0.49 (n=1)  | 93¢ / — / 17¢                          |

SD of each part of the score at 10 s, takes 1 / 2 / 3:

- Centring: 0.14 / 0.13 / 0.11
- Steadiness: 0.04 / 0.06 / 0.04
- Key: 0.23 / 0.12 / 0.14

### Variants measured

At 10 s, mean ± SD across slices:

| Take | Old formula | Key score left out | Drift penalty removed |
| ---- | ----------- | ------------------ | --------------------- |
| 1    | 0.58 ± 0.09 | 0.68 ± 0.09        | 0.65 ± 0.07           |
| 2    | 0.73 ± 0.07 | 0.77 ± 0.07        | 0.77 ± 0.08           |
| 3    | 0.45 ± 0.06 | 0.52 ± 0.07        | 0.49 ± 0.06           |

Below 15 s, "drift penalty removed" **is** the shipped formula, since the phase-in hasn't started yet.

### Shipped formula vs the whole take

The whole takes have about 20 s of clear singing, so a third of the drift penalty applies. For takes 1 and 2 the whole-take values are **derived** from the measured parts above, because their WAVs were gone. Take 3 was **re-run** with the shipped code, and the derived value matched.

| Take | Whole take, new formula | 10 s slices, new formula | Difference |
| ---- | ----------------------- | ------------------------ | ---------- |
| 1    | ≈ 0.67 (derived)        | 0.65 ± 0.07              | −0.02      |
| 2    | ≈ 0.74 (derived)        | 0.77 ± 0.08              | +0.03      |
| 3    | 0.51 (re-run)           | 0.49 ± 0.06 (re-run)     | −0.01      |

Take 3 re-run with the shipped code, all lengths:

| Clear singing | Overall, mean ± SD | vs whole take | Worst drift estimate |
| ------------- | ------------------ | ------------- | -------------------- |
| 6 s           | 0.49 ± 0.10        | −0.02         | 0¢                   |
| 8 s           | 0.47 ± 0.08        | −0.04         | 266¢                 |
| 10 s          | 0.49 ± 0.06        | −0.01         | 74¢                  |
| 12 s          | 0.49 ± 0.05        | −0.02         | 25¢                  |
| 15 s          | 0.47 ± 0.05        | −0.04         | 16¢                  |

## Findings

1. **Steadiness is reliable from 6 s.** It is a median wobble over held notes, so a few notes are enough.
2. **Centring settles at about 10 s.** Its SD falls from 0.24 at 8 s to 0.11–0.14 at 10 s.
3. **Drift is the weak part.** A tuning curve fitted over a few seconds can't tell real drift from the melody moving, and errors of several semitones appear below 10 s. Even 15–20 s slices of take 1 estimated 24–39¢ on average against the whole take's 8¢. Drift is meant to catch a singer slowly going flat or sharp over a long song, which a short take can't show.
4. **With drift phased in, 10 s ratings match the full song.** The 10 s average sits within 0.03 of the whole take on all three takes, with SD 0.06–0.08. With the old formula, take 1's 10 s slices sat 0.08 low.
5. **Below 10 s the spread roughly doubles** (up to ±0.16 at 6 s), so 10 s is the floor, not a step towards lower.

## Decision

- **`MIN_RATED_VOICED_MS = 10_000`.**
- **Drift penalty weight = `ramp(voicedMs, 15 s, 30 s)`.** A linear ramp, so the score never steps down as a take grows: covered by `takeRating.test.ts`, "never drops the score sharply".
- The live pill turns ready at 12 s of live count: the 10 s minimum plus `READY_MARGIN_MS` in [liveSingingTime.ts](../../src/components/voice-recorder/liveSingingTime.ts). It shows "10/10" at that moment.

### Alternatives rejected

- **Lower to 10 s and keep the full drift penalty.** On take 1, 10 s ratings sat 0.08 below the whole take, with drift estimates up to 392¢.
- **Lower to 10 s, but leave out "Staying in key" until 15 s.** It works the way steadiness already does when there are no held notes (`steadiness === null`), but the score would drop about 0.14 (roughly a whole level) at the moment the key score switches on. Singing longer would lower the rating, and the live pill invites singers to keep going right into that drop.
- **Keep 15 s.** It is more precise (SD 0.04–0.06), but turns away takes that already rate consistently at 10 s.
- **Below 10 s.** The spread doubles by 6–8 s, and drift errors explode before the phase-in could hide them.

## Caveats

- Three takes from one adult singer. Children's voices, belting and very breathy singing are untested.
- Slices overlap heavily: about 20 s of clear singing gives only two independent 10 s windows. The 15 s and 20 s rows rest on few slices and are likely optimistic.
- The rating levels themselves are still uncalibrated (`TAKE_LEVEL_RULES`, "Starting values").

## Follow-ups

- **Drift on 15–30 s takes.** The phase-in reduces the penalty there, but the estimate itself may still be inflated (take 1: 24–39¢ against 8¢ whole). Worth checking `estimateTuningCurve` on medium-length takes.
- **More takes.** Re-run the script on new recordings (different singers, ranges, children) before tightening or loosening the rule further:

  ```sh
  WAV=.temp/<file>.wav npx vitest run docs/research/take-rating-slices.test.ts --silent=false
  ```

  The 10 s line should stay within about ±0.08 SD and within about 0.05 of the whole take.
