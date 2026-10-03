import { describe, expect, test } from 'vitest'
import { ref } from 'vue'
import type { NoteInfo } from '@/utils/noteUtils'
import { frequencyToNote } from '@/utils/noteUtils'
import { useMetronomeMask } from './useMetronomeMask'

/* The keyboard's lowest key in these tests: B2. */
const MIN_HZ = 123.5
const C3_HZ = 130.8
/* What the detector makes of the thud through a loudspeaker. */
const THUD_HZ = 67

function createMask() {
  const frequency = ref<number | null>(null)
  const noteInfo = ref<NoteInfo | null>(null)
  const isClean = ref(false)
  const isMasking = ref(false)
  const masked = useMetronomeMask(
    { frequency, noteInfo, isClean },
    isMasking,
    () => MIN_HZ,
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
  test('should pass every frame through while no thud sounds', () => {
    const { masked, detect } = createMask()

    detect(THUD_HZ)

    expect(masked.frequency.value).toBe(THUD_HZ)
    expect(masked.noteInfo.value?.note).toBe('C')
    expect(masked.isClean.value).toBe(true)
  })

  test('should hold the sung pitch through a frame below the keyboard', () => {
    const { masked, isMasking, detect } = createMask()
    detect(C3_HZ)

    isMasking.value = true
    detect(THUD_HZ)

    expect(masked.frequency.value).toBe(C3_HZ)
    expect(masked.noteInfo.value?.octave).toBe(3)
    expect(masked.isClean.value).toBe(true)
  })

  test('should hold the sung pitch through a frame with no pitch', () => {
    const { masked, isMasking, detect } = createMask()
    detect(C3_HZ)

    isMasking.value = true
    detect(null)

    expect(masked.frequency.value).toBe(C3_HZ)
    expect(masked.isClean.value).toBe(true)
  })

  test('should stay empty when the singer was silent before the thud', () => {
    const { masked, isMasking, detect } = createMask()

    isMasking.value = true
    detect(THUD_HZ)

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

  test('should catch up with the mic when the thud has died away', () => {
    const { masked, isMasking, detect } = createMask()
    detect(C3_HZ)
    isMasking.value = true
    detect(null)

    isMasking.value = false

    expect(masked.frequency.value).toBeNull()
    expect(masked.isClean.value).toBe(false)
  })
})
