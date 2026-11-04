import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { effectScope, type EffectScope } from 'vue'

import { acquireMicStream, releaseMicStream } from '@/utils/microphoneStream'

import { MAX_RECORDING_MS, useVoiceRecorder } from './useVoiceRecorder'

vi.mock('@/utils/microphoneStream', () => ({
  acquireMicStream: vi.fn(),
  releaseMicStream: vi.fn(),
}))

class FakeMediaRecorder extends EventTarget {
  static latest: FakeMediaRecorder
  static isTypeSupported = (mimeType: string) =>
    mimeType === 'audio/webm;codecs=opus'

  state: 'inactive' | 'recording' = 'inactive'
  mimeType: string

  constructor(_stream: MediaStream, options: MediaRecorderOptions) {
    super()
    this.mimeType = options.mimeType ?? ''
    FakeMediaRecorder.latest = this
  }

  start() {
    this.state = 'recording'
  }

  deliver(size: number) {
    const event = new Event('dataavailable') as Event & { data: Blob }
    event.data = new Blob([new Uint8Array(size)])
    this.dispatchEvent(event)
  }

  stop() {
    this.state = 'inactive'
    this.deliver(100)
    this.dispatchEvent(new Event('stop'))
  }
}

const track = Object.assign(new EventTarget(), {
  getSettings: () => ({ autoGainControl: false }),
})
const stream = { getAudioTracks: () => [track] } as unknown as MediaStream

let scope: EffectScope

function createRecorder() {
  scope = effectScope()

  return scope.run(() => useVoiceRecorder())!
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('MediaRecorder', FakeMediaRecorder)
  vi.mocked(acquireMicStream).mockReset().mockResolvedValue(stream)
  vi.mocked(releaseMicStream).mockReset()
})

afterEach(() => {
  scope?.stop()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('useVoiceRecorder', () => {
  test('should keep the take and release the mic only after the stop event', async () => {
    const recorder = createRecorder()

    await recorder.start()
    expect(recorder.status.value).toBe('recording')

    const fake = FakeMediaRecorder.latest
    const stopEvent = vi.spyOn(fake, 'stop').mockImplementation(() => {
      fake.state = 'inactive'
    })

    recorder.stop()
    expect(recorder.status.value).toBe('stopping')
    expect(releaseMicStream).not.toHaveBeenCalled()

    stopEvent.mockRestore()
    fake.deliver(100)
    fake.dispatchEvent(new Event('stop'))

    expect(releaseMicStream).toHaveBeenCalledWith(stream)
    expect(recorder.status.value).toBe('idle')
    expect(recorder.take.value?.blob.size).toBe(100)
    expect(recorder.take.value?.mimeType).toBe('audio/webm;codecs=opus')
    expect(recorder.take.value?.stopReason).toBe('user')
  })

  test('should stop itself at the time limit', async () => {
    const recorder = createRecorder()

    await recorder.start()
    vi.advanceTimersByTime(MAX_RECORDING_MS + 500)

    expect(recorder.take.value?.stopReason).toBe('limit')
  })

  test('should stop itself when the file grows past the size limit', async () => {
    const recorder = createRecorder()

    await recorder.start()
    FakeMediaRecorder.latest.deliver(8 * 1024 * 1024)

    expect(recorder.take.value?.stopReason).toBe('limit')
  })

  test.each(['ended', 'mute'])(
    'should keep what was sung when the track fires %s',
    async (eventName) => {
      const recorder = createRecorder()

      await recorder.start()
      track.dispatchEvent(new Event(eventName))

      expect(recorder.take.value?.stopReason).toBe('interrupted')
      expect(recorder.status.value).toBe('idle')
    },
  )

  test('should report a blocked microphone', async () => {
    vi.mocked(acquireMicStream).mockRejectedValue(
      new DOMException('blocked', 'NotAllowedError'),
    )
    const recorder = createRecorder()

    await recorder.start()

    expect(recorder.errorKey.value).toBe('errors.microphoneDenied')
    expect(recorder.status.value).toBe('idle')
  })

  test('should report a browser without MediaRecorder', async () => {
    vi.stubGlobal('MediaRecorder', undefined)
    const recorder = createRecorder()

    await recorder.start()

    expect(recorder.errorKey.value).toBe('voiceRecorder.notSupported')
    expect(acquireMicStream).not.toHaveBeenCalled()
  })

  test('should release the mic when leaving the page mid-take', async () => {
    const recorder = createRecorder()

    await recorder.start()
    scope.stop()

    expect(releaseMicStream).toHaveBeenCalledWith(stream)
    expect(recorder.take.value).toBeNull()
  })
})
