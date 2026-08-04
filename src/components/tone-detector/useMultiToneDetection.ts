import type { DetectedTone } from '@/components/tone-detector/toneDetectionTypes'
import { frequencyToNote } from '@/utils/noteUtils'
import { acquireMicStream } from '@/utils/microphoneStream'
import {
  MAX_TONES,
  estimateNoiseFloorDb,
  findPeaks,
  noiseGateToFloorDb,
  sensitivityToAdaptiveRange,
  sieveFundamentals,
} from './toneDetection'
import { updateToneTracks, type ToneTrack } from './toneTracking'

/* ms to hold a tone before reporting onset — avoids transient flicker on brief sounds */
const ONSET_DEBOUNCE_MS = 40

/* ms a tone must be gone before its card is dropped. A sustained note dips
 * under the peak threshold for the odd frame; without a release window the card
 * vanishes and then has to re-earn ONSET_DEBOUNCE_MS, which reads as flicker. */
const RELEASE_DEBOUNCE_MS = 120

/* ±30 cents — only report a note when the frequency is within ~1.7% of perfect pitch */
const MAX_CENTS_DEVIATION = 30

type ToneDetectionConfig = {
  sensitivity: Readonly<Ref<number>>
  noiseGate: Readonly<Ref<number>>
}

export function useMultiToneDetection(config?: ToneDetectionConfig) {
  const { t } = useI18n()
  const sensitivity = config?.sensitivity ?? ref(5)
  const noiseGate = config?.noiseGate ?? ref(5)

  const detectedTones = ref<DetectedTone[]>([])
  const isListening = ref(false)
  const error = ref<string | null>(null)

  let audioContext: AudioContext | null = null
  let analyserNode: AnalyserNode | null = null
  let mediaStream: MediaStream | null = null
  let animationFrameId: number | null = null
  let tracks: ToneTrack[] = []
  let wasListeningBeforeHidden = false

  /* Float32Array<ArrayBuffer>, not plain Float32Array: getFloatFrequencyData
   * rejects the ArrayBufferLike-widened form. */
  function detect(
    spectrum: Float32Array<ArrayBuffer>,
    sampleRate: number,
    fftSize: number,
  ) {
    const rawPeaks = findPeaks(
      spectrum,
      sampleRate,
      fftSize,
      noiseGateToFloorDb(noiseGate.value),
      sensitivityToAdaptiveRange(sensitivity.value),
    )

    const binWidth = sampleRate / fftSize
    const fundamentals = sieveFundamentals(
      rawPeaks,
      binWidth,
      MAX_TONES,
      estimateNoiseFloorDb(spectrum, sampleRate, fftSize),
    )

    const now = performance.now()

    /* Match this frame's fundamentals onto the running tracks and smooth them,
     * so a note with vibrato keeps one identity instead of flickering between
     * neighbouring semitones. */
    tracks = updateToneTracks(
      tracks,
      fundamentals.map((peak) => peak.frequency),
      now,
    ).filter((track) => now - track.lastSeenAt <= RELEASE_DEBOUNCE_MS)

    const tones: DetectedTone[] = []
    const seenMidi = new Set<number>()

    for (const track of tracks) {
      /* Named from the smoothed frequency, with the track's own previous note
       * as the hysteresis reference. */
      const info = frequencyToNote(track.smoothedFrequency, track.previousMidi)
      if (!info) continue

      track.previousMidi = info.midiNote

      if (now - track.firstSeenAt < ONSET_DEBOUNCE_MS) continue
      /* Two tracks can smooth onto the same note — keep the first. */
      if (seenMidi.has(info.midiNote)) continue

      seenMidi.add(info.midiNote)
      tones.push({
        ...info,
        isClean: Math.abs(info.cents) <= MAX_CENTS_DEVIATION,
      })
    }

    /* Sorted by MIDI note ascending (low to high). */
    detectedTones.value = tones.sort((a, b) => a.midiNote - b.midiNote)

    if (isListening.value) {
      animationFrameId = requestAnimationFrame(() =>
        detectLoop(spectrum, sampleRate, fftSize),
      )
    }
  }

  function detectLoop(
    spectrum: Float32Array<ArrayBuffer>,
    sampleRate: number,
    fftSize: number,
  ) {
    analyserNode!.getFloatFrequencyData(spectrum)
    detect(spectrum, sampleRate, fftSize)
  }

  async function start() {
    if (isListening.value) return

    error.value = null

    try {
      mediaStream = await acquireMicStream({ audio: true })
      audioContext = new AudioContext()
      analyserNode = audioContext.createAnalyser()
      // 4096-sample FFT: higher resolution than pitch detection to separate close tones
      analyserNode.fftSize = 4096
      // Light temporal smoothing (0.2) — reduces flicker while keeping transient response
      analyserNode.smoothingTimeConstant = 0.2

      const source = audioContext.createMediaStreamSource(mediaStream)
      source.connect(analyserNode)

      const spectrum = new Float32Array(analyserNode.frequencyBinCount)

      isListening.value = true
      detectLoop(spectrum, audioContext.sampleRate, analyserNode.fftSize)
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : t('errors.microphoneAccess')
      error.value = message
      useErrorToastStore().addError(message)
      isListening.value = false
    }
  }

  function stop() {
    isListening.value = false

    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }

    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop())
      mediaStream = null
    }

    if (audioContext) {
      void audioContext.close()
      audioContext = null
    }

    analyserNode = null
    tracks = []
    detectedTones.value = []
  }

  /* Release the microphone while the tab is in the background, matching every
   * other detector in the app (see usePitchDetection.ts). */
  function handleVisibilityChange() {
    if (document.hidden) {
      if (isListening.value) {
        wasListeningBeforeHidden = true
        stop()
      }
    } else if (wasListeningBeforeHidden) {
      wasListeningBeforeHidden = false
      void start()
    }
  }

  onMounted(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange)
  })

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  })

  return {
    detectedTones: readonly(detectedTones),
    isListening: readonly(isListening),
    error: readonly(error),
    start,
    stop,
  }
}
