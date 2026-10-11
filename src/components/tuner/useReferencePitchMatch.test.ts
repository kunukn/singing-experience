import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { NoteInfo } from '@/utils/noteUtils'
import {
  MATCH_WINDOW_MS,
  useReferencePitchMatch,
} from './useReferencePitchMatch'

/* ~60 fps detector frames */
const FRAME_MS = 16

function noteAt(cents: number, midiNote = 57): NoteInfo {
  return { note: 'A', octave: 3, cents, midiNote, frequency: 220 }
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
    midiNote?: number,
  ) {
    const frames = Math.ceil(durationMs / FRAME_MS)
    for (let index = 0; index <= frames; index++) {
      isClean.value = true
      noteInfo.value = noteAt(centsAt(index), midiNote)
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
    hold(MATCH_WINDOW_MS * 0.6, () => -30, 57)
    hold(FRAME_MS, () => -30, 59)

    expect(match.progress.value).toBeLessThan(0.1)
  })

  test('a wobbly attack is dropped, not averaged in', () => {
    const { match, hold } = setup()
    match.begin()
    hold(300, (index) => (index % 2 === 0 ? 40 : -40))
    hold(MATCH_WINDOW_MS, () => -32)

    expect(match.resultHz.value).toBeCloseTo(432, 0)
  })

  test('the result is clamped to the supported range', () => {
    const { match, hold } = setup(466)
    match.begin()
    hold(MATCH_WINDOW_MS, () => 45)

    expect(match.resultHz.value).toBe(466)
  })

  test('ignores frames until begin()', () => {
    const { match, hold } = setup()
    hold(MATCH_WINDOW_MS, () => -32)

    expect(match.progress.value).toBe(0)
    expect(match.resultHz.value).toBeNull()
  })
})
