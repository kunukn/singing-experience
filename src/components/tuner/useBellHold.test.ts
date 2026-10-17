import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { effectScope, ref, type EffectScope } from 'vue'
import type { NoteInfo } from '@/utils/noteUtils'
import { useBellHold } from './useBellHold'

const D3: NoteInfo = {
  note: 'D',
  octave: 3,
  cents: 1,
  midiNote: 50,
  frequency: 146.9,
}

const BELL_MS = 2000

let scope: EffectScope | undefined

function setup() {
  const live = {
    noteInfo: ref<NoteInfo | null>(D3),
    frequency: ref<number | null>(146.9),
    isClean: ref(true),
  }
  scope = effectScope()
  const bellHold = scope.run(() => useBellHold(live))!

  return { live, bellHold }
}

/* What the detector reports when the bell drowns the string */
function dropReading(live: ReturnType<typeof setup>['live']) {
  live.noteInfo.value = null
  live.frequency.value = null
  live.isClean.value = false
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  scope?.stop()
  scope = undefined
  vi.useRealTimers()
})

describe('useBellHold', () => {
  test('keeps the bell reading while the bell drowns the string', () => {
    const { live, bellHold } = setup()

    bellHold.hold(BELL_MS)
    dropReading(live)

    expect(bellHold.noteInfo.value).toEqual(D3)
    expect(bellHold.frequency.value).toBe(146.9)
    expect(bellHold.isClean.value).toBe(true)
  })

  test('returns to the live reading once the bell has faded', () => {
    const { live, bellHold } = setup()

    bellHold.hold(BELL_MS)
    dropReading(live)
    vi.advanceTimersByTime(BELL_MS)

    expect(bellHold.noteInfo.value).toBeNull()
    expect(bellHold.isClean.value).toBe(false)
  })

  test('lets a clean live reading win over the held one', () => {
    const { live, bellHold } = setup()
    const sharperD3 = { ...D3, cents: 12, frequency: 147.9 }

    bellHold.hold(BELL_MS)
    live.noteInfo.value = sharperD3
    live.frequency.value = 147.9

    expect(bellHold.noteInfo.value).toEqual(sharperD3)
    expect(bellHold.frequency.value).toBe(147.9)
  })

  test('does not hold without a clean reading', () => {
    const { live, bellHold } = setup()

    dropReading(live)
    bellHold.hold(BELL_MS)

    expect(bellHold.isClean.value).toBe(false)
  })

  test('ends the hold early on release', () => {
    const { live, bellHold } = setup()

    bellHold.hold(BELL_MS)
    dropReading(live)
    bellHold.release()

    expect(bellHold.noteInfo.value).toBeNull()
  })
})
