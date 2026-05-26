import { useDoReMiPlaySequence } from '@/components/do-re-mi/useDoReMiPlaySequence'
import { DEFAULT_RANGE_INDEX, VOICE_RANGES } from '@/constants/voiceRanges'
import type { NoteInfo } from '@/utils/noteUtils'
import {
  frequencyToCents,
  midiToFrequency,
  midiToNoteLabel,
} from '@/utils/noteUtils'

/* Indices into VOICE_RANGES shown in the warm-up voice selector.
 * Excludes `voiceRanges.full` — too wide for a focused transposition start. */
export const WARM_UP_VOICE_RANGE_INDICES: readonly number[] = VOICE_RANGES.map(
  (range, index) => ({ range, index }),
)
  .filter(({ range }) => range.labelKey !== 'voiceRanges.full')
  .map(({ index }) => index)

export const SEQUENCE_COUNT_OPTIONS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,
] as const
export const HOLD_DURATION_OPTIONS = [
  0.05, 0.1, 0.2, 0.3, 0.5, 0.75, 1, 2, 3,
] as const
export const SEMITONE_STEP_OPTIONS = [1, 2, 3, 4, 5] as const

export const DEFAULT_HOLD_DURATION_MS = 50
export const DEFAULT_SEQUENCE_COUNT = 3
export const DEFAULT_SEMITONE_STEP = 1

export type WarmUpPatternId =
  | 'fiveNoteMajor'
  | 'threeNoteMajor'
  | 'majorTriad'
  | 'descendingFiveNote'
  | 'fiveNoteMinor'
  | 'octaveArpeggio'
  | 'octaveLeap'
  | 'fullOctaveScale'
  | 'majorNinthArpeggio'
  | 'bouncyBall'
  | 'pogoStick'
  | 'trampoline'
  | 'frogHops'
  | 'zigZag'
  | 'crisscross'
  | 'echo'
  | 'questionAnswer'
  | 'cuckoo'
  | 'mouseElephant'
  | 'yodel'
  | 'rollerCoaster'
  | 'rocketShip'
  | 'slideDown'

export type WarmUpPatternGroup = 'basic' | 'playful' | 'advanced'

/* Canonical vocal warm-up phrases expressed as semitone offsets from the
 * transposition root. Each phrase is played, then transposed up by
 * `semitoneStep` and replayed `sequenceCount` times. */
export const WARM_UP_PATTERNS: ReadonlyArray<{
  id: WarmUpPatternId
  group: WarmUpPatternGroup
  intervals: readonly number[]
}> = [
  {
    id: 'fiveNoteMajor',
    group: 'basic',
    intervals: [0, 2, 4, 5, 7, 5, 4, 2, 0],
  },
  { id: 'threeNoteMajor', group: 'basic', intervals: [0, 2, 4, 2, 0] },
  { id: 'majorTriad', group: 'basic', intervals: [0, 4, 7, 4, 0] },
  { id: 'descendingFiveNote', group: 'basic', intervals: [7, 5, 4, 2, 0] },
  {
    id: 'fiveNoteMinor',
    group: 'basic',
    intervals: [0, 2, 3, 5, 7, 5, 3, 2, 0],
  },
  {
    id: 'octaveArpeggio',
    group: 'advanced',
    intervals: [0, 4, 7, 12, 7, 4, 0],
  },
  { id: 'octaveLeap', group: 'advanced', intervals: [0, 12, 0] },
  {
    id: 'fullOctaveScale',
    group: 'advanced',
    intervals: [0, 2, 4, 5, 7, 9, 11, 12, 11, 9, 7, 5, 4, 2, 0],
  },
  {
    id: 'majorNinthArpeggio',
    group: 'advanced',
    intervals: [0, 4, 7, 12, 14, 12, 7, 4, 0],
  },
  { id: 'bouncyBall', group: 'playful', intervals: [0, 4, 0, 7, 0, 12, 0] },
  { id: 'pogoStick', group: 'playful', intervals: [0, 7, 0, 7, 0, 12] },
  {
    id: 'trampoline',
    group: 'playful',
    intervals: [0, 12, 7, 12, 4, 12, 0],
  },
  { id: 'frogHops', group: 'playful', intervals: [0, 7, 4, 11, 7, 12] },
  { id: 'zigZag', group: 'playful', intervals: [0, 4, 2, 5, 4, 7] },
  {
    id: 'crisscross',
    group: 'playful',
    intervals: [0, 7, 2, 9, 4, 11, 5, 12],
  },
  { id: 'echo', group: 'playful', intervals: [7, 4, 0, 7, 4, 0] },
  {
    id: 'questionAnswer',
    group: 'playful',
    intervals: [0, 4, 7, 4, 7, 4, 0, 4],
  },
  { id: 'cuckoo', group: 'playful', intervals: [7, 4, 7, 4, 0] },
  {
    id: 'mouseElephant',
    group: 'playful',
    intervals: [0, 2, 0, 12, 11, 12],
  },
  { id: 'yodel', group: 'playful', intervals: [0, 12, 4, 12, 7, 12] },
  {
    id: 'rollerCoaster',
    group: 'playful',
    intervals: [0, 4, 7, 12, 11, 7, 4, 0],
  },
  { id: 'rocketShip', group: 'playful', intervals: [0, 2, 4, 7, 12, 19] },
  { id: 'slideDown', group: 'playful', intervals: [12, 9, 5, 2, 0] },
]

export const DEFAULT_PATTERN: WarmUpPatternId = 'fiveNoteMajor'

/* Scale-degree shorthand shown in the collapsed Pattern select trigger.
 * Language-neutral — kept in code, not locales. */
export const PATTERN_SHORT_LABELS: Record<WarmUpPatternId, string> = {
  fiveNoteMajor: '1-2-3-4-5-4-3-2-1',
  threeNoteMajor: '1-2-3-2-1',
  majorTriad: '1-3-5-3-1',
  descendingFiveNote: '5-4-3-2-1',
  fiveNoteMinor: '1-2-♭3-4-5-4-♭3-2-1',
  octaveArpeggio: '1-3-5-8-5-3-1',
  octaveLeap: '1-8-1',
  fullOctaveScale: '1-2-3-4-5-6-7-8-7-6-5-4-3-2-1',
  majorNinthArpeggio: '1-3-5-8-9-8-5-3-1',
  bouncyBall: '1-3-1-5-1-8-1',
  pogoStick: '1-5-1-5-1-8',
  trampoline: '1-8-5-8-3-8-1',
  frogHops: '1-5-3-7-5-8',
  zigZag: '1-3-2-4-3-5',
  crisscross: '1-5-2-6-3-7-4-8',
  echo: '5-3-1-5-3-1',
  questionAnswer: '1-3-5-3-5-3-1-3',
  cuckoo: '5-3-5-3-1',
  mouseElephant: '1-2-1-8-7-8',
  yodel: '1-8-3-8-5-8',
  rollerCoaster: '1-3-5-8-7-5-3-1',
  rocketShip: '1-2-3-5-8-12',
  slideDown: '8-6-4-2-1',
}

/* ±50 cents — same beginner-friendly threshold used by useDoReMiGame. */
const MAX_CENTS_DEVIATION = 50
/* Brief pitch-loss tolerance before resetting the hold timer (lets singers wobble). */
const GRACE_PERIOD_MS = 250
/* Pause between a successful phrase and the next reference playback, ms. */
const PHRASE_TRANSITION_MS = 400
/* Delay before the first reference playback after pressing Play, ms.
 * Gives the user a brief moment to settle before the sequence begins. */
const START_DELAY_MS = 200
/* How long to ignore mic input after the reference playback ends, so the
 * speaker tail (or synth release) isn't mistaken for the singer's voice. */
const DEAF_PERIOD_MS = 1000

export type WarmUpPhase =
  | 'idle'
  | 'playingReference'
  | 'listening'
  | 'transitioning'
  | 'complete'

type PitchDetectionProvider = {
  frequency: Readonly<Ref<number | null>>
  noteInfo: Readonly<Ref<NoteInfo | null>>
  isListening: Readonly<Ref<boolean>>
  isClean: Readonly<Ref<boolean>>
  error: Readonly<Ref<string | null>>
  start: () => void | Promise<void>
  stop: () => void
}

export type WarmUpGameOptions = {
  holdDurationMs?: number
  pitchDetection?: PitchDetectionProvider
}

export type WarmUpGameResult = ReturnType<typeof useWarmUpGame>

export function useWarmUpGame(options: WarmUpGameOptions = {}) {
  const holdDurationMs = ref(options.holdDurationMs ?? DEFAULT_HOLD_DURATION_MS)
  const rangeIndex = ref<number>(DEFAULT_RANGE_INDEX)
  const sequenceCount = ref<number>(DEFAULT_SEQUENCE_COUNT)
  const semitoneStep = ref<number>(DEFAULT_SEMITONE_STEP)
  const patternId = ref<WarmUpPatternId>(DEFAULT_PATTERN)

  const currentIntervals = computed<readonly number[]>(
    () =>
      WARM_UP_PATTERNS.find((p) => p.id === patternId.value)?.intervals ??
      WARM_UP_PATTERNS[0].intervals,
  )

  const patternTopInterval = computed(() => Math.max(...currentIntervals.value))
  const patternBottomInterval = computed(() =>
    Math.min(...currentIntervals.value),
  )

  const phase = ref<WarmUpPhase>('idle')
  const currentTranspositionIndex = ref(0)
  const currentNoteIndex = ref(0)
  const holdTimeMs = ref(0)
  const graceTimeMs = ref(0)
  const elapsedMs = ref(0)
  const isComplete = ref(false)
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

  const {
    noteInfo,
    isClean,
    isListening,
    error,
    frequency,
    start: startDetection,
    stop: stopDetection,
  } = options.pitchDetection ?? usePitchDetection()

  const { isPlayingSequence, currentPlayingIndex, playSequence, stopSequence } =
    useDoReMiPlaySequence()

  const startMidi = computed(
    () => VOICE_RANGES[rangeIndex.value]?.midiMin ?? 48,
  )

  const phraseNotesMidi = computed<number[]>(() =>
    currentIntervals.value.map(
      (interval) =>
        startMidi.value +
        currentTranspositionIndex.value * semitoneStep.value +
        interval,
    ),
  )

  /* Unique sorted MIDI values from the current phrase — used by WarmUpChart
   * so the chart only labels the notes the singer will actually sing. */
  const phraseGridMidis = computed(() =>
    Array.from(new Set(phraseNotesMidi.value)).sort((a, b) => a - b),
  )

  const targetMidi = computed<number | null>(() => {
    const notes = phraseNotesMidi.value
    if (currentNoteIndex.value >= notes.length) return null

    return notes[currentNoteIndex.value]
  })

  const targetFrequency = computed<number | null>(() =>
    targetMidi.value === null ? null : midiToFrequency(targetMidi.value),
  )

  const targetNoteLabel = computed<string | null>(() =>
    targetMidi.value === null ? null : midiToNoteLabel(targetMidi.value).label,
  )

  const startToneLabel = computed(() => midiToNoteLabel(startMidi.value).label)

  const midiMin = computed(
    () =>
      startMidi.value +
      currentTranspositionIndex.value * semitoneStep.value +
      patternBottomInterval.value,
  )

  const midiMax = computed(
    () =>
      startMidi.value +
      currentTranspositionIndex.value * semitoneStep.value +
      patternTopInterval.value,
  )

  const centsFromTarget = computed(() => {
    if (!frequency.value || !isClean.value || targetFrequency.value === null)
      return null

    return frequencyToCents(frequency.value, targetFrequency.value)
  })

  const isSingingCorrectNote = computed(() => {
    if (isDeaf.value) return false
    if (!noteInfo.value || !isClean.value) return false
    if (targetMidi.value === null) return false
    if (centsFromTarget.value === null) return false

    return (
      noteInfo.value.midiNote === targetMidi.value &&
      Math.abs(centsFromTarget.value) <= MAX_CENTS_DEVIATION
    )
  })

  const holdProgress = computed(() =>
    Math.min(holdTimeMs.value / holdDurationMs.value, 1),
  )

  let lastTimestamp: number | null = null
  let timerFrameId: number | null = null
  let transitionTimeoutId: number | null = null
  let startDelayTimeoutId: number | null = null

  function tickTimer(timestamp: number) {
    if (lastTimestamp !== null) {
      const delta = timestamp - lastTimestamp

      if (phase.value !== 'complete' && phase.value !== 'idle') {
        elapsedMs.value += delta
      }

      if (phase.value === 'listening') {
        if (isSingingCorrectNote.value) {
          graceTimeMs.value = 0
          holdTimeMs.value += delta
        } else {
          graceTimeMs.value += delta

          if (graceTimeMs.value >= GRACE_PERIOD_MS) {
            holdTimeMs.value = 0
          }
        }

        if (holdTimeMs.value >= holdDurationMs.value) {
          advanceNote()
        }
      }
    }

    lastTimestamp = timestamp

    if (phase.value !== 'idle' && phase.value !== 'complete') {
      timerFrameId = requestAnimationFrame(tickTimer)
    }
  }

  function advanceNote() {
    holdTimeMs.value = 0
    graceTimeMs.value = 0

    if (currentNoteIndex.value < currentIntervals.value.length - 1) {
      currentNoteIndex.value++

      return
    }

    /* Phrase complete — either move to next transposition or finish. */
    if (currentTranspositionIndex.value < sequenceCount.value - 1) {
      phase.value = 'transitioning'

      transitionTimeoutId = window.setTimeout(() => {
        currentTranspositionIndex.value++
        currentNoteIndex.value = 0
        playReferenceForCurrentPhrase()
      }, PHRASE_TRANSITION_MS)
    } else {
      finish()
    }
  }

  function playReferenceForCurrentPhrase() {
    phase.value = 'playingReference'

    const steps = phraseNotesMidi.value.map((midi) => {
      const { note, octave } = midiToNoteLabel(midi)

      return { solfege: '', note, octave }
    })

    playSequence(steps)
  }

  function startTimer() {
    lastTimestamp = null

    if (timerFrameId !== null) cancelAnimationFrame(timerFrameId)

    timerFrameId = requestAnimationFrame(tickTimer)
  }

  function stopTimer() {
    if (timerFrameId !== null) {
      cancelAnimationFrame(timerFrameId)
      timerFrameId = null
    }
    lastTimestamp = null
  }

  function clearTransitionTimeout() {
    if (transitionTimeoutId !== null) {
      clearTimeout(transitionTimeoutId)
      transitionTimeoutId = null
    }
  }

  function clearStartDelayTimeout() {
    if (startDelayTimeoutId !== null) {
      clearTimeout(startDelayTimeoutId)
      startDelayTimeoutId = null
    }
  }

  function finish() {
    isComplete.value = true
    phase.value = 'complete'
    clearStartDelayTimeout()
    stopSequence()
    stopDetection()
    stopTimer()
  }

  async function start() {
    if (phase.value !== 'idle') return

    currentTranspositionIndex.value = 0
    currentNoteIndex.value = 0
    holdTimeMs.value = 0
    graceTimeMs.value = 0
    elapsedMs.value = 0
    isComplete.value = false

    await startDetection()
    startTimer()

    /* Flip phase immediately so the UI swaps to the playing state without
     * waiting for the audio delay. */
    phase.value = 'playingReference'

    startDelayTimeoutId = window.setTimeout(() => {
      startDelayTimeoutId = null
      playReferenceForCurrentPhrase()
    }, START_DELAY_MS)
  }

  function stop() {
    clearStartDelayTimeout()
    clearTransitionTimeout()
    stopTimer()
    stopSequence()
    stopDetection()

    if (deafTimer) {
      clearTimeout(deafTimer)
      deafTimer = null
    }
    isDeaf.value = false

    phase.value = 'idle'
    currentTranspositionIndex.value = 0
    currentNoteIndex.value = 0
    holdTimeMs.value = 0
    graceTimeMs.value = 0
    elapsedMs.value = 0
    isComplete.value = false
  }

  function reset() {
    stop()
  }

  /* Once the reference melody finishes, hand off to listening. */
  watch(isPlayingSequence, (playing, wasPlaying) => {
    if (wasPlaying && !playing && phase.value === 'playingReference') {
      phase.value = 'listening'
      holdTimeMs.value = 0
      graceTimeMs.value = 0
      triggerDeafPeriod()
    }
  })

  function setHoldDuration(ms: number) {
    holdDurationMs.value = ms
  }

  function setRangeIndex(index: number) {
    rangeIndex.value = index
    stop()
  }

  function setSequenceCount(count: number) {
    sequenceCount.value = count
    stop()
  }

  function setSemitoneStep(step: number) {
    semitoneStep.value = step
    stop()
  }

  function setPattern(id: WarmUpPatternId) {
    patternId.value = id
    stop()
  }

  if (getCurrentInstance()) {
    onUnmounted(() => stop())
  }

  return {
    phase: readonly(phase),
    rangeIndex: readonly(rangeIndex),
    sequenceCount: readonly(sequenceCount),
    semitoneStep: readonly(semitoneStep),
    patternId: readonly(patternId),
    holdDurationMs: readonly(holdDurationMs),
    currentTranspositionIndex: readonly(currentTranspositionIndex),
    currentNoteIndex: readonly(currentNoteIndex),
    phraseNotesMidi,
    phraseGridMidis,
    targetMidi,
    targetFrequency,
    targetNoteLabel,
    startMidi,
    startToneLabel,
    midiMin,
    midiMax,
    isDeaf: readonly(isDeaf),
    triggerDeafPeriod,
    currentFrequency: frequency,
    noteInfo,
    isClean,
    centsFromTarget,
    holdProgress,
    elapsedMs: readonly(elapsedMs),
    isComplete: readonly(isComplete),
    isPlayingSequence,
    currentPlayingIndex,
    isSingingCorrectNote,
    isListening,
    error,
    start,
    stop,
    reset,
    setHoldDuration,
    setRangeIndex,
    setSequenceCount,
    setSemitoneStep,
    setPattern,
  }
}
