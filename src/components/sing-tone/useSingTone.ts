import { useMachine } from '@xstate/vue'
import type { NoteInfo } from '@/utils/noteUtils'
import {
  frequencyToCents,
  midiToFrequency,
  midiToNoteLabel,
} from '@/utils/noteUtils'
import { singToneMachine, type SingTonePhase } from './singToneMachine'

type PitchDetectionProvider = {
  frequency: Readonly<Ref<number | null>>
  noteInfo: Readonly<Ref<NoteInfo | null>>
  clarity: Readonly<Ref<number>>
  isListening: Readonly<Ref<boolean>>
  isClean: Readonly<Ref<boolean>>
  error: Readonly<Ref<string | null>>
  start: () => void | Promise<void>
  stop: () => void
}

const DEFAULT_HOLD_DURATION_MS = 750
/* Brief pitch-loss tolerance — lets singers breathe or wobble without resetting hold progress */
const GRACE_PERIOD_MS = 250
const DEFAULT_TOTAL_ROUNDS = 5

/* Shorter than the global TONE_PLAY_DURATION_S so the synth release tail
 * finishes inside the DEAF_PERIOD_MS window — otherwise the mic picks up
 * its own tone tail as the singer's voice and auto-advances the round. */
export const SING_TONE_PREVIEW_DURATION_S = 0.5

/*
 * After playing a reference tone, ignore pitch detection for this long
 * so the microphone doesn't pick up speaker output (including synth
 * release tail) as the singer's voice.
 */
const DEAF_PERIOD_MS =
  SING_TONE_PREVIEW_DURATION_S +
  1000 /* buffer for release tail + scheduling inaccuracy */

/*
 * Maximum cents deviation from the target note to count as "correct."
 * ±50 cents is the standard threshold in beginner/educational singing apps.
 */
const MAX_CENTS_DEVIATION = 50
/* Delay before showing "too low" / "too high" hint arrow */
const TOO_LOW_OR_HIGH_HINT_MS = 500

type singToneOptions = {
  holdDurationMs?: number
  totalRounds?: number
  midiMin?: number
  midiMax?: number
  pitchDetection?: PitchDetectionProvider
  /* Debug/test override: forces the first round's target MIDI instead of
   * picking it randomly. Subsequent rounds stay random. Used by the test page
   * to deterministically render edge cases (e.g. the highest tone, to check
   * the target circle isn't clipped). */
  firstTargetMidi?: MaybeRefOrGetter<number | null>
}

export {
  DEAF_PERIOD_MS,
  DEFAULT_HOLD_DURATION_MS,
  DEFAULT_TOTAL_ROUNDS,
  GRACE_PERIOD_MS,
  MAX_CENTS_DEVIATION,
  TOO_LOW_OR_HIGH_HINT_MS,
}
export type { PitchDetectionProvider, singToneOptions }

export type singToneResult = ReturnType<typeof useSingTone>

export function useSingTone(options: singToneOptions = {}) {
  const holdDurationMs = ref(options.holdDurationMs ?? DEFAULT_HOLD_DURATION_MS)
  const totalRounds = ref(options.totalRounds ?? DEFAULT_TOTAL_ROUNDS)
  const midiMin = ref(options.midiMin ?? 48)
  const midiMax = ref(options.midiMax ?? 72)

  const {
    noteInfo,
    clarity,
    isClean,
    isListening,
    error,
    frequency,
    start: startDetection,
    stop: stopDetection,
  } = options.pitchDetection ??
  /* softRawAudio — NS/AGC off so the held sung tone registers, EC kept on
   * because the target tone plays through the speaker while the mic listens
   * (the deafUntilMs window masks the overlap). */
  usePitchDetection({ softRawAudio: true })

  const targetMidi = ref<number | null>(null)
  const completedCount = ref(0)
  const holdTimeMs = ref(0)
  const graceTimeMs = ref(0)
  const elapsedMs = ref(0)
  const tooLowMs = ref(0)
  const tooHighMs = ref(0)

  /* The single source of truth for the round lifecycle. Side-effects (mic,
   * RAF tick, reference tone, confetti) live in the imperative wrappers below
   * and in the Display's watchers, not in the machine — it stays pure. */
  const { snapshot, send } = useMachine(singToneMachine)
  const phase = computed<SingTonePhase>(
    () => snapshot.value.value as SingTonePhase,
  )
  const gameState = phase
  const isIdle = computed(() => phase.value === 'idle')
  const isPlaying = computed(() => phase.value === 'playing')
  /* Back-compat projections for existing consumers/tests. isStarted is true
   * exactly while playing — the only runtime reader is triggerDeafPeriod's
   * guard, never reachable at completion (chart is v-if-hidden then). */
  const isComplete = computed(() => phase.value === 'complete')
  const isStarted = isPlaying
  /* Elapsed-time threshold below which pitch matches are ignored (deaf period) */
  const deafUntilMs = ref(0)
  /* Increments each time playTargetTone() runs. External code can watch this
   * to re-arm side effects (e.g. the idle preview deaf window) without
   * coupling to the internal play flow. */
  const targetTonePlayCount = ref(0)

  let lastTimestamp: number | null = null
  let timerFrameId: number | null = null

  const targetFrequency = computed(() => {
    if (targetMidi.value === null) return null

    return midiToFrequency(targetMidi.value)
  })

  const targetNoteLabel = computed(() => {
    if (targetMidi.value === null) return null

    return midiToNoteLabel(targetMidi.value)
  })

  const centsFromTarget = computed(() => {
    if (!frequency.value || !isClean.value || targetFrequency.value === null)
      return null

    return frequencyToCents(frequency.value, targetFrequency.value)
  })

  const holdProgress = computed(() =>
    Math.min(holdTimeMs.value / holdDurationMs.value, 1),
  )

  const isDeaf = computed(() => elapsedMs.value < deafUntilMs.value)

  const isSingingCorrectNote = computed(() => {
    if (isDeaf.value) return false
    if (!noteInfo.value || !isClean.value) return false
    if (centsFromTarget.value === null || targetMidi.value === null)
      return false

    return (
      noteInfo.value.midiNote === targetMidi.value &&
      Math.abs(centsFromTarget.value) <= MAX_CENTS_DEVIATION
    )
  })

  function generateRandomMidi(): number {
    const range = midiMax.value - midiMin.value
    const midi = midiMin.value + Math.floor(Math.random() * (range + 1))

    /* Avoid repeating the same note; fall through if range is 0 (only one note) */
    if (midi === targetMidi.value && range > 0) {
      return generateRandomMidi()
    }

    return midi
  }

  async function playTargetTone(midi: number) {
    const freq = midiToFrequency(midi)
    const { playTone } = useTonePlayer()
    targetTonePlayCount.value++
    debugLog('[SingTone] target tone start', { midi, freq }, Date.now())
    await playTone(freq, SING_TONE_PREVIEW_DURATION_S)
    setTimeout(() => {
      debugLog('[SingTone] target tone stop', { midi }, Date.now())
    }, SING_TONE_PREVIEW_DURATION_S * 1000)
  }

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
    completedCount.value++

    if (completedCount.value >= totalRounds.value) {
      send({ type: 'COMPLETE' })
      stopTimer()
    } else {
      const midi = generateRandomMidi()
      targetMidi.value = midi
      deafUntilMs.value = elapsedMs.value + DEAF_PERIOD_MS
      playTargetTone(midi)
      startTimer()
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
     * (exactly what the old derived gameState did). The reference tone /
     * target generation below stay unconditional, matching today's behavior
     * (a tone still plays on a denied mic). Simulated detection sets
     * isListening synchronously, so the test page / unit tests still start. */
    if (isListening.value) send({ type: 'START' })

    const midi = toValue(options.firstTargetMidi) ?? generateRandomMidi()
    targetMidi.value = midi
    completedCount.value = 0
    await playTargetTone(midi)
    deafUntilMs.value = elapsedMs.value + DEAF_PERIOD_MS

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
    targetMidi.value = null
    completedCount.value = 0
    holdTimeMs.value = 0
    graceTimeMs.value = 0
    tooLowMs.value = 0
    tooHighMs.value = 0
    deafUntilMs.value = 0
    elapsedMs.value = 0
  }

  function reset() {
    stop()
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

  function setTotalRounds(n: number) {
    totalRounds.value = n
  }

  function setMidiRange(min: number, max: number) {
    midiMin.value = min
    midiMax.value = max
    stop()
  }

  /* Activate the deaf period from external code (e.g. user-initiated tone click) */
  function triggerDeafPeriod() {
    if (!isStarted.value) return

    deafUntilMs.value = elapsedMs.value + DEAF_PERIOD_MS
  }

  return {
    targetMidi: readonly(targetMidi),
    targetFrequency,
    targetNoteLabel,
    completedCount: readonly(completedCount),
    totalRounds: readonly(totalRounds),
    noteInfo,
    clarity,
    isClean,
    currentFrequency: frequency,
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
    isDeaf,
    isListening,
    targetTonePlayCount: readonly(targetTonePlayCount),
    error,
    midiMin: readonly(midiMin),
    midiMax: readonly(midiMax),
    start,
    stop,
    reset,
    setHoldDuration,
    setTotalRounds,
    setMidiRange,
    triggerDeafPeriod,
  }
}
