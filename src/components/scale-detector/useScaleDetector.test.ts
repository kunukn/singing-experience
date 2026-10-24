import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { effectScope, nextTick, ref, type EffectScope } from 'vue'
import { useScaleDetector, type ScaleDetectorResult } from './useScaleDetector'

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

const F = 65
const A = 69
const C = 72
const D = 74
const E = 76
const G = 79

describe('useScaleDetector - removing a wrong note', () => {
  let clockMs = 0

  beforeEach(() => {
    clockMs = 0
    vi.spyOn(performance, 'now').mockImplementation(() => clockMs)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  /* Taps each key 100 ms apart, as a user would. */
  function tap(detector: ScaleDetectorResult, ...midis: number[]) {
    for (const midi of midis) {
      clockMs += 100
      detector.pressPianoKey(midi)
      detector.releasePianoKey(midi)
    }
  }

  async function startPianoOnly() {
    const { detector } = setup(ref(false))
    detector.toggleListening()
    await nextTick()

    return detector
  }

  const pitchClassesOf = (detector: ScaleDetectorResult) =>
    detector.notes.value.map((note) => note.midi % 12)

  test('should drop every note of a removed pitch class', async () => {
    const detector = await startPianoOnly()
    tap(detector, C, E, G, C + 12)

    detector.removePitchClass(0)

    expect(pitchClassesOf(detector)).toEqual([4, 7])
  })

  test('should count a removed pitch class again once it is played later', async () => {
    const detector = await startPianoOnly()
    tap(detector, C, E, G)

    detector.removePitchClass(0)
    tap(detector, C)

    expect(pitchClassesOf(detector)).toEqual([4, 7, 0])
  })

  test('should forget removals on reset', async () => {
    const detector = await startPianoOnly()
    tap(detector, C, E, G)
    detector.removePitchClass(0)

    detector.reset()
    clockMs = 0
    tap(detector, C)

    expect(pitchClassesOf(detector)).toEqual([0])
  })

  test('should suggest which note to drop when no chord fits', async () => {
    const detector = await startPianoOnly()
    tap(detector, F, A, C, D, E, G)

    expect(detector.chordResult.value.families).toHaveLength(0)
    expect(detector.chordFixes.value).toEqual([
      { pitchClass: 7, root: 2, type: 'minor9', bass: 5 },
      { pitchClass: 2, root: 5, type: 'major9', bass: 5 },
    ])
  })

  test('should match the suggested chord after applying its removal', async () => {
    const detector = await startPianoOnly()
    tap(detector, F, A, C, D, E, G)

    detector.removePitchClass(7)

    expect(detector.chordFixes.value).toEqual([])
    expect(
      detector.chordResult.value.families.flatMap(
        (family) => family.candidates,
      ),
    ).toContainEqual(expect.objectContaining({ root: 2, type: 'minor9' }))
  })

  test('should not suggest removals while a chord still fits', async () => {
    const detector = await startPianoOnly()
    tap(detector, C, E, G)

    expect(detector.chordFixes.value).toEqual([])
  })
})
