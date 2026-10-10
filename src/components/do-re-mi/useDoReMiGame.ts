import { useMachine } from '@xstate/vue'
import type { Difficulty } from '@/constants/difficulty'
import type { NoteInfo, NoteName, ScaleMode } from '@/utils/noteUtils'
import {
  buildScale,
  C3_MIDI,
  frequencyToCents,
  noteToFrequency,
  SCALE_MODE_OPTIONS,
  START_TONE_GROUPS,
  START_TONE_OPTIONS,
} from '@/utils/noteUtils'
import { CLEAN_CENTS, CLOSE_CENTS, OFF_CENTS } from '@/utils/pitchColors'
import { doReMiMachine, type DoReMiPhase } from './doReMiMachine'

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

const DEFAULT_HOLD_DURATION_MS = 750
/* Brief pitch-loss tolerance — lets singers breathe or wobble without resetting hold progress */
const GRACE_PERIOD_MS = 250
const DEFAULT_STARTING_SEMITONE_OFFSET = 7 // G3
const DEFAULT_SCALE_MODE: ScaleMode = 'ionian'

/*
 * Maximum cents deviation from the target note to count as "correct", per
 * difficulty. Reuses the pitchColors tiers so the pass rule matches the
 * colours: Easy accepts anything short of red (±50¢, the usual beginner
 * threshold in Yousician/Smule), Normal needs green or yellow (±25¢), Hard
 * needs green (±10¢).
 */
const DIFFICULTY_MAX_CENTS: Record<Difficulty, number> = {
  easy: OFF_CENTS,
  normal: CLOSE_CENTS,
  hard: CLEAN_CENTS,
}
/* Easy is the pre-difficulty ±50¢ behaviour */
const DEFAULT_DIFFICULTY: Difficulty = 'easy'
/* Delay before showing "too low" / "too high" hint arrow — avoids flashing during brief pitch drift */
const TOO_LOW_OR_HIGH_HINT_MS = 500

type DoReMiGameOptions = {
  holdDurationMs?: number
  difficulty?: Difficulty
  pitchDetection?: PitchDetectionProvider
}

export {
  DEFAULT_DIFFICULTY,
  DEFAULT_HOLD_DURATION_MS,
  DEFAULT_SCALE_MODE,
  DEFAULT_STARTING_SEMITONE_OFFSET,
  DIFFICULTY_MAX_CENTS,
  GRACE_PERIOD_MS,
  SCALE_MODE_OPTIONS,
  START_TONE_GROUPS,
  START_TONE_OPTIONS,
  TOO_LOW_OR_HIGH_HINT_MS,
}
export type { DoReMiGameOptions, PitchDetectionProvider, ScaleStep }

export type DoReMiGameResult = ReturnType<typeof useDoReMiGame>

export function useDoReMiGame(options: DoReMiGameOptions = {}) {
  const holdDurationMs = ref(options.holdDurationMs ?? DEFAULT_HOLD_DURATION_MS)
  const startingSemitoneOffset = ref(DEFAULT_STARTING_SEMITONE_OFFSET)
  const scaleMode = ref<ScaleMode>(DEFAULT_SCALE_MODE)
  const difficulty = ref<Difficulty>(options.difficulty ?? DEFAULT_DIFFICULTY)
  const maxCentsDeviation = computed(
    () => DIFFICULTY_MAX_CENTS[difficulty.value],
  )

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
  } = options.pitchDetection ??
  /* softRawAudio — NS/AGC off so steady sung notes register, EC kept on
   * because the scale plays reference tones through the speaker while the mic
   * listens (deaf windows mask the brief overlap). */
  usePitchDetection({ softRawAudio: true })

  const currentStepIndex = ref(0)
  const holdTimeMs = ref(0)
  const graceTimeMs = ref(0)
  const elapsedMs = ref(0)
  const tooLowMs = ref(0)
  const tooHighMs = ref(0)

  /* The single source of truth for the round lifecycle. Side-effects (mic,
   * RAF tick, confetti) live in the imperative wrappers below and in the
   * Display's watchers, not in the machine — it stays pure. */
  const { snapshot, send } = useMachine(doReMiMachine)
  const phase = computed<DoReMiPhase>(() => snapshot.value.value as DoReMiPhase)
  const gameState = phase
  const isIdle = computed(() => phase.value === 'idle')
  const isPlaying = computed(() => phase.value === 'playing')
  /* Back-compat projections for existing consumers/tests. isStarted is true
   * exactly while playing — no runtime code reads game.isStarted (DoReMiScale
   * is passed isListening), and no test asserts it at completion. */
  const isComplete = computed(() => phase.value === 'complete')
  const isStarted = isPlaying

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

    return frequencyToCents(frequency.value, targetFrequency.value)
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
      Math.abs(centsFromTarget.value) <= maxCentsDeviation.value
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
        if (cents !== null && cents < -maxCentsDeviation.value) {
          tooLowMs.value += delta
          tooHighMs.value = 0
        } else if (cents !== null && cents > maxCentsDeviation.value) {
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
      send({ type: 'COMPLETE' })
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
    await startDetection()
    /* Mic denial doesn't throw — usePitchDetection catches it, sets `error`
     * and leaves isListening false. Only enter `playing` when the mic actually
     * opened, so a denied mic stays on the idle screen with the error visible
     * (exactly what the old derived gameState did). Simulated detection sets
     * isListening synchronously, so the test page / unit tests still start. */
    if (!isListening.value) return

    send({ type: 'START' })
    startTimer()
  }

  function stop() {
    /* RESET is the universal teardown — returns to idle from playing AND
     * complete (STOP only covers playing). Skip if the actor is no longer
     * active: on unmount @xstate/vue stops it before our onUnmounted runs,
     * and sending to a stopped actor logs a noisy warning. */
    if (snapshot.value.status === 'active') {
      send({ type: 'RESET' })
    }
    stopTimer()
    stopDetection()
    currentStepIndex.value = 0
    holdTimeMs.value = 0
    graceTimeMs.value = 0
    tooLowMs.value = 0
    tooHighMs.value = 0
    elapsedMs.value = 0
  }

  function reset() {
    stop()
  }

  function completeGame() {
    /* COMPLETE before stopDetection so the phase is `complete` before
     * isListening flips — the watch below then skips its STOP branch. */
    send({ type: 'COMPLETE' })
    stopTimer()
    stopDetection()
  }

  watch(isListening, (listening) => {
    if (!listening) {
      stopTimer()
      /* Mic lost mid-game → back to idle, preserving the old derived
       * behavior. Natural completion doesn't stop detection, so this won't
       * misfire there. */
      if (isPlaying.value) send({ type: 'STOP' })
    }
  })

  if (getCurrentInstance()) {
    onUnmounted(() => stop())
  }

  function setHoldDuration(ms: number) {
    holdDurationMs.value = ms
  }

  /* Applies live — a mid-round change only moves the tolerance, so there is
   * no need to restart the round the way a new scale does. */
  function setDifficulty(level: Difficulty) {
    difficulty.value = level
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
    difficulty: readonly(difficulty),
    maxCentsDeviation,
    currentStepIndex: readonly(currentStepIndex),
    targetStep,
    targetFrequency,
    currentFrequency: frequency,
    noteInfo,
    isClean,
    centsFromTarget,
    holdProgress,
    holdDurationMs: readonly(holdDurationMs),
    holdTimeMs: readonly(holdTimeMs),
    tooLowMs: readonly(tooLowMs),
    tooHighMs: readonly(tooHighMs),
    elapsedMs: readonly(elapsedMs),
    phase,
    gameState,
    isIdle,
    isPlaying,
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
    setDifficulty,
    setStartingSemitoneOffset,
    setScaleMode,
  }
}
