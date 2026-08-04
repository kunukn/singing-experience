import type { NoteInfo } from '@/utils/noteUtils'
import {
  frequencyToNote,
  midiToFrequency,
  toAccidentalGlyph,
} from '@/utils/noteUtils'
import { acquireMicStream } from '@/utils/microphoneStream'
import { PitchDetector } from 'pitchy'
import {
  BAND_FILTER_STAGES,
  BAND_SILENCE_RMS,
  crossoverFrequency,
  isPitchInBand,
  rootMeanSquare,
  shouldShowHighLane,
} from './duetBandSplit'

/*
 * Two-singer pitch preview for the piano.
 *
 * One microphone stream and one AudioContext, fanned out to two band-filtered
 * analysers so a low voice and a high voice can be detected at once. Each band
 * gets its own monophonic detector; see duetBandSplit.ts for why the split is
 * needed and how the high band is gated against a solo singer's harmonics.
 *
 * Deliberately separate from usePitchDetection/useIdlePreview rather than an
 * option on them: those two are shared by ten other features, and this is the
 * only place that needs a second lane. The handful of duplicated constants
 * below are noted with usePitchDetection.ts as their source of truth.
 */

/* Mirrors usePitchDetection.ts — practical singing range, ~B1 to ~F#6. */
const MIN_FREQUENCY = 60
const MAX_FREQUENCY = 1500

/* Mirrors usePitchDetection.ts — EMA weight, 30% new pitch + 70% previous. */
const SMOOTHING_FACTOR = 0.3

/* Mirrors usePitchDetection.ts — ms a clean signal must hold before it counts,
 * so note attacks don't flicker. */
const ONSET_DEBOUNCE_MS = 40

/* Mirrors useIdlePreview.ts — suppress the preview this long after the piano
 * sounds a note, so its own tone isn't read back as a sung pitch. */
const DEAF_PERIOD_MS = 1000

/* Mirrors usePitchDetection.ts — ~23 ms window at 44.1 kHz. Unchanged from the
 * single-voice path, so latency is identical. */
const FFT_SIZE = 2048

export type DuetLane = {
  previewMidi: number | null
  previewFrequency: number | null
  previewNoteLabel: string | null
}

const EMPTY_LANE: DuetLane = {
  previewMidi: null,
  previewFrequency: null,
  previewNoteLabel: null,
}

type DuetPitchDetectionOptions = {
  isEnabled: Ref<boolean>
  midiMin: MaybeRefOrGetter<number>
  midiMax: MaybeRefOrGetter<number>
}

/* Per-band detector plus the smoothing/hysteresis state that has to persist
 * across frames. One of these per lane. */
type LaneTracker = {
  analyser: AnalyserNode
  detector: PitchDetector<Float32Array<ArrayBuffer>>
  buffer: Float32Array<ArrayBuffer>
  filters: BiquadFilterNode[]
  smoothedFrequency: number | null
  previousMidi: number | undefined
  cleanSinceTimestamp: number | null
}

type LaneReading = {
  frequency: number | null
  noteInfo: NoteInfo | null
  rms: number
}

export function useDuetPitchDetection(options: DuetPitchDetectionOptions) {
  const { isEnabled } = options

  const { t } = useI18n()
  const { clarityThreshold } = useSettings()
  const { state: micPermission, requestPermission } = useMicrophonePermission()

  const lowReading = ref<LaneReading | null>(null)
  const highReading = ref<LaneReading | null>(null)
  const isListening = ref(false)
  const error = ref<string | null>(null)

  const crossoverHz = computed(() =>
    crossoverFrequency(toValue(options.midiMin), toValue(options.midiMax)),
  )

  /*
   * Hard bounds from the selected voice range, a little wider than the keys.
   *
   * Fed two voices at once, an autocorrelation detector can lock onto their
   * COMMON subharmonic rather than either fundamental — C3 + E4 measured as C2,
   * a full octave below anything the user picked. Unlike the single-voice
   * preview (which deliberately shows out-of-range pitches pinned to the
   * keyboard edge), in duet mode a pitch outside the range is an artefact, so
   * it is dropped rather than drawn.
   *
   * Two semitones of slack keeps a singer who sits slightly flat or sharp of
   * the range ends.
   */
  const RANGE_SLACK_SEMITONES = 2
  const rangeMinHz = computed(() =>
    midiToFrequency(toValue(options.midiMin) - RANGE_SLACK_SEMITONES),
  )
  const rangeMaxHz = computed(() =>
    midiToFrequency(toValue(options.midiMax) + RANGE_SLACK_SEMITONES),
  )

  let audioContext: AudioContext | null = null
  let mediaStream: MediaStream | null = null
  let animationFrameId: number | null = null
  let lowTracker: LaneTracker | null = null
  let highTracker: LaneTracker | null = null
  let wasListeningBeforeHidden = false

  const isDeaf = ref(false)
  let deafTimer: ReturnType<typeof setTimeout> | null = null

  function triggerDeafPeriod() {
    if (deafTimer) clearTimeout(deafTimer)

    isDeaf.value = true
    deafTimer = setTimeout(() => {
      isDeaf.value = false
      deafTimer = null
    }, DEAF_PERIOD_MS)
  }

  /* A chain of identical biquads in series. One stage is -12 dB/oct, which
   * leaves far too much of the other voice in the band; BAND_FILTER_STAGES of
   * them multiply into a steep enough slope to actually separate an octave. */
  function buildFilterChain(
    context: AudioContext,
    type: BiquadFilterType,
    source: AudioNode,
    destination: AudioNode,
  ): BiquadFilterNode[] {
    const filters: BiquadFilterNode[] = []
    let previous: AudioNode = source

    for (let stage = 0; stage < BAND_FILTER_STAGES; stage++) {
      const filter = context.createBiquadFilter()
      filter.type = type
      filter.frequency.value = crossoverHz.value
      previous.connect(filter)
      previous = filter
      filters.push(filter)
    }

    previous.connect(destination)

    return filters
  }

  function createTracker(
    context: AudioContext,
    type: BiquadFilterType,
    source: AudioNode,
  ): LaneTracker {
    const analyser = context.createAnalyser()
    analyser.fftSize = FFT_SIZE

    return {
      analyser,
      detector: PitchDetector.forFloat32Array(FFT_SIZE),
      buffer: new Float32Array(FFT_SIZE),
      filters: buildFilterChain(context, type, source, analyser),
      smoothedFrequency: null,
      previousMidi: undefined,
      cleanSinceTimestamp: null,
    }
  }

  /* One frame for one band: the same smoothing, onset debounce and note
   * hysteresis usePitchDetection applies, plus the band's RMS so the high-lane
   * gate can compare loudness. */
  function readLane(
    tracker: LaneTracker,
    band: 'low' | 'high',
    sampleRate: number,
  ): LaneReading {
    tracker.analyser.getFloatTimeDomainData(tracker.buffer)
    const rms = rootMeanSquare(tracker.buffer)
    const [pitch, detectedClarity] = tracker.detector.findPitch(
      tracker.buffer,
      sampleRate,
    )

    const isUsable =
      detectedClarity >= clarityThreshold.value &&
      pitch >= MIN_FREQUENCY &&
      pitch <= MAX_FREQUENCY &&
      /* Nothing but room tone in this band. */
      rms >= BAND_SILENCE_RMS &&
      /* Outside the selected range — a common-subharmonic artefact of the two
       * voices rather than either of them. See rangeMinHz. */
      pitch >= rangeMinHz.value &&
      pitch <= rangeMaxHz.value &&
      /* A pitch from outside this band is the other voice bleeding through —
       * see isPitchInBand. Without this a solo singer draws two lines. */
      isPitchInBand(pitch, crossoverHz.value, band)

    if (!isUsable) {
      tracker.cleanSinceTimestamp = null
      tracker.smoothedFrequency = null

      return { frequency: null, noteInfo: null, rms }
    }

    tracker.smoothedFrequency =
      tracker.smoothedFrequency === null
        ? pitch
        : SMOOTHING_FACTOR * pitch +
          (1 - SMOOTHING_FACTOR) * tracker.smoothedFrequency

    const now = performance.now()
    if (tracker.cleanSinceTimestamp === null) {
      tracker.cleanSinceTimestamp = now
    }

    if (now - tracker.cleanSinceTimestamp < ONSET_DEBOUNCE_MS) {
      return { frequency: null, noteInfo: null, rms }
    }

    const reported = tracker.smoothedFrequency
    const noteInfo = frequencyToNote(reported, tracker.previousMidi)
    tracker.previousMidi = noteInfo?.midiNote

    return {
      frequency: Math.round(reported * 10) / 10, // 0.1 Hz precision
      noteInfo,
      rms,
    }
  }

  function tick(sampleRate: number) {
    if (!lowTracker || !highTracker) return

    const low = readLane(lowTracker, 'low', sampleRate)
    const high = readLane(highTracker, 'high', sampleRate)

    lowReading.value = low
    highReading.value = shouldShowHighLane({
      highHz: high.frequency,
      lowHz: low.frequency,
      highRms: high.rms,
      lowRms: low.rms,
    })
      ? high
      : { frequency: null, noteInfo: null, rms: high.rms }

    if (isListening.value) {
      animationFrameId = requestAnimationFrame(() => tick(sampleRate))
    }
  }

  async function start() {
    if (isListening.value) return

    error.value = null

    try {
      /* NS/AGC off so a held note registers, echo cancellation ON because the
       * piano plays tones through the speaker while this listens (the deaf
       * period covers the overlap). Matches softRawAudio in usePitchDetection. */
      mediaStream = await acquireMicStream({
        audio: {
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: false,
        },
      })

      audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(mediaStream)

      lowTracker = createTracker(audioContext, 'lowpass', source)
      highTracker = createTracker(audioContext, 'highpass', source)

      isListening.value = true
      tick(audioContext.sampleRate)
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

    lowTracker = null
    highTracker = null
    lowReading.value = null
    highReading.value = null
  }

  /* The crossover follows the selected voice range. Retuning the existing
   * biquads is enough — no reason to tear the graph down and reopen the mic. */
  watch(crossoverHz, (frequency) => {
    for (const tracker of [lowTracker, highTracker]) {
      tracker?.filters.forEach((filter) => {
        filter.frequency.value = frequency
      })
    }
  })

  function toLane(reading: LaneReading | null): DuetLane {
    if (isDeaf.value || !isEnabled.value) return EMPTY_LANE

    const midi = reading?.noteInfo?.midiNote ?? null
    if (midi === null || !reading) return EMPTY_LANE

    return {
      previewMidi: midi,
      previewFrequency: reading.frequency,
      previewNoteLabel: toAccidentalGlyph(
        `${reading.noteInfo!.note}${reading.noteInfo!.octave}`,
      ),
    }
  }

  const lowLane = computed(() => toLane(lowReading.value))
  const highLane = computed(() => toLane(highReading.value))

  const shouldListen = computed(
    () => isEnabled.value && micPermission.value === 'granted',
  )

  watch(
    shouldListen,
    async (active) => {
      if (active) {
        await start()
      } else {
        stop()
      }
    },
    { immediate: true },
  )

  /* Request microphone permission when the user toggles duet preview on. */
  watch(
    () => isEnabled.value,
    async (enabled) => {
      if (enabled && micPermission.value !== 'granted') {
        await requestPermission()
        if (micPermission.value === 'denied') {
          isEnabled.value = false
        }
      }
    },
  )

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
    stop()
    if (deafTimer) {
      clearTimeout(deafTimer)
      deafTimer = null
    }
  })

  return {
    lowLane,
    highLane,
    isListening: readonly(isListening),
    micPermission,
    triggerDeafPeriod,
    error: readonly(error),
  }
}
