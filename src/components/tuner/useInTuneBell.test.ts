import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { effectScope, nextTick, ref, type EffectScope } from 'vue'
import type { NoteInfo, NoteName } from '@/utils/noteUtils'
import { useInTuneBell } from './useInTuneBell'

type TuningString = { note: NoteName; octave: number }

const E2: TuningString = { note: 'E', octave: 2 }
const A2: TuningString = { note: 'A', octave: 2 }

/* One detector frame at 60 fps */
const FRAME_MS = 16

let scope: EffectScope | undefined

function reading(string: TuningString, cents: number): NoteInfo {
  return { ...string, cents, midiNote: 0, frequency: 0 }
}

function setup() {
  const live = {
    noteInfo: ref<NoteInfo | null>(null),
    isClean: ref(true),
    isListening: ref(true),
  }
  const onBell = vi.fn()
  scope = effectScope()
  const bell = scope.run(() =>
    useInTuneBell({
      strings: [E2, A2],
      noteInfo: live.noteInfo,
      isClean: live.isClean,
      isListening: live.isListening,
      onBell,
    }),
  )!

  /* Set the reading and let the watchers see it */
  async function hear(string: TuningString | null, cents = 0) {
    live.noteInfo.value = string ? reading(string, cents) : null
    await nextTick()
  }

  return { live, bell, onBell, hear }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  scope?.stop()
  scope = undefined
  vi.useRealTimers()
})

describe('useInTuneBell', () => {
  test('should ring once a string has held in tune for 500 ms', async () => {
    const { onBell, hear } = setup()

    await hear(E2)
    vi.advanceTimersByTime(499)
    expect(onBell).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(onBell).toHaveBeenCalledTimes(1)
    expect(onBell).toHaveBeenCalledWith(E2)
  })

  test('should confirm the highlight after 250 ms', async () => {
    const { bell, hear } = setup()

    await hear(E2)
    vi.advanceTimersByTime(249)
    expect(bell.confirmedInTuneString.value).toBeNull()

    vi.advanceTimersByTime(1)
    expect(bell.confirmedInTuneString.value).toEqual(E2)
  })

  test('should not count a string outside the in-tune window', async () => {
    const { bell, onBell, hear } = setup()

    await hear(E2, 10)
    vi.advanceTimersByTime(1000)

    expect(bell.confirmedInTuneString.value).toBeNull()
    expect(onBell).not.toHaveBeenCalled()
  })

  test('should keep the sustain and highlight through a one-frame dropout', async () => {
    const { bell, onBell, hear } = setup()

    await hear(E2)
    vi.advanceTimersByTime(300)
    await hear(E2, 10)
    vi.advanceTimersByTime(FRAME_MS)
    await hear(E2)

    expect(bell.confirmedInTuneString.value).toEqual(E2)

    /* Still rings 500 ms after the first in-tune frame, not after the dropout */
    vi.advanceTimersByTime(500 - 300 - FRAME_MS)
    expect(onBell).toHaveBeenCalledTimes(1)
  })

  test('should let go after a dropout of 250 ms', async () => {
    const { bell, onBell, hear } = setup()

    /* Short enough that the grace runs out before the bell is due at 500 ms */
    await hear(E2)
    vi.advanceTimersByTime(100)
    await hear(null)
    vi.advanceTimersByTime(250)
    await nextTick()

    expect(bell.confirmedInTuneString.value).toBeNull()

    vi.advanceTimersByTime(1000)
    expect(onBell).not.toHaveBeenCalled()
  })

  test('should restart at once on a different string', async () => {
    const { bell, onBell, hear } = setup()

    await hear(E2)
    vi.advanceTimersByTime(400)
    await hear(A2)

    expect(bell.confirmedInTuneString.value).toBeNull()

    vi.advanceTimersByTime(499)
    expect(onBell).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(onBell).toHaveBeenCalledWith(A2)
  })

  test('should let go at once when listening stops', async () => {
    const { live, bell, onBell } = setup()

    live.noteInfo.value = reading(E2, 0)
    await nextTick()
    vi.advanceTimersByTime(300)

    live.isListening.value = false
    await nextTick()
    expect(bell.confirmedInTuneString.value).toBeNull()

    vi.advanceTimersByTime(1000)
    expect(onBell).not.toHaveBeenCalled()
  })

  test('should not ring the same string twice within 2 s', async () => {
    const { onBell, hear } = setup()

    await hear(E2)
    vi.advanceTimersByTime(500)
    await hear(null)
    vi.advanceTimersByTime(250)
    await nextTick()

    await hear(E2)
    vi.advanceTimersByTime(500)
    expect(onBell).toHaveBeenCalledTimes(1)

    await hear(null)
    vi.advanceTimersByTime(1000)
    await nextTick()
    await hear(E2)
    vi.advanceTimersByTime(500)
    expect(onBell).toHaveBeenCalledTimes(2)
  })

  test('should stay silent for 3 s after a reference string is tapped', async () => {
    const { bell, onBell, hear } = setup()

    bell.muteAfterTap()
    await hear(E2)
    vi.advanceTimersByTime(500)
    expect(onBell).not.toHaveBeenCalled()

    await hear(null)
    vi.advanceTimersByTime(2500)
    await nextTick()
    await hear(E2)
    vi.advanceTimersByTime(500)
    expect(onBell).toHaveBeenCalledTimes(1)
  })

  test('should drop a pending bell and the cooldown on reset', async () => {
    const { bell, onBell, hear } = setup()

    await hear(E2)
    vi.advanceTimersByTime(500)
    expect(onBell).toHaveBeenCalledTimes(1)

    /* The tuning changed while the string still reads in tune */
    bell.reset()
    await hear(null)
    await hear(E2)
    vi.advanceTimersByTime(500)

    expect(onBell).toHaveBeenCalledTimes(2)
  })
})
