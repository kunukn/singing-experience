import type { NoteInfo, NoteName, ScaleMode } from '@/utils/noteUtils'
import {
  buildScale,
  C3_MIDI,
  noteToFrequency,
  SCALE_MODE_OPTIONS,
  START_TONE_OPTIONS,
} from '@/utils/noteUtils'

type ScaleStep = {
  solfege: string
  note: NoteName
  octave: number
}

type PitchDetectionProvider = {
  frequency: Readonly<Ref<number | null>>
  noteInfo: Readonly<Ref<NoteInfo | null>>
  isListening: Readonly<Ref<boolean>>
  isClean: Readonly<Ref<boolean>>
  error: Readonly<Ref<string | null>>
  start: () => void | Promise<void>
  stop: () => void
}

const DEFAULT_HOLD_DURATION_MS = 2000
const GRACE_PERIOD_MS = 250
const DEFAULT_STARTING_SEMITONE_OFFSET = 7 // G3
const DEFAULT_SCALE_MODE: ScaleMode = 'ionian'

/*
 * Maximum cents deviation from the target note to count as "correct."
 * ±50 cents is the standard threshold in beginner/educational singing apps
 * (e.g. Yousician, Smule). Tighten to ±25 or ±10 for advanced difficulty.
 */
const MAX_CENTS_DEVIATION = 50
const TOO_LOW_OR_HIGH_HINT_MS = 800

type DoReMiGameOptions = {
  holdDurationMs?: number
  pitchDetection?: PitchDetectionProvider
}

export {
  DEFAULT_HOLD_DURATION_MS,
  DEFAULT_SCALE_MODE,
  DEFAULT_STARTING_SEMITONE_OFFSET,
  GRACE_PERIOD_MS,
  MAX_CENTS_DEVIATION,
  SCALE_MODE_OPTIONS,
  START_TONE_OPTIONS,
  TOO_LOW_OR_HIGH_HINT_MS,
}
export type { DoReMiGameOptions, PitchDetectionProvider, ScaleStep }

export function useDoReMiGame(options: DoReMiGameOptions = {}) {
  const holdDurationMs = ref(options.holdDurationMs ?? DEFAULT_HOLD_DURATION_MS)
  const startingSemitoneOffset = ref(DEFAULT_STARTING_SEMITONE_OFFSET)
  const scaleMode = ref<ScaleMode>(DEFAULT_SCALE_MODE)

  const scaleSteps = computed<ScaleStep[]>(() =>
    buildScale(C3_MIDI + startingSemitoneOffset.value, scaleMode.value),
  )
  const {
    noteInfo,
    isClean,
    isListening,
    error,
    frequency,
    start: startDetection,
    stop: stopDetection,
  } = options.pitchDetection ?? usePitchDetection()

  const currentStepIndex = ref(0)
  const holdTimeMs = ref(0)
  const graceTimeMs = ref(0)
  const elapsedMs = ref(0)
  const isComplete = ref(false)
  const isStarted = ref(false)
  const tooLowMs = ref(0)
  const tooHighMs = ref(0)

  let lastTimestamp: number | null = null
  let timerFrameId: number | null = null

  const targetStep = computed<ScaleStep>(
    () => scaleSteps.value[currentStepIndex.value],
  )

  const targetFrequency = computed(() =>
    noteToFrequency(targetStep.value.note, targetStep.value.octave),
  )

  const centsFromTarget = computed(() => {
    if (!frequency.value || !isClean.value) return null

    return Math.round(1200 * Math.log2(frequency.value / targetFrequency.value))
  })

  const holdProgress = computed(() =>
    Math.min(holdTimeMs.value / holdDurationMs.value, 1),
  )

  const isSingingCorrectNote = computed(() => {
    if (!noteInfo.value || !isClean.value) return false
    if (centsFromTarget.value === null) return false

    const target = targetStep.value

    return (
      noteInfo.value.note === target.note &&
      noteInfo.value.octave === target.octave &&
      Math.abs(centsFromTarget.value) <= MAX_CENTS_DEVIATION
    )
  })

  function tickTimer(timestamp: number) {
    if (lastTimestamp !== null) {
      const delta = timestamp - lastTimestamp
      elapsedMs.value += delta

      if (isSingingCorrectNote.value) {
        graceTimeMs.value = 0
        holdTimeMs.value += delta
        tooLowMs.value = 0
        tooHighMs.value = 0
      } else {
        graceTimeMs.value += delta

        if (graceTimeMs.value >= GRACE_PERIOD_MS) {
          holdTimeMs.value = 0
        }

        const cents = centsFromTarget.value
        if (cents !== null && cents < -MAX_CENTS_DEVIATION) {
          tooLowMs.value += delta
          tooHighMs.value = 0
        } else if (cents !== null && cents > MAX_CENTS_DEVIATION) {
          tooHighMs.value += delta
          tooLowMs.value = 0
        } else {
          tooLowMs.value = 0
          tooHighMs.value = 0
        }
      }

      if (holdTimeMs.value >= holdDurationMs.value) {
        advanceStep()
      }
    }

    lastTimestamp = timestamp

    if (!isComplete.value && isListening.value) {
      timerFrameId = requestAnimationFrame(tickTimer)
    }
  }

  function advanceStep() {
    holdTimeMs.value = 0
    graceTimeMs.value = 0
    tooLowMs.value = 0
    tooHighMs.value = 0
    lastTimestamp = null

    if (currentStepIndex.value < scaleSteps.value.length - 1) {
      currentStepIndex.value++
    } else {
      isComplete.value = true
      stopTimer()
    }
  }

  function startTimer() {
    lastTimestamp = null
    timerFrameId = requestAnimationFrame(tickTimer)
  }

  function stopTimer() {
    if (timerFrameId !== null) {
      cancelAnimationFrame(timerFrameId)
      timerFrameId = null
    }
    lastTimestamp = null
  }

  async function start() {
    isStarted.value = true
    await startDetection()
    startTimer()
  }

  function stop() {
    stopTimer()
    stopDetection()
    isStarted.value = false
    currentStepIndex.value = 0
    holdTimeMs.value = 0
    graceTimeMs.value = 0
    tooLowMs.value = 0
    tooHighMs.value = 0
    elapsedMs.value = 0
    isComplete.value = false
  }

  function reset() {
    stop()
  }

  function completeGame() {
    stopTimer()
    stopDetection()
    isComplete.value = true
  }

  watch(isListening, (listening) => {
    if (!listening) {
      stopTimer()
    }
  })

  if (getCurrentInstance()) {
    onUnmounted(() => stop())
  }

  function setHoldDuration(ms: number) {
    holdDurationMs.value = ms
  }

  function setStartingSemitoneOffset(offset: number) {
    startingSemitoneOffset.value = offset
    stop()
  }

  function setScaleMode(mode: ScaleMode) {
    scaleMode.value = mode
    stop()
  }

  return {
    scaleSteps,
    startingSemitoneOffset: readonly(startingSemitoneOffset),
    scaleMode: readonly(scaleMode),
    currentStepIndex: readonly(currentStepIndex),
    targetStep,
    targetFrequency,
    currentFrequency: frequency,
    centsFromTarget,
    holdProgress,
    holdDurationMs: readonly(holdDurationMs),
    holdTimeMs: readonly(holdTimeMs),
    tooLowMs: readonly(tooLowMs),
    tooHighMs: readonly(tooHighMs),
    elapsedMs: readonly(elapsedMs),
    isComplete: readonly(isComplete),
    isStarted: readonly(isStarted),
    isSingingCorrectNote,
    isListening,
    error,
    start,
    stop,
    reset,
    completeGame,
    setHoldDuration,
    setStartingSemitoneOffset,
    setScaleMode,
  }
}
