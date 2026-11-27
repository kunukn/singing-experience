import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  frequencyToNote,
  midiToFrequency,
  type NoteInfo,
} from '@/utils/noteUtils'
import { CLOSE_CENTS } from '@/utils/pitchColors'
import {
  MATCH_WINDOW_MS,
  useReferencePitchMatch,
} from './useReferencePitchMatch'

/* ~60 fps detector frames */
const FRAME_MS = 16

const A3_MIDI = 57
const B3_MIDI = 59

/* What the detector reports for a pitch `cents` off `midiNote`. It measures
 * against the current reference, so the note, cents and frequency are all read
 * off the one frequency on that grid. */
function noteAt(
  cents: number,
  midiNote: number,
  referenceA4: number,
): NoteInfo {
  const frequency = midiToFrequency(midiNote + cents / 100, referenceA4)

  return frequencyToNote(frequency, undefined, referenceA4)!
}

function setup(referenceA4 = 440) {
  const noteInfo = shallowRef<NoteInfo | null>(null)
  const isClean = ref(false)
  const match = useReferencePitchMatch({
    noteInfo,
    isClean,
    referenceA4: ref(referenceA4),
  })

  /* Feed `durationMs` of frames, cents from `centsAt(frameIndex)` */
  function hold(
    durationMs: number,
    centsAt: (index: number) => number,
    midiNote = A3_MIDI,
  ) {
    const frames = Math.ceil(durationMs / FRAME_MS)
    for (let index = 0; index <= frames; index++) {
      isClean.value = true
      noteInfo.value = noteAt(centsAt(index), midiNote, referenceA4)
      vi.advanceTimersByTime(FRAME_MS)
    }
  }

  function loseSignal() {
    isClean.value = false
    noteInfo.value = null
  }

  return { match, hold, loseSignal }
}

describe('useReferencePitchMatch', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('a steady −32¢ note at 440 matches 432 Hz', () => {
    const { match, hold } = setup()
    match.begin()
    hold(MATCH_WINDOW_MS, (index) => -32 + (index % 3) - 1)

    expect(match.isCapturing.value).toBe(false)
    expect(match.progress.value).toBe(1)
    expect(match.resultHz.value).toBeCloseTo(432, 0)
  })

  test('works from a non-440 starting reference', () => {
    /* Already at 432; recording plays +32¢ against that → back near 440 */
    const { match, hold } = setup(432)
    match.begin()
    hold(MATCH_WINDOW_MS, () => 32)

    expect(match.resultHz.value).toBeCloseTo(440, 0)
  })

  test('losing the signal restarts the window', () => {
    const { match, hold, loseSignal } = setup()
    match.begin()
    hold(MATCH_WINDOW_MS * 0.6, () => -30)
    loseSignal()

    expect(match.progress.value).toBe(0)
    expect(match.isCapturing.value).toBe(true)
    expect(match.resultHz.value).toBeNull()
  })

  test('a change of note restarts the window', () => {
    const { match, hold } = setup()
    match.begin()
    hold(MATCH_WINDOW_MS * 0.6, () => -30, A3_MIDI)
    hold(FRAME_MS, () => -30, B3_MIDI)

    expect(match.progress.value).toBeLessThan(0.1)
  })

  test('should drop a wobbly attack instead of averaging it in', () => {
    const { match, hold } = setup()
    match.begin()
    /* Swinging ±CLOSE_CENTS is twice the spread a steady note may have. Held
     * for a whole window, because the median shrugs off a short wobble either
     * way: only a window that never fills shows the wobble was dropped. */
    hold(MATCH_WINDOW_MS, (index) =>
      index % 2 === 0 ? CLOSE_CENTS : -CLOSE_CENTS,
    )

    expect(match.isCapturing.value).toBe(true)
    expect(match.resultHz.value).toBeNull()

    hold(MATCH_WINDOW_MS, () => -32)

    expect(match.resultHz.value).toBeCloseTo(432, 0)
  })

  test('should clamp the result to the supported range', () => {
    /* +45¢ above the highest supported reference */
    const { match, hold } = setup(MAX_REFERENCE_PITCH)
    match.begin()
    hold(MATCH_WINDOW_MS, () => 45)

    expect(match.resultHz.value).toBe(MAX_REFERENCE_PITCH)
  })

  test('ignores frames until begin()', () => {
    const { match, hold } = setup()
    hold(MATCH_WINDOW_MS, () => -32)

    expect(match.progress.value).toBe(0)
    expect(match.resultHz.value).toBeNull()
  })
})
