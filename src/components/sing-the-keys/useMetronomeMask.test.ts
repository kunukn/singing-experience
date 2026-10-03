import { describe, expect, test } from 'vitest'
import { ref } from 'vue'
import type { NoteInfo } from '@/utils/noteUtils'
import { frequencyToNote } from '@/utils/noteUtils'
import { useMetronomeMask } from './useMetronomeMask'

/* The keyboard in these tests: B2 to D4. */
const MIN_HZ = 123.5
const MAX_HZ = 293.7
const C3_HZ = 130.8
/* What a detector can make of the metronome through a loudspeaker: a stray
 * pitch off either end of the keyboard. */
const STRAY_LOW_HZ = 67
const STRAY_HIGH_HZ = 1395

function createMask() {
  const frequency = ref<number | null>(null)
  const noteInfo = ref<NoteInfo | null>(null)
  const isClean = ref(false)
  const isMasking = ref(false)
  const masked = useMetronomeMask(
    { frequency, noteInfo, isClean },
    isMasking,
    () => MIN_HZ,
    () => MAX_HZ,
  )

  /* The same three writes, in the same order, as usePitchDetection. */
  function detect(hz: number | null) {
    frequency.value = hz
    noteInfo.value = hz === null ? null : frequencyToNote(hz)
    isClean.value = hz !== null
  }

  return { masked, isMasking, detect }
}

describe('useMetronomeMask', () => {
  test('should pass every frame through while no tick sounds', () => {
    const { masked, detect } = createMask()

    detect(STRAY_LOW_HZ)

    expect(masked.frequency.value).toBe(STRAY_LOW_HZ)
    expect(masked.noteInfo.value?.note).toBe('C')
    expect(masked.isClean.value).toBe(true)
  })

  test.each([
    { name: 'below', strayHz: STRAY_LOW_HZ },
    { name: 'above', strayHz: STRAY_HIGH_HZ },
  ])(
    'should hold the sung pitch through a frame $name the keyboard',
    ({ strayHz }) => {
      const { masked, isMasking, detect } = createMask()
      detect(C3_HZ)

      isMasking.value = true
      detect(strayHz)

      expect(masked.frequency.value).toBe(C3_HZ)
      expect(masked.noteInfo.value?.octave).toBe(3)
      expect(masked.isClean.value).toBe(true)
    },
  )

  test('should hold the sung pitch through a frame with no pitch', () => {
    const { masked, isMasking, detect } = createMask()
    detect(C3_HZ)

    isMasking.value = true
    detect(null)

    expect(masked.frequency.value).toBe(C3_HZ)
    expect(masked.isClean.value).toBe(true)
  })

  test('should stay empty when the singer was silent before the tick', () => {
    const { masked, isMasking, detect } = createMask()

    isMasking.value = true
    detect(STRAY_HIGH_HZ)

    expect(masked.frequency.value).toBeNull()
    expect(masked.noteInfo.value).toBeNull()
    expect(masked.isClean.value).toBe(false)
  })

  test('should let a note sung on the beat through', () => {
    const { masked, isMasking, detect } = createMask()

    isMasking.value = true
    detect(C3_HZ)

    expect(masked.frequency.value).toBe(C3_HZ)
    expect(masked.noteInfo.value?.octave).toBe(3)
    expect(masked.isClean.value).toBe(true)
  })

  test('should catch up with the mic when the tick has died away', () => {
    const { masked, isMasking, detect } = createMask()
    detect(C3_HZ)
    isMasking.value = true
    detect(null)

    isMasking.value = false

    expect(masked.frequency.value).toBeNull()
    expect(masked.isClean.value).toBe(false)
  })
})
