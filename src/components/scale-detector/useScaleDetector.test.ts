import { afterEach, describe, expect, test, vi } from 'vitest'
import { effectScope, nextTick, ref, type EffectScope } from 'vue'
import { useScaleDetector } from './useScaleDetector'

function createFakeDetection() {
  return {
    frequency: ref<number | null>(null),
    isClean: ref(false),
    start: vi.fn(async () => {}),
    stop: vi.fn(),
  }
}

let scope: EffectScope | undefined

function setup(isVoiceEnabled = ref(true)) {
  const detection = createFakeDetection()
  scope = effectScope()
  const detector = scope.run(() =>
    useScaleDetector({ detection, isVoiceEnabled }),
  )!

  return { detection, detector, isVoiceEnabled }
}

afterEach(() => {
  scope?.stop()
  scope = undefined
})

describe('useScaleDetector', () => {
  test('piano only: Start never opens the mic', async () => {
    const { detection, detector } = setup(ref(false))

    detector.toggleListening()
    await nextTick()

    expect(detector.isListening.value).toBe(true)
    expect(detection.start).not.toHaveBeenCalled()
  })

  test('piano only: played keys still count as notes', async () => {
    const { detector } = setup(ref(false))

    detector.toggleListening()
    await nextTick()
    detector.pressPianoKey(60)
    detector.pressPianoKey(64)
    detector.pressPianoKey(67)

    expect(detector.notes.value.map((note) => note.midi)).toEqual([60, 64, 67])
    expect(detector.chordResult.value.families[0].candidates[0]).toMatchObject({
      root: 0,
      type: 'major',
    })
  })

  test('switching to piano only mid-session closes the mic but keeps listening', async () => {
    const { detection, detector, isVoiceEnabled } = setup()

    detector.toggleListening()
    await nextTick()
    expect(detection.start).toHaveBeenCalledTimes(1)

    isVoiceEnabled.value = false
    await nextTick()

    expect(detection.stop).toHaveBeenCalledTimes(1)
    expect(detector.isListening.value).toBe(true)

    isVoiceEnabled.value = true
    await nextTick()

    expect(detection.start).toHaveBeenCalledTimes(2)
  })

  test('switching input mode while stopped does not touch the mic', async () => {
    const { detection, isVoiceEnabled } = setup()

    isVoiceEnabled.value = false
    await nextTick()
    isVoiceEnabled.value = true
    await nextTick()

    expect(detection.start).not.toHaveBeenCalled()
    expect(detection.stop).not.toHaveBeenCalled()
  })
})
