import { useEventListener, useIntervalFn, useWakeLock } from '@vueuse/core'

import { acquireMicStream, releaseMicStream } from '@/utils/microphoneStream'

import { pickRecorderMimeType } from './recorderFormat'

/* A whole song, and the length phone analysis memory comfortably handles. */
export const MAX_RECORDING_MS = 5 * 60 * 1000
/* Voice stays clean at 128 kbps: about 0.96 MB a minute, 4.8 MB at the cap. */
const RECORDING_BITS_PER_SECOND = 128_000
/* Browsers treat the bitrate as a hint, so size gets its own limit. */
const MAX_RECORDING_BYTES = 8 * 1024 * 1024
/* Delivers bytes once a second so the size limit can be checked as we go. */
const RECORDER_TIMESLICE_MS = 1000
const CLOCK_TICK_MS = 200

/* Nothing plays while recording, so the voice can be captured unprocessed:
 * noise suppression treats a held tone as hiss and auto gain ducks it. */
const RECORDING_CONSTRAINTS: MediaTrackConstraints = {
  channelCount: 1,
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
}

export type RecorderStatus = 'idle' | 'starting' | 'recording' | 'stopping'
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

export function useVoiceRecorder() {
  const status = ref<RecorderStatus>('idle')
  const elapsedMs = ref(0)
  const errorKey = ref<RecorderErrorKey | null>(null)

  const takeStore = useVoiceTakeStore()
  const wakeLock = useWakeLock()

  let recorder: MediaRecorder | null = null
  let stream: MediaStream | null = null
  let chunks: Blob[] = []
  let recordedBytes = 0
  let startedAtMs = 0
  let stopReason: RecordingStopReason = 'user'
  let hasAutoGain = false
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
    if (stream) releaseMicStream(stream)

    stream = null
    recorder = null
  }

  function handleRecorderStop(finishedRecorder: MediaRecorder) {
    const mimeType = finishedRecorder.mimeType
    const blob = new Blob(chunks, { type: mimeType })

    chunks = []
    /* Only after the stop event: the last bytes are delivered just before it,
     * and iOS plays back at quiet call level until the mic is released. */
    releaseResources()
    status.value = 'idle'

    if (blob.size === 0) {
      errorKey.value = 'voiceRecorder.emptyTake'

      return
    }

    takeStore.setTake({
      blob,
      mimeType,
      recordedAt: new Date(),
      stopReason,
      hasAutoGain,
    })
  }

  function requestStop(reason: RecordingStopReason) {
    if (status.value !== 'recording' || !recorder) return

    status.value = 'stopping'
    stopReason = reason
    elapsedMs.value = performance.now() - startedAtMs
    clock.pause()

    /* Already inactive when every track ended; its stop event is on the way. */
    if (recorder.state !== 'inactive') recorder.stop()
  }

  async function start() {
    if (status.value !== 'idle') return

    errorKey.value = null
    if (typeof MediaRecorder === 'undefined') {
      errorKey.value = 'voiceRecorder.notSupported'

      return
    }

    status.value = 'starting'

    try {
      stream = await acquireMicStream({ audio: RECORDING_CONSTRAINTS })
    } catch (error) {
      errorKey.value =
        error instanceof DOMException && error.name === 'NotAllowedError'
          ? 'errors.microphoneDenied'
          : 'errors.microphoneAccess'
      status.value = 'idle'

      return
    }

    /* Left the page while the permission prompt was open. */
    if (isDisposed) {
      releaseResources()

      return
    }

    const mimeType = pickRecorderMimeType((candidate) =>
      MediaRecorder.isTypeSupported(candidate),
    )

    try {
      recorder = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        audioBitsPerSecond: RECORDING_BITS_PER_SECOND,
      })
    } catch {
      releaseResources()
      errorKey.value = 'voiceRecorder.notSupported'
      status.value = 'idle'

      return
    }

    const activeRecorder = recorder
    const [track] = stream.getAudioTracks()

    chunks = []
    recordedBytes = 0
    stopReason = 'user'
    hasAutoGain = track?.getSettings().autoGainControl === true

    activeRecorder.addEventListener('dataavailable', (event) => {
      if (event.data.size === 0) return

      chunks.push(event.data)
      recordedBytes += event.data.size
      if (recordedBytes >= MAX_RECORDING_BYTES) requestStop('limit')
    })
    activeRecorder.addEventListener('stop', () =>
      handleRecorderStop(activeRecorder),
    )
    activeRecorder.addEventListener('error', () => requestStop('interrupted'))

    /* A call, Siri or backgrounding on iOS silences or ends the track. Keep what
     * was sung rather than carrying on recording silence. */
    track?.addEventListener('ended', () => requestStop('interrupted'))
    track?.addEventListener('mute', () => requestStop('interrupted'))

    activeRecorder.start(RECORDER_TIMESLICE_MS)
    startedAtMs = performance.now()
    elapsedMs.value = 0
    status.value = 'recording'
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
    /* Leaving mid-take keeps what was sung: the stop event still fires after
     * this page is gone, saves the take and releases the mic. */
    if (recorder) {
      requestStop('interrupted')

      return
    }

    releaseResources()
  })

  return {
    status: readonly(status),
    elapsedMs: readonly(elapsedMs),
    errorKey: readonly(errorKey),
    start,
    stop,
  }
}
