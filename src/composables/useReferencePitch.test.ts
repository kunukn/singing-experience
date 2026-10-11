import { beforeEach, describe, expect, test, vi } from 'vitest'
import {
  centsFromConcertPitch,
  clampReferencePitch,
  MAX_REFERENCE_PITCH,
  MIN_REFERENCE_PITCH,
} from './useReferencePitch'

const STORAGE_KEY = 'syng.tunerReferencePitch'

describe('clampReferencePitch', () => {
  test('keeps an in-range value, rounded to tenths of a Hz', () => {
    expect(clampReferencePitch(432)).toBe(432)
    expect(clampReferencePitch(433.24)).toBe(433.2)
  })

  test('clamps at both bounds', () => {
    expect(clampReferencePitch(400)).toBe(MIN_REFERENCE_PITCH)
    expect(clampReferencePitch(500)).toBe(MAX_REFERENCE_PITCH)
  })

  test('falls back to 440 for a non-number', () => {
    expect(clampReferencePitch(Number.NaN)).toBe(440)
  })
})

describe('centsFromConcertPitch', () => {
  test('432 Hz is about 32 cents flat of 440', () => {
    expect(centsFromConcertPitch(432)).toBe(-32)
    expect(centsFromConcertPitch(440)).toBe(0)
  })
})

describe('useReferencePitch', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  test('defaults to 440', async () => {
    const { useReferencePitch } = await import('./useReferencePitch')
    const { referenceA4, isDefault } = useReferencePitch()

    expect(referenceA4.value).toBe(440)
    expect(isDefault.value).toBe(true)
  })

  test('heals an out-of-range stored value', async () => {
    localStorage.setItem(STORAGE_KEY, '9000')
    const { useReferencePitch } = await import('./useReferencePitch')

    expect(useReferencePitch().referenceA4.value).toBe(MAX_REFERENCE_PITCH)
  })

  test('setReferencePitch clamps; reset returns to 440', async () => {
    const { useReferencePitch } = await import('./useReferencePitch')
    const { referenceA4, centsFrom440, setReferencePitch, reset } =
      useReferencePitch()

    setReferencePitch(431.96)
    expect(referenceA4.value).toBe(432)
    expect(centsFrom440.value).toBe(-32)

    setReferencePitch(10)
    expect(referenceA4.value).toBe(MIN_REFERENCE_PITCH)

    reset()
    expect(referenceA4.value).toBe(440)
  })
})
