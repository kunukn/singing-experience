import { describe, expect, test } from 'vitest'

import {
  fileExtensionFor,
  formatFileSize,
  takeFileName,
} from './recorderFormat'

describe('recorderFormat', () => {
  test.each([
    { mimeType: 'audio/mp4;codecs=mp4a.40.2', expected: 'm4a' },
    { mimeType: 'audio/webm;codecs=opus', expected: 'webm' },
    { mimeType: 'audio/ogg;codecs=opus', expected: 'ogg' },
    { mimeType: 'audio/wav', expected: 'wav' },
  ])('maps $mimeType to .$expected', ({ mimeType, expected }) => {
    expect(fileExtensionFor(mimeType)).toBe(expected)
  })

  test('names the file from local date and time', () => {
    const recordedAt = new Date(2026, 10, 4, 15, 30)

    expect(takeFileName('audio/wav', recordedAt)).toBe(
      'voice-recording-2026-11-04-1530.wav',
    )
  })
})

describe('formatFileSize', () => {
  test.each([
    { bytes: 300, locale: 'en', expected: '1 kB' },
    { bytes: 576_000, locale: 'en', expected: '576 kB' },
    { bytes: 999_600, locale: 'en', expected: '1 MB' },
    { bytes: 5_760_000, locale: 'en', expected: '5.8 MB' },
    { bytes: 5_760_000, locale: 'de', expected: '5,8 MB' },
  ])(
    'formats $bytes bytes in $locale as "$expected"',
    ({ bytes, locale, expected }) => {
      expect(formatFileSize(bytes, locale)).toBe(expected)
    },
  )
})
