import { describe, expect, test } from 'vitest'

import { fileExtensionFor, takeFileName } from './recorderFormat'

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
