import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { effectScope, type EffectScope } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

import { useVoiceTakeStore } from '@/stores/useVoiceTakeStore'
import { acquireMicStream, releaseMicStream } from '@/utils/microphoneStream'

import { MAX_RECORDING_MS, useVoiceRecorder } from './useVoiceRecorder'

vi.mock('@/components/voice-recorder/takePersistence', () => ({
  saveTake: vi.fn(() => Promise.resolve()),
  loadTake: vi.fn(() => Promise.resolve(null)),
  deleteSavedTake: vi.fn(() => Promise.resolve()),
}))

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
  setActivePinia(createPinia())
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
    expect(useVoiceTakeStore().take?.blob.size).toBe(100)
    expect(useVoiceTakeStore().take?.mimeType).toBe('audio/webm;codecs=opus')
    expect(useVoiceTakeStore().take?.stopReason).toBe('user')
  })

  test('should stop itself at the time limit', async () => {
    const recorder = createRecorder()

    await recorder.start()
    vi.advanceTimersByTime(MAX_RECORDING_MS + 500)

    expect(useVoiceTakeStore().take?.stopReason).toBe('limit')
  })

  test('should stop itself when the file grows past the size limit', async () => {
    const recorder = createRecorder()

    await recorder.start()
    FakeMediaRecorder.latest.deliver(8 * 1024 * 1024)

    expect(useVoiceTakeStore().take?.stopReason).toBe('limit')
  })

  test.each(['ended', 'mute'])(
    'should keep what was sung when the track fires %s',
    async (eventName) => {
      const recorder = createRecorder()

      await recorder.start()
      track.dispatchEvent(new Event(eventName))

      expect(useVoiceTakeStore().take?.stopReason).toBe('interrupted')
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

  test('should keep the take and release the mic when leaving mid-take', async () => {
    const recorder = createRecorder()

    await recorder.start()
    scope.stop()

    expect(releaseMicStream).toHaveBeenCalledWith(stream)
    expect(useVoiceTakeStore().take?.stopReason).toBe('interrupted')
  })

  test('should replace the previous take when a new one stops', async () => {
    const recorder = createRecorder()

    await recorder.start()
    recorder.stop()
    const firstTake = useVoiceTakeStore().take

    await recorder.start()
    recorder.stop()

    expect(useVoiceTakeStore().take).not.toBe(firstTake)
    expect(useVoiceTakeStore().take?.stopReason).toBe('user')
  })
})
