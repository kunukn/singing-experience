import { useEventListener, useIntervalFn, useWakeLock } from '@vueuse/core'

import { acquireMicStream, releaseMicStream } from '@/utils/microphoneStream'

import {
  createSampleCollector,
  loadPcmCaptureProcessor,
  PCM_CAPTURE_PROCESSOR,
  type SampleCollector,
} from './pcmCapture'
import { useRecordingBitDepth } from './recordingQuality'
import { trimSilence } from './trimSilence'
import { encodeWav, type WavBitDepth } from './wavEncoder'

/* Most takes are a few seconds, so the cap pays for lossless WAV: at 48 kHz
 * about 5.8 MB a minute at 16-bit, 8.6 MB at 24-bit. */
export const MAX_RECORDING_MS = 60 * 1000
const CLOCK_TICK_MS = 200

/* Nothing plays while recording, so the voice can be captured unprocessed:
 * noise suppression treats a held tone as hiss and auto gain ducks it. */
const RECORDING_CONSTRAINTS: MediaTrackConstraints = {
  channelCount: 1,
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
}

export type RecorderStatus = 'idle' | 'starting' | 'recording'
export type RecordingStopReason = 'user' | 'limit' | 'interrupted'
export type RecorderErrorKey =
  | 'errors.microphoneDenied'
  | 'errors.microphoneAccess'
  | 'voiceRecorder.notSupported'
  | 'voiceRecorder.emptyTake'

export type Take = {
  blob: Blob
  mimeType: string
  recordedAt: Date
  stopReason: RecordingStopReason
  /* The browser kept auto gain on, so loudness can't be trusted in analysis. */
  hasAutoGain: boolean
}

function isCaptureSupported() {
  return (
    typeof AudioContext !== 'undefined' &&
    typeof AudioWorkletNode !== 'undefined'
  )
}

export function useVoiceRecorder() {
  const status = ref<RecorderStatus>('idle')
  const elapsedMs = ref(0)
  const errorKey = ref<RecorderErrorKey | null>(null)
  /* The open mic, for live feedback while recording. Not wrapped in readonly():
   * Web Audio refuses a proxied MediaStream. */
  const liveStream = shallowRef<MediaStream | null>(null)

  const takeStore = useVoiceTakeStore()
  const wakeLock = useWakeLock()
  const bitDepth = useRecordingBitDepth()

  let audioContext: AudioContext | null = null
  let micSource: MediaStreamAudioSourceNode | null = null
  let captureNode: AudioWorkletNode | null = null
  let stream: MediaStream | null = null
  let collector: SampleCollector | null = null
  let startedAtMs = 0
  let hasAutoGain = false
  /* Read when the take starts, so the setting can't change one mid-take. */
  let takeBitDepth: WavBitDepth = bitDepth.value
  let isDisposed = false

  const clock = useIntervalFn(
    () => {
      elapsedMs.value = performance.now() - startedAtMs
      if (elapsedMs.value >= MAX_RECORDING_MS) requestStop('limit')
    },
    CLOCK_TICK_MS,
    { immediate: false },
  )

  function releaseResources() {
    clock.pause()
    void wakeLock.release().catch(() => {})
    if (captureNode) {
      captureNode.port.onmessage = null
      captureNode.disconnect()
    }
    micSource?.disconnect()
    if (audioContext) void audioContext.close().catch(() => {})
    if (stream) releaseMicStream(stream)

    audioContext = null
    micSource = null
    captureNode = null
    stream = null
    collector = null
    liveStream.value = null
  }

  /*
   * Finishes at once: the samples are already here, so unlike MediaRecorder
   * there is no stop event to wait for. The last few milliseconds still in
   * flight from the audio thread are dropped, inside the trimmed tail.
   */
  function requestStop(reason: RecordingStopReason) {
    if (status.value !== 'recording' || !collector || !audioContext) return

    elapsedMs.value = performance.now() - startedAtMs
    const samples = collector.join()
    const { sampleRate } = audioContext

    /* Before the take is set: iOS plays back at quiet call level until the mic
     * is released. */
    releaseResources()
    status.value = 'idle'

    if (samples.length === 0) {
      errorKey.value = 'voiceRecorder.emptyTake'

      return
    }

    takeStore.setTake({
      blob: encodeWav(
        trimSilence(samples, sampleRate),
        sampleRate,
        takeBitDepth,
      ),
      mimeType: 'audio/wav',
      recordedAt: new Date(),
      stopReason: reason,
      hasAutoGain,
    })
  }

  async function start() {
    if (status.value !== 'idle') return

    errorKey.value = null
    if (!isCaptureSupported()) {
      errorKey.value = 'voiceRecorder.notSupported'

      return
    }

    status.value = 'starting'

    /* Created before awaiting the mic, so iOS counts it as started by the tap
     * on Record and lets it run. */
    const context = new AudioContext()
    audioContext = context
    const processorReady = loadPcmCaptureProcessor(context).then(
      () => true,
      () => false,
    )

    try {
      stream = await acquireMicStream({ audio: RECORDING_CONSTRAINTS })
    } catch (error) {
      releaseResources()
      errorKey.value =
        error instanceof DOMException && error.name === 'NotAllowedError'
          ? 'errors.microphoneDenied'
          : 'errors.microphoneAccess'
      status.value = 'idle'

      return
    }

    /* Opening the mic can pause the context on iOS while its audio session
     * switches to recording. */
    const [isProcessorReady] = await Promise.all([
      processorReady,
      context.resume().catch(() => {}),
    ])

    /* Left the page while the permission prompt was open. */
    if (isDisposed) {
      releaseResources()

      return
    }

    if (!isProcessorReady) {
      releaseResources()
      errorKey.value = 'voiceRecorder.notSupported'
      status.value = 'idle'

      return
    }

    const [track] = stream.getAudioTracks()
    hasAutoGain = track?.getSettings().autoGainControl === true
    takeBitDepth = bitDepth.value

    const activeCollector = createSampleCollector(
      Math.round((context.sampleRate * MAX_RECORDING_MS) / 1000),
    )
    collector = activeCollector
    micSource = context.createMediaStreamSource(stream)
    /* One explicit input channel: Web Audio mixes a stereo mic down to mono. */
    captureNode = new AudioWorkletNode(context, PCM_CAPTURE_PROCESSOR, {
      channelCount: 1,
      channelCountMode: 'explicit',
    })
    captureNode.port.onmessage = (event: MessageEvent<Float32Array>) => {
      if (!activeCollector.append(event.data)) requestStop('limit')
    }
    captureNode.addEventListener('processorerror', () =>
      requestStop('interrupted'),
    )
    micSource.connect(captureNode)
    /* Silent, but a node must lead to the destination to be sure it runs. */
    captureNode.connect(context.destination)

    /* A call, Siri or backgrounding on iOS silences or ends the track, or
     * suspends the context. Keep what was sung rather than recording a gap. */
    track?.addEventListener('ended', () => requestStop('interrupted'))
    track?.addEventListener('mute', () => requestStop('interrupted'))
    context.addEventListener('statechange', () => {
      if (context.state !== 'running') requestStop('interrupted')
    })

    startedAtMs = performance.now()
    elapsedMs.value = 0
    status.value = 'recording'
    liveStream.value = stream
    clock.resume()
    /* Long takes would otherwise end when the phone's screen sleeps. Best
     * effort: some browsers refuse, and recording still works. */
    void wakeLock.request('screen').catch(() => {})
  }

  function stop() {
    requestStop('user')
  }

  useEventListener(window, 'pagehide', () => requestStop('interrupted'))

  onScopeDispose(() => {
    isDisposed = true
    /* Leaving mid-take keeps what was sung. */
    requestStop('interrupted')
    releaseResources()
  })

  return {
    status: readonly(status),
    elapsedMs: readonly(elapsedMs),
    errorKey: readonly(errorKey),
    liveStream,
    start,
    stop,
  }
}
