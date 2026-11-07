import { afterEach, describe, expect, test, vi } from 'vitest'

import {
  createUploadedTake,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_MS,
} from './uploadedTake'

const createFile = (type = 'audio/mpeg', bytes = 3) =>
  new File([new Uint8Array(bytes)], 'song.mp3', { type })

const lastingSeconds = (seconds: number) => async () => seconds

afterEach(() => {
  vi.useRealTimers()
})

describe('createUploadedTake', () => {
  test('should turn a playable file into an uploaded take', async () => {
    vi.useFakeTimers({ now: new Date(2026, 10, 7, 14, 0) })
    const file = createFile()

    const result = await createUploadedTake(file, {
      readDuration: lastingSeconds(30),
    })

    expect(result).toEqual({
      take: {
        blob: file,
        mimeType: 'audio/mpeg',
        recordedAt: new Date(2026, 10, 7, 14, 0),
        stopReason: 'user',
        hasAutoGain: false,
        source: 'uploaded',
      },
    })
  })

  test('should refuse a file that is not sound', async () => {
    const readDuration = vi.fn(lastingSeconds(30))

    const result = await createUploadedTake(createFile('text/plain'), {
      readDuration,
    })

    expect(result).toEqual({ errorKey: 'voiceRecorder.upload.notAudio' })
    expect(readDuration).not.toHaveBeenCalled()
  })

  test('should let the browser decide when the file names no type', async () => {
    const result = await createUploadedTake(createFile(''), {
      readDuration: lastingSeconds(30),
    })

    expect('take' in result).toBe(true)
  })

  test('should accept a video file, whose sound can still be read', async () => {
    const result = await createUploadedTake(createFile('video/mp4'), {
      readDuration: lastingSeconds(30),
    })

    expect('take' in result).toBe(true)
  })

  test('should refuse a file too big to read safely', async () => {
    const result = await createUploadedTake(
      createFile('audio/wav', MAX_UPLOAD_BYTES + 1),
      { readDuration: lastingSeconds(30) },
    )

    expect(result).toEqual({ errorKey: 'voiceRecorder.upload.tooBig' })
  })

  test('should refuse a file the browser cannot play', async () => {
    const result = await createUploadedTake(createFile(), {
      readDuration: () => Promise.reject(new Error('unplayable')),
    })

    expect(result).toEqual({ errorKey: 'voiceRecorder.upload.notAudio' })
  })

  test('should refuse a recording longer than the limit', async () => {
    const result = await createUploadedTake(createFile(), {
      readDuration: lastingSeconds(MAX_UPLOAD_MS / 1000 + 1),
    })

    expect(result).toEqual({ errorKey: 'voiceRecorder.upload.tooLong' })
  })

  test('should accept a recording exactly at the limit', async () => {
    const result = await createUploadedTake(createFile(), {
      readDuration: lastingSeconds(MAX_UPLOAD_MS / 1000),
    })

    expect('take' in result).toBe(true)
  })

  test('should accept a file whose length the browser cannot tell', async () => {
    const result = await createUploadedTake(createFile('audio/webm'), {
      readDuration: lastingSeconds(Number.POSITIVE_INFINITY),
    })

    expect('take' in result).toBe(true)
  })
})
