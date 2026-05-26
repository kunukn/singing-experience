import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { Ref } from 'vue'
import type { NoteInfo } from '@/utils/noteUtils'
import { frequencyToNote, midiToFrequency } from '@/utils/noteUtils'
import {
  STABILIZE_ACCEPT_HOLD_MS,
  STABILIZE_JUMP_HOLD_MS,
  STABILIZE_START_HOLD_MS,
} from './singFlyConstants'
import { useStablePitch } from './useStablePitch'

/* MIDI notes used across the cases. E3 is the "held" tone; F3 (+1 st) is
 * micro-drift; G3 (+3 st) is an ordinary/medium change; C5 (+20 st) and
 * C2 (−16 st) are far spikes. */
const E3 = 52
const F3 = 53
const G3 = 55
const C5 = 72
const C2 = 36

function noteInfoForMidi(midi: number): NoteInfo {
  /* midiToFrequency → exact perfect pitch, so the stabilizer reads back the
   * same fractional MIDI. */
  return frequencyToNote(midiToFrequency(midi))!
}

describe('useStablePitch', () => {
  let noteInfo: Ref<NoteInfo | null>
  let isClean: Ref<boolean>

  beforeEach(() => {
    vi.useFakeTimers()
    noteInfo = ref<NoteInfo | null>(null)
    isClean = ref(false)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  /* One detection frame: optionally advance the (faked) clock first, then
   * write a fresh noteInfo object so the stabilizer's watcher fires. midi ===
   * null simulates silence. */
  async function feed(midi: number | null, advanceMs = 0) {
    if (advanceMs > 0) vi.advanceTimersByTime(advanceMs)

    noteInfo.value = midi === null ? null : noteInfoForMidi(midi)
    isClean.value = midi !== null
    await nextTick()
  }

  async function feedSteady(midi: number, frames: number, deltaMs: number) {
    for (let i = 0; i < frames; i++) await feed(midi, deltaMs)
  }

  /* Lock onto E3 and fill the median buffer with it, so subsequent changes
   * are seen by the median promptly. */
  async function lockE3(stable: Ref<NoteInfo | null>) {
    await feed(E3)
    await feed(E3, STABILIZE_START_HOLD_MS + 10)
    await feedSteady(E3, 5, 16)
    expect(stable.value?.midiNote).toBe(E3)
  }

  test('cold start: no pitch emitted until it holds for START_HOLD_MS', async () => {
    const { stableNoteInfo } = useStablePitch({ noteInfo, isClean })

    await feed(E3) // t=0 — candidate anchored
    expect(stableNoteInfo.value).toBeNull()

    await feed(E3, STABILIZE_START_HOLD_MS - 20) // still inside the hold
    expect(stableNoteInfo.value).toBeNull()

    await feed(E3, 30) // crosses START_HOLD_MS → adopted
    expect(stableNoteInfo.value?.midiNote).toBe(E3)
  })

  test('micro-drift (<2 st) is tracked instantly once a tone is held', async () => {
    const { stableNoteInfo } = useStablePitch({ noteInfo, isClean })

    await feed(E3)
    await feed(E3, STABILIZE_START_HOLD_MS + 10)
    expect(stableNoteInfo.value?.midiNote).toBe(E3)

    await feed(F3, 16) // +1 semitone — micro-drift, no hold
    expect(stableNoteInfo.value?.midiNote).toBe(F3)
  })

  test('an isolated octave spike never reaches the output', async () => {
    const { stableNoteInfo } = useStablePitch({ noteInfo, isClean })

    await lockE3(stableNoteInfo)

    /* One bad C5 frame, then back to E3 — the median outvotes it. */
    await feed(C5, 16)
    expect(stableNoteInfo.value?.midiNote).toBe(E3)

    await feed(E3, 16)
    expect(stableNoteInfo.value?.midiNote).toBe(E3)
  })

  test('a medium spike (+3 st) shorter than ACCEPT_HOLD_MS is ignored', async () => {
    const { stableNoteInfo } = useStablePitch({ noteInfo, isClean })

    await lockE3(stableNoteInfo)

    /* G3 for two frames (~32ms < 50ms), then back to E3 — the bird never
     * leaves E3 (median + the universal dwell both reject it). */
    await feed(G3, 16)
    await feed(G3, 16)
    expect(stableNoteInfo.value?.midiNote).toBe(E3)

    await feedSteady(E3, 3, 16)
    expect(stableNoteInfo.value?.midiNote).toBe(E3)
  })

  test('a sustained medium change (+3 st) is adopted after ACCEPT_HOLD_MS', async () => {
    const { stableNoteInfo } = useStablePitch({ noteInfo, isClean })

    await lockE3(stableNoteInfo)

    /* G3 held well past the median lag + the 50ms dwell. */
    await feedSteady(G3, 12, 16)
    expect(stableNoteInfo.value?.midiNote).toBe(G3)
  })

  test('a far jump uses the longer JUMP_HOLD, not the 50ms gate', async () => {
    const { stableNoteInfo } = useStablePitch({ noteInfo, isClean })

    await lockE3(stableNoteInfo)

    /* ~7 frames of C5: past ACCEPT_HOLD (50ms) but still under JUMP_HOLD
     * (100ms) once the median flips → a far jump must NOT have adopted yet. */
    await feedSteady(C5, 7, 16)
    expect(stableNoteInfo.value?.midiNote).toBe(E3)

    /* Sustained beyond JUMP_HOLD → adopted. */
    await feedSteady(C5, 8, 16)
    expect(stableNoteInfo.value?.midiNote).toBe(C5)
  })

  test('a far spike shorter than JUMP_HOLD_MS is rejected', async () => {
    const { stableNoteInfo } = useStablePitch({ noteInfo, isClean })

    await feed(E3)
    await feed(E3, STABILIZE_START_HOLD_MS + 10)

    /* C2 for less than the hold (a couple of frames) → never adopted. */
    await feed(C2, 16)
    await feed(C2, 16)
    expect(stableNoteInfo.value?.midiNote).toBe(E3)
  })

  test('silence resets, and re-acquiring needs the cold-start hold again', async () => {
    const { stableNoteInfo } = useStablePitch({ noteInfo, isClean })

    await feed(E3)
    await feed(E3, STABILIZE_START_HOLD_MS + 10)
    expect(stableNoteInfo.value?.midiNote).toBe(E3)

    await feed(null) // silence → reset
    expect(stableNoteInfo.value).toBeNull()

    await feed(E3, 16) // re-acquire: candidate anchored, not yet adopted
    expect(stableNoteInfo.value).toBeNull()

    await feed(E3, STABILIZE_JUMP_HOLD_MS + 10)
    expect(stableNoteInfo.value?.midiNote).toBe(E3)
  })

  /* Guards the constant relationship the tier test relies on. */
  test('ACCEPT_HOLD is shorter than JUMP_HOLD', () => {
    expect(STABILIZE_ACCEPT_HOLD_MS).toBeLessThan(STABILIZE_JUMP_HOLD_MS)
  })
})

describe('useStablePitch — voice-range gate', () => {
  let noteInfo: Ref<NoteInfo | null>
  let isClean: Ref<boolean>
  /* C3–C4 range, normal gap (1.5) → rangePad = max(1, 1.5) + 1 = 2.5, so the
   * accepted band is [45.5, 62.5]. E3 (52) is in band; C2 (36) is far below. */
  let midiMin: Ref<number>
  let midiMax: Ref<number>
  let gapHalfSemitones: Ref<number>

  beforeEach(() => {
    vi.useFakeTimers()
    noteInfo = ref<NoteInfo | null>(null)
    isClean = ref(false)
    midiMin = ref(48) // C3
    midiMax = ref(60) // C4
    gapHalfSemitones = ref(1.5) // normal
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  async function feed(midi: number | null, advanceMs = 0) {
    if (advanceMs > 0) vi.advanceTimersByTime(advanceMs)

    noteInfo.value = midi === null ? null : noteInfoForMidi(midi)
    isClean.value = midi !== null
    await nextTick()
  }

  async function feedSteady(midi: number, frames: number, deltaMs: number) {
    for (let i = 0; i < frames; i++) await feed(midi, deltaMs)
  }

  async function lockE3(stable: Ref<NoteInfo | null>) {
    await feed(E3)
    await feed(E3, STABILIZE_START_HOLD_MS + 10)
    await feedSteady(E3, 5, 16)
    expect(stable.value?.midiNote).toBe(E3)
  }

  test('a SUSTAINED out-of-band slide is treated as silence', async () => {
    const { stableNoteInfo } = useStablePitch({
      noteInfo,
      isClean,
      midiMin,
      midiMax,
      gapHalfSemitones,
    })

    await lockE3(stableNoteInfo)

    /* The breath/decay scenario: detector keeps emitting, sliding well below
     * the band. Once the median itself crosses below midiMin - rangePad the
     * gate fires → null (→ useBirdMotion grace + gravity), NOT C2 tracking. */
    await feedSteady(C2, 10, 16)
    expect(stableNoteInfo.value).toBeNull()
  })

  test('an isolated out-of-band spike is absorbed (gate is median-based)', async () => {
    const { stableNoteInfo } = useStablePitch({
      noteInfo,
      isClean,
      midiMin,
      midiMax,
      gapHalfSemitones,
    })

    await lockE3(stableNoteInfo)

    /* One C2 frame then back to E3 — the rolling median outvotes it, so the
     * gate never sees an out-of-band median: a lone octave error during real
     * in-range singing does not drop the held note. */
    await feed(C2, 16)
    expect(stableNoteInfo.value?.midiNote).toBe(E3)

    await feed(E3, 16)
    expect(stableNoteInfo.value?.midiNote).toBe(E3)
  })

  test('gate is opt-in: without the range refs a sustained C2 still adopts', async () => {
    const { stableNoteInfo } = useStablePitch({ noteInfo, isClean })

    await lockE3(stableNoteInfo)

    /* No range refs → gate inert → the far jump adopts after JUMP_HOLD,
     * exactly the pre-change behavior. */
    await feedSteady(C2, 15, 16)
    expect(stableNoteInfo.value?.midiNote).toBe(C2)
  })
})
