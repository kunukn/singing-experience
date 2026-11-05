import { beforeEach, describe, expect, test, vi } from 'vitest'

const STORAGE_KEY = 'syng.voiceRecorderBitDepth'

/* The setting is read once at import, so each test imports a fresh copy. */
async function importRecordingQuality() {
  vi.resetModules()

  return import('./recordingQuality')
}

beforeEach(() => {
  localStorage.clear()
})

describe('recordingQuality', () => {
  test('defaults to Standard 16-bit', async () => {
    const { useRecordingBitDepth } = await importRecordingQuality()

    expect(useRecordingBitDepth().value).toBe(16)
  })

  test('keeps a saved Studio choice', async () => {
    localStorage.setItem(STORAGE_KEY, '24')
    const { useRecordingBitDepth } = await importRecordingQuality()

    expect(useRecordingBitDepth().value).toBe(24)
  })

  test('resets an unknown saved value to 16-bit', async () => {
    localStorage.setItem(STORAGE_KEY, '32')
    const { useRecordingBitDepth } = await importRecordingQuality()

    expect(useRecordingBitDepth().value).toBe(16)
  })

  test.each([
    { bits: 16 as const, expected: 6 },
    { bits: 24 as const, expected: 9 },
  ])(
    'estimates $expected MB a minute at $bits-bit',
    async ({ bits, expected }) => {
      const { megabytesPerMinute } = await importRecordingQuality()

      expect(megabytesPerMinute(bits)).toBe(expected)
    },
  )
})
