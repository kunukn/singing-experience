import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { effectScope, type EffectScope } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

import { useVoiceTakeStore } from '@/stores/useVoiceTakeStore'
import { acquireMicStream, releaseMicStream } from '@/utils/microphoneStream'

import { loadPcmCaptureProcessor } from './pcmCapture'
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

vi.mock('./pcmCapture', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./pcmCapture')>()),
  loadPcmCaptureProcessor: vi.fn(),
}))

/* Low, so a test can hand over a whole minute of samples cheaply. */
const SAMPLE_RATE = 1000
const WAV_HEADER_BYTES = 44
const BYTES_PER_SAMPLE = 3

class FakeAudioContext extends EventTarget {
  static latest: FakeAudioContext

  sampleRate = SAMPLE_RATE
  state: AudioContextState = 'running'
  destination = {}

  constructor() {
    super()
    FakeAudioContext.latest = this
  }

  resume() {
    return Promise.resolve()
  }

  close() {
    this.state = 'closed'

    return Promise.resolve()
  }

  createMediaStreamSource() {
    return { connect: vi.fn(), disconnect: vi.fn() }
  }

  suspend() {
    this.state = 'suspended'
    this.dispatchEvent(new Event('statechange'))
  }
}

class FakeAudioWorkletNode extends EventTarget {
  static latest: FakeAudioWorkletNode

  port: { onmessage: ((event: { data: Float32Array }) => void) | null } = {
    onmessage: null,
  }

  connect = vi.fn()
  disconnect = vi.fn()

  constructor() {
    super()
    FakeAudioWorkletNode.latest = this
  }

  deliver(samples: Float32Array) {
    this.port.onmessage?.({ data: samples })
  }
}

const track = Object.assign(new EventTarget(), {
  getSettings: () => ({ autoGainControl: false }),
})
const stream = { getAudioTracks: () => [track] } as unknown as MediaStream

function createTone(seconds: number) {
  return Float32Array.from(
    { length: seconds * SAMPLE_RATE },
    (_, i) => 0.5 * Math.sin((2 * Math.PI * 100 * i) / SAMPLE_RATE),
  )
}

const createSilence = (seconds: number) =>
  new Float32Array(seconds * SAMPLE_RATE)

let scope: EffectScope

function createRecorder() {
  scope = effectScope()

  return scope.run(() => useVoiceRecorder())!
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.useFakeTimers()
  vi.stubGlobal('AudioContext', FakeAudioContext)
  vi.stubGlobal('AudioWorkletNode', FakeAudioWorkletNode)
  vi.mocked(loadPcmCaptureProcessor).mockReset().mockResolvedValue()
  vi.mocked(acquireMicStream).mockReset().mockResolvedValue(stream)
  vi.mocked(releaseMicStream).mockReset()
})

afterEach(() => {
  scope?.stop()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('useVoiceRecorder', () => {
  test('should save a trimmed 24-bit WAV and release the mic on stop', async () => {
    const recorder = createRecorder()

    await recorder.start()
    expect(recorder.status.value).toBe('recording')

    FakeAudioWorkletNode.latest.deliver(createSilence(1))
    FakeAudioWorkletNode.latest.deliver(createTone(1))
    FakeAudioWorkletNode.latest.deliver(createSilence(1))
    recorder.stop()

    const take = useVoiceTakeStore().take
    expect(recorder.status.value).toBe('idle')
    expect(releaseMicStream).toHaveBeenCalledWith(stream)
    expect(FakeAudioContext.latest.state).toBe('closed')
    expect(take?.mimeType).toBe('audio/wav')
    expect(take?.stopReason).toBe('user')
    /* The 1 s tone plus 150 ms lead-in and 250 ms tail; the silence is gone. */
    expect(take?.blob.size).toBe(WAV_HEADER_BYTES + 1400 * BYTES_PER_SAMPLE)
  })

  test('should stop itself at the time limit', async () => {
    const recorder = createRecorder()

    await recorder.start()
    FakeAudioWorkletNode.latest.deliver(createTone(1))
    vi.advanceTimersByTime(MAX_RECORDING_MS + 500)

    expect(useVoiceTakeStore().take?.stopReason).toBe('limit')
  })

  test('should stop itself once a full minute of samples has arrived', async () => {
    const recorder = createRecorder()

    await recorder.start()
    FakeAudioWorkletNode.latest.deliver(createTone(MAX_RECORDING_MS / 1000))

    expect(recorder.status.value).toBe('idle')
    expect(useVoiceTakeStore().take?.stopReason).toBe('limit')
  })

  test.each(['ended', 'mute'])(
    'should keep what was sung when the track fires %s',
    async (eventName) => {
      const recorder = createRecorder()

      await recorder.start()
      FakeAudioWorkletNode.latest.deliver(createTone(1))
      track.dispatchEvent(new Event(eventName))

      expect(useVoiceTakeStore().take?.stopReason).toBe('interrupted')
      expect(recorder.status.value).toBe('idle')
    },
  )

  test('should keep what was sung when the audio context is suspended', async () => {
    const recorder = createRecorder()

    await recorder.start()
    FakeAudioWorkletNode.latest.deliver(createTone(1))
    FakeAudioContext.latest.suspend()

    expect(useVoiceTakeStore().take?.stopReason).toBe('interrupted')
  })

  test('should report an empty take when no samples arrived', async () => {
    const recorder = createRecorder()

    await recorder.start()
    recorder.stop()

    expect(recorder.errorKey.value).toBe('voiceRecorder.emptyTake')
    expect(useVoiceTakeStore().take).toBeNull()
  })

  test('should report a blocked microphone and close the audio context', async () => {
    vi.mocked(acquireMicStream).mockRejectedValue(
      new DOMException('blocked', 'NotAllowedError'),
    )
    const recorder = createRecorder()

    await recorder.start()

    expect(recorder.errorKey.value).toBe('errors.microphoneDenied')
    expect(recorder.status.value).toBe('idle')
    expect(FakeAudioContext.latest.state).toBe('closed')
  })

  test('should report a browser without AudioWorklet', async () => {
    vi.stubGlobal('AudioWorkletNode', undefined)
    const recorder = createRecorder()

    await recorder.start()

    expect(recorder.errorKey.value).toBe('voiceRecorder.notSupported')
    expect(acquireMicStream).not.toHaveBeenCalled()
  })

  test('should report and release the mic when the capture processor fails to load', async () => {
    vi.mocked(loadPcmCaptureProcessor).mockRejectedValue(new Error('blocked'))
    const recorder = createRecorder()

    await recorder.start()

    expect(recorder.errorKey.value).toBe('voiceRecorder.notSupported')
    expect(recorder.status.value).toBe('idle')
    expect(releaseMicStream).toHaveBeenCalledWith(stream)
  })

  test('should keep the take and release the mic when leaving mid-take', async () => {
    const recorder = createRecorder()

    await recorder.start()
    FakeAudioWorkletNode.latest.deliver(createTone(1))
    scope.stop()

    expect(releaseMicStream).toHaveBeenCalledWith(stream)
    expect(useVoiceTakeStore().take?.stopReason).toBe('interrupted')
  })

  test('should replace the previous take when a new one stops', async () => {
    const recorder = createRecorder()

    await recorder.start()
    FakeAudioWorkletNode.latest.deliver(createTone(1))
    recorder.stop()
    const firstTake = useVoiceTakeStore().take

    await recorder.start()
    FakeAudioWorkletNode.latest.deliver(createTone(1))
    recorder.stop()

    expect(useVoiceTakeStore().take).not.toBe(firstTake)
    expect(useVoiceTakeStore().take?.stopReason).toBe('user')
  })
})
