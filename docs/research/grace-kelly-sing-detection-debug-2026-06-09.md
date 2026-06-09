# Grace Kelly "Sing live" — Why Scores Were Stuck Low (Mic Constraints / Echo Cancellation)

## Executive Summary

The Grace Kelly "Sing live" scoring felt broken — even a self-test that played the melody **aloud** into the mic scored only **24–26%** instead of the expected ~100%. Live browser debugging proved the scoring math was never the problem. The fault was the **microphone stream constraints**: `usePitchDetection` requested the mic with `{ audio: true }`, which enables the browser defaults — **echo cancellation, noise suppression, and auto gain control all ON**. All three actively degrade musical pitch detection. Requesting a **raw stream** (`echoCancellation: false, noiseSuppression: false, autoGainControl: false`) lifted detection from **34% → 93%** of frames and the self-test score from **26% → 91%**, with no change to the scoring logic.

**Fix shipped:** a `rawAudio` option on [usePitchDetection.ts](../../src/composables/usePitchDetection.ts), enabled for the Grace Kelly sing mic.

---

## How We Got Here

A self-test mode (`DEBUG_AUDIBLE_SING`) was added to [GraceKellyPage.vue](../../src/components/grace-kelly/GraceKellyPage.vue): when on, the "Sing live" timeline plays the melody **out loud** while the mic listens. Because the audible tone is produced by the *same* timeline instance that sets the scoring target, the played sound and the target are sample-aligned — so a correct pipeline should score ~100%. It scored 24–26%. That gap is what this report explains.

## Live Debugging Method

Driven in a real browser (Chrome DevTools MCP) against `http://localhost:5555/grace-kelly-challenge`, with temporary instrumentation writing to `window` buffers:

- **Per-frame sampler** (~20×/s): active note index, target Hz, detected (sung) Hz, cents deviation, on-pitch flag, `isClean`, `isListening`.
- **Per-note grading dump**: on-pitch ms accumulated per note vs. the dwell threshold, pass/fail.
- Tone set to **`tuning2`** (pure sine, full sustain) to remove synth timbre as a variable; 80 BPM; part "Less low".

All instrumentation was removed after the root cause was confirmed.

## What the Data Showed

### Before the fix (default `{ audio: true }`)

| Metric | Value |
| --- | --- |
| Frames with **any** detected pitch | **79 / 234 (34%)** |
| Detected frames that were on-pitch | 67 / 79 (85%) |
| Cents when detected | mostly **0 to ±2** |
| Self-test score | 9 / 34 = **26%** |
| Pattern | First-half notes detected & passed; second-half notes read `0 ms` |

Two diagnostic signals stood out:

1. **When a pitch was reported, it was essentially perfect** (0–2 cents). So the ±40¢ scoring tolerance, octave handling, and the per-note min-dwell model were all healthy.
2. **Detection got progressively worse over the run** — a pure, steady sine fading out over a few seconds. That is the signature of an **adaptive echo canceller** learning the speaker signal and cancelling it from the mic input.

### Root cause

[usePitchDetection.ts](../../src/composables/usePitchDetection.ts) acquired the mic via:

```ts
mediaStream = await acquireMicStream({ audio: true })
```

`{ audio: true }` inherits the browser defaults, all hostile to sustained-tone pitch detection:

| Constraint (default ON) | Effect on pitch detection |
| --- | --- |
| `echoCancellation` | Cancels any sound the device itself plays — erased the self-test tone; adapts stronger over seconds. |
| `noiseSuppression` | Treats a held, steady tone as background hiss and gates it out. |
| `autoGainControl` | Ducks steady notes, destabilising the signal. |

The first one fully explains the self-test (the played tone is exactly what AEC removes). The other two hurt **real singing** too — a sustained sung note is precisely what noise suppression and AGC fight.

### After the fix (raw stream)

```ts
mediaStream = await acquireMicStream({
  audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
})
```

| Metric | Before | After |
| --- | --- | --- |
| Detection rate | 34% | **93%** |
| Self-test score | 26% | **91%** (31/34) |

The only 3 remaining misses were harmless edges: note 0 (detector warm-up on the very first frame) and two short notes (50 ms / 83 ms) just under the 100 ms dwell threshold.

## The Fix

A per-instance `rawAudio` option on [usePitchDetection.ts](../../src/composables/usePitchDetection.ts):

```ts
mediaStream = await acquireMicStream({
  audio: options.rawAudio
    ? { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
    : true,
})
```

Enabled for the Grace Kelly sing mic in [GraceKellySingDisplay.vue](../../src/components/grace-kelly/GraceKellySingDisplay.vue):

```ts
usePitchDetection({ onsetDebounceMs: 20, clarityThreshold: 0.6, rawAudio: true })
```

Scoped to Grace Kelly because the "Sing live" timeline is **silent** — there is no speaker output to echo-cancel, so disabling AEC is purely beneficial there.

## Related Scoring Changes (context, validated by this session)

The same effort moved the per-note scoring to a model this debugging confirmed is sound (see [useGraceKellySingScore.ts](../../src/components/grace-kelly/useGraceKellySingScore.ts)):

- **Min on-pitch dwell**: a note is correct once the singer is on its target pitch (±40¢) for `min(100 ms, 0.5 × note duration)` — a minimum dwell, not a majority. Tolerant of wrong-pitch time and of detection latency.
- **±40¢ scoring tolerance** (`SCORE_TOLERANCE_CENTS`), distinct from the ±25¢ visual pitch line.
- **Green notehead feedback** in the result state, reusing the active-highlight per-index mechanism.
- **Snappier onset** (`onsetDebounceMs: 20`) and a **looser clarity gate** (`0.6`).

The live data confirmed these are not the bottleneck — detected pitches were accurate; the mic stream was the limiting factor.

## Open Follow-up — Other Game Programs

The same `rawAudio` win very likely applies to the other voice games, all of which use [usePitchDetection.ts](../../src/composables/usePitchDetection.ts): DoReMi, Warm-up, SingFly, and the pitch/tone detectors. **It was not changed globally** because games that **play reference tones through the speaker while listening** (DoReMi, Warm-up) currently rely on echo cancellation plus their "deaf window" logic to avoid detecting their own playback. Turning AEC off for them needs care — likely longer/again-armed deaf windows, or disabling only `noiseSuppression` + `autoGainControl` (the two clear wins) while keeping `echoCancellation` where playback overlaps listening.

Suggested next-day plan:
1. Trial `rawAudio` on a non-overlapping listener first (e.g. the standalone pitch detector / tuner).
2. For DoReMi / Warm-up, test disabling only `noiseSuppression` + `autoGainControl`; measure whether reference-tone bleed appears during listening windows.
3. Consider promoting raw audio to the default once each game's playback/listen overlap is verified safe.

## Key Takeaways

- **Default `getUserMedia({ audio: true })` is wrong for pitch detection.** Echo cancellation, noise suppression, and auto gain control all fight a sustained musical tone. Request a raw stream.
- **A steady tone fading from the mic over seconds = echo cancellation adapting**, not a synth or scoring bug.
- **Instrument the actual signal** (detected Hz + cents per frame) before touching scoring — here it proved the scorer was innocent and saved chasing the wrong layer.
