import { describe, expect, test } from 'vitest'

import {
  fileExtensionFor,
  pickRecorderMimeType,
  takeFileName,
} from './recorderFormat'

describe('recorderFormat', () => {
  test('prefers AAC in MP4 when the browser records it', () => {
    expect(pickRecorderMimeType(() => true)).toBe('audio/mp4;codecs=mp4a.40.2')
  })

  test('prefers WebM Opus over a bare MP4 that may hold Opus', () => {
    const chromiumWithoutAac = (mimeType: string) =>
      mimeType === 'audio/mp4' || mimeType === 'audio/webm;codecs=opus'

    expect(pickRecorderMimeType(chromiumWithoutAac)).toBe(
      'audio/webm;codecs=opus',
    )
  })

  test('returns undefined when no preferred format is supported', () => {
    expect(pickRecorderMimeType(() => false)).toBeUndefined()
  })

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

    expect(takeFileName('audio/mp4', recordedAt)).toBe(
      'voice-recording-2026-11-04-1530.m4a',
    )
  })
})
