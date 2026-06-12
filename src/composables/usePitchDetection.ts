import type { NoteInfo } from '@/utils/noteUtils'
import { frequencyToNote } from '@/utils/noteUtils'
import { acquireMicStream } from '@/utils/microphoneStream'
import { PitchDetector } from 'pitchy'

/*
 * Pitch clarity gate — autocorrelation confidence from the pitchy library.
 * Typical range is 0.8–0.95. The 0.90 default (raised from 0.85) rejects the
 * breath, note-decay and room-tone signals the detector otherwise reports with
 * just enough confidence — those caused a held note's tail to be mistaken for
 * a fast descending slide. Trade-off: very soft/breathy singing needs
 * marginally more support before it registers.
 *
 * The default is now a user-tunable global setting (see useSettings.ts).
 * Callers can still override per-instance via the `clarityThreshold` option —
 * e.g. SingFly passes a low SINGFLY_CLARITY_THRESHOLD (well under this
 * default) so soft/breathy singing still flies its tone→height bird, while
 * breath/room tone stays gated out and can't false-crash the round.
 */

type UsePitchDetectionOptions = {
  /* Minimum autocorrelation confidence to accept a frame's pitch. Below it the
   * frame reports no pitch (frequency/noteInfo null, isClean false). When
   * omitted, falls back to the global user setting (useSettings). */
  clarityThreshold?: number
  /* Override the onset debounce (ms a clean signal must hold before a pitch is
   * reported). Lower = snappier note re-onset for fast melodies, at the cost of
   * more attack-transient flicker. Defaults to ONSET_DEBOUNCE_MS. */
  onsetDebounceMs?: number
  /* Request a RAW mic stream — echo cancellation, noise suppression and auto
   * gain control OFF. The browser defaults (all on) actively degrade pitch
   * detection: noise suppression treats a sustained tone as background hiss and
   * gates it, AGC ducks steady notes, and echo cancellation erases any sound the
   * device itself is playing. Use for singing/pitch games where the input is a
   * held musical tone. Leave off for games that play reference tones through the
   * speaker while listening (they rely on echo cancellation + deaf windows). */
  rawAudio?: boolean
  /* The two clear wins for sung-tone detection (noise suppression + auto gain
   * control OFF) while KEEPING echo cancellation ON. For games that play
   * reference tones through the speaker while listening — softer/steadier notes
   * register, but the mic still rejects the device's own playback. Ignored when
   * `rawAudio` is set (rawAudio is the stronger, EC-off variant). */
  softRawAudio?: boolean
  /* Expected pitch band in Hz (e.g. the melody's range ± a semitone). Clean
   * frames OUTSIDE the band are still reported (frequency/noteInfo/isClean from
   * the raw pitch — the caller keeps full visual feedback) but bypass the EMA
   * smoothing, so a stray octave/harmonic misdetection can't drag the smoothed
   * pitch out of tolerance mid-note. Pass refs/getters when the band changes
   * between runs. Omit for no band (every clean frame is smoothed). */
  bandMinFrequency?: MaybeRefOrGetter<number>
  bandMaxFrequency?: MaybeRefOrGetter<number>
}

/* Practical singing range: ~B1 (60 Hz) to ~F#6 (1500 Hz), covering bass to soprano. */
const MIN_FREQUENCY = 60
const MAX_FREQUENCY = 1500

/* EMA weight — 0.3 blends 30% new pitch + 70% previous, smoothing jitter without lagging */
const SMOOTHING_FACTOR = 0.3
/* ms to hold a clean signal before reporting onset — avoids transient flicker on note attacks */
const ONSET_DEBOUNCE_MS = 40

export function usePitchDetection(options: UsePitchDetectionOptions = {}) {
  const { clarityThreshold: globalClarity } = useSettings()
  /* Precedence: explicit option arg → global user setting → default.
   * `??` (not `||`) so SingFly's explicit 0 still wins (0 is not nullish). */
  const clarityThreshold = computed(
    () => options.clarityThreshold ?? globalClarity.value,
  )
  const onsetDebounceMs = options.onsetDebounceMs ?? ONSET_DEBOUNCE_MS

  const { t } = useI18n()
  const frequency = ref<number | null>(null)
  const noteInfo = ref<NoteInfo | null>(null)
  const clarity = ref(0)
  const isListening = ref(false)
  const isClean = ref(false)
  const error = ref<string | null>(null)

  let audioContext: AudioContext | null = null
  let analyserNode: AnalyserNode | null = null
  let mediaStream: MediaStream | null = null
  let animationFrameId: number | null = null
  let smoothedFrequency: number | null = null
  // Tracks the last detected MIDI note to apply hysteresis in frequencyToNote
  let prevMidi: number | undefined = undefined
  let cleanSinceTimestamp: number | null = null
  let wasListeningBeforeHidden = false

  function handleVisibilityChange() {
    if (document.hidden) {
      if (isListening.value) {
        wasListeningBeforeHidden = true
        stop()
      }
    } else {
      if (wasListeningBeforeHidden) {
        wasListeningBeforeHidden = false
        start()
      }
    }
  }

  onMounted(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange)
  })

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  })

  function detectPitch(
    detector: PitchDetector<Float32Array<ArrayBuffer>>,
    input: Float32Array<ArrayBuffer>,
    sampleRate: number,
  ) {
    analyserNode!.getFloatTimeDomainData(input)
    const [pitch, detectedClarity] = detector.findPitch(input, sampleRate)

    clarity.value = Math.round(detectedClarity * 100) / 100 // round to 2 decimal places

    if (
      detectedClarity >= clarityThreshold.value &&
      pitch >= MIN_FREQUENCY &&
      pitch <= MAX_FREQUENCY
    ) {
      /* Out-of-band pitches (see bandMinFrequency docs) are reported raw and
       * skip the EMA entirely, so one harmonic glitch frame can't pollute the
       * smoothed in-band stream. */
      const isInBand =
        pitch >= toValue(options.bandMinFrequency ?? MIN_FREQUENCY) &&
        pitch <= toValue(options.bandMaxFrequency ?? MAX_FREQUENCY)

      let reportedFrequency = pitch
      if (isInBand) {
        smoothedFrequency =
          smoothedFrequency === null
            ? pitch
            : SMOOTHING_FACTOR * pitch +
              (1 - SMOOTHING_FACTOR) * smoothedFrequency
        reportedFrequency = smoothedFrequency
      }

      const now = performance.now()
      if (cleanSinceTimestamp === null) {
        cleanSinceTimestamp = now
      }

      if (now - cleanSinceTimestamp >= onsetDebounceMs) {
        frequency.value = Math.round(reportedFrequency * 10) / 10 // 0.1 Hz precision
        const detected = frequencyToNote(reportedFrequency, prevMidi)
        noteInfo.value = detected
        prevMidi = detected?.midiNote
        isClean.value = true
      }
    } else {
      cleanSinceTimestamp = null
      smoothedFrequency = null
      frequency.value = null
      noteInfo.value = null
      isClean.value = false
    }

    if (isListening.value) {
      animationFrameId = requestAnimationFrame(() =>
        detectPitch(detector, input, sampleRate),
      )
    }
  }

  /* rawAudio: EC+NS+AGC off (silent games — nothing plays while listening).
   * softRawAudio: NS+AGC off but EC kept on (games that play reference tones
   * while listening, so the mic still rejects their own playback). Default true
   * = browser defaults (all on). */
  function resolveAudioConstraints(): MediaStreamConstraints['audio'] {
    if (options.rawAudio) {
      return {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      }
    }

    if (options.softRawAudio) {
      return {
        echoCancellation: true,
        noiseSuppression: false,
        autoGainControl: false,
      }
    }

    return true
  }

  async function start() {
    if (isListening.value) return

    error.value = null

    try {
      mediaStream = await acquireMicStream({ audio: resolveAudioConstraints() })
      audioContext = new AudioContext()
      analyserNode = audioContext.createAnalyser()
      // 2048-sample FFT: ~23 ms window at 44.1 kHz — good pitch resolution with low latency
      analyserNode.fftSize = 2048

      const source = audioContext.createMediaStreamSource(mediaStream)
      source.connect(analyserNode)

      const detector = PitchDetector.forFloat32Array(analyserNode.fftSize)
      const input = new Float32Array(analyserNode.fftSize)

      isListening.value = true
      detectPitch(detector, input, audioContext.sampleRate)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t('errors.microphoneAccess')
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
      audioContext.close()
      audioContext = null
    }

    analyserNode = null
    smoothedFrequency = null
    cleanSinceTimestamp = null
    prevMidi = undefined
    frequency.value = null
    noteInfo.value = null
    clarity.value = 0
    isClean.value = false
  }

  return {
    frequency: readonly(frequency),
    noteInfo: readonly(noteInfo),
    clarity: readonly(clarity),
    isListening: readonly(isListening),
    isClean: readonly(isClean),
    error: readonly(error),
    start,
    stop,
  }
}
