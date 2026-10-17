import { useMachine } from '@xstate/vue'
import type { ToneEngine } from '@/composables/toneEngine'
import type { Difficulty } from '@/constants/difficulty'
import { DEFAULT_RANGE_INDEX, VOICE_RANGES } from '@/constants/voiceRanges'
import type { NoteInfo } from '@/utils/noteUtils'
import { frequencyToCents, midiToFrequency } from '@/utils/noteUtils'
import { CLEAN_CENTS, CLOSE_CENTS, OFF_CENTS } from '@/utils/pitchColors'
import type { CircleDirection, MidiWindow } from './circleOfFifths'
import {
  buildWalkSteps,
  CIRCLE_KEYS,
  placePattern,
  placePitchClass,
  walkKeyOrder,
  walkWindow,
} from './circleOfFifths'
import {
  circleOfFifthsMachine,
  type CircleOfFifthsPhase,
} from './circleOfFifthsMachine'
import { useCircleOfFifthsPlayback } from './useCircleOfFifthsPlayback'

export type Solfege = 'DO' | 'MI' | 'SO' | 'FA' | 'LA'
export type PatternId = 'doMiSo' | 'doLa'

export type SingTarget = {
  midi: number
  solfege: Solfege
  /* The key this solfège belongs to — SO of C, not DO of G */
  keyIndex: number
}

export type PitchDetectionProvider = {
  frequency: Readonly<Ref<number | null>>
  noteInfo: Readonly<Ref<NoteInfo | null>>
  isListening: Readonly<Ref<boolean>>
  isClean: Readonly<Ref<boolean>>
  error: Readonly<Ref<string | null>>
  start: () => void | Promise<void>
  stop: () => void
}

export const DEFAULT_HOLD_DURATION_MS = 750
/* Brief pitch-loss tolerance — lets singers breathe or wobble without resetting hold progress */
export const GRACE_PERIOD_MS = 250
/* Delay before showing "too low" / "too high" hint arrow — avoids flashing during brief pitch drift */
export const TOO_LOW_OR_HIGH_HINT_MS = 500
/* Extra deaf time after a tone's release tail, for audio scheduling jitter */
const DEAF_BUFFER_MS = 250
export const DEFAULT_DIFFICULTY: Difficulty = 'easy'
export const DEFAULT_DIRECTION: CircleDirection = 'clockwise'

/* Same tiers as Do-Re-Mi, so a pass reads the same colour in both games */
export const DIFFICULTY_MAX_CENTS: Record<Difficulty, number> = {
  easy: OFF_CENTS,
  normal: CLOSE_CENTS,
  hard: CLEAN_CENTS,
}

/* Explore patterns as semitones from DO. DO MI SO MI DO walks up the major
 * triad and back home; DO LA drops a minor third to the relative minor's
 * tonic. */
const PATTERNS: Record<PatternId, { offsets: number[]; solfege: Solfege[] }> = {
  doMiSo: {
    offsets: [0, 4, 7, 4, 0],
    solfege: ['DO', 'MI', 'SO', 'MI', 'DO'],
  },
  doLa: { offsets: [0, -3], solfege: ['DO', 'LA'] },
}

const C_KEY_INDEX = 0

export type CircleOfFifthsGameOptions = {
  pitchDetection?: PitchDetectionProvider
  toneEngine?: ToneEngine
  holdDurationMs?: number
  difficulty?: Difficulty
}

export type CircleOfFifthsGameResult = ReturnType<typeof useCircleOfFifthsGame>

export function useCircleOfFifthsGame(options: CircleOfFifthsGameOptions = {}) {
  const holdDurationMs = options.holdDurationMs ?? DEFAULT_HOLD_DURATION_MS
  const direction = ref<CircleDirection>(DEFAULT_DIRECTION)
  const range = ref<MidiWindow>(VOICE_RANGES[DEFAULT_RANGE_INDEX])
  const difficulty = ref<Difficulty>(options.difficulty ?? DEFAULT_DIFFICULTY)
  const maxCentsDeviation = computed(
    () => DIFFICULTY_MAX_CENTS[difficulty.value],
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
   * because reference tones play through the speaker while the mic listens
   * (deaf windows mask the overlap). */
  usePitchDetection({ softRawAudio: true })

  const playback = useCircleOfFifthsPlayback({ toneEngine: options.toneEngine })

  const { snapshot, send } = useMachine(circleOfFifthsMachine)
  const phase = computed(() => snapshot.value.value as CircleOfFifthsPhase)
  const isIdle = computed(() => phase.value === 'idle')
  const isWalking = computed(() => phase.value === 'walking')
  const isWalkComplete = computed(() => phase.value === 'walkComplete')
  const isPatternSinging = computed(() => phase.value === 'patternSinging')
  const isSinging = computed(() => isWalking.value || isPatternSinging.value)

  const targets = ref<SingTarget[]>([])
  const currentTargetIndex = ref(0)
  /* Keys lit by the walk, in the order they were reached */
  const litKeyIndices = ref<number[]>([])
  const exploredKeyIndices = ref<number[]>([])
  const exploredMinorKeyIndices = ref<number[]>([])
  const selectedKeyIndex = ref<number | null>(null)
  const activePattern = ref<PatternId | null>(null)
  const patternKeyIndex = ref<number | null>(null)

  const holdTimeMs = ref(0)
  const graceTimeMs = ref(0)
  const elapsedMs = ref(0)
  const tooLowMs = ref(0)
  const tooHighMs = ref(0)
  /* Elapsed-time threshold below which pitch matches are ignored (deaf period) */
  const deafUntilMs = ref(0)

  let lastTimestamp: number | null = null
  let timerFrameId: number | null = null

  const walkOrder = computed(() => walkKeyOrder(direction.value))
  /* The walk's first note — DO of C in the middle of the voice range */
  const walkStartMidi = computed(() => keyTonic(C_KEY_INDEX))

  const currentTarget = computed<SingTarget | null>(
    () => targets.value[currentTargetIndex.value] ?? null,
  )
  const currentKeyIndex = computed(() => currentTarget.value?.keyIndex ?? null)
  /* The key the current walk target lights up — G while singing SO of C */
  const nextKeyIndex = computed(() => {
    if (!isWalking.value || currentTargetIndex.value === 0) return null

    return walkOrder.value[currentTargetIndex.value] ?? null
  })

  const targetFrequency = computed(() =>
    currentTarget.value ? midiToFrequency(currentTarget.value.midi) : null,
  )

  const centsFromTarget = computed(() => {
    if (!frequency.value || !isClean.value || targetFrequency.value === null)
      return null

    return frequencyToCents(frequency.value, targetFrequency.value)
  })

  const holdProgress = computed(() =>
    Math.min(holdTimeMs.value / holdDurationMs, 1),
  )

  const isDeaf = computed(() => elapsedMs.value < deafUntilMs.value)

  const isSingingCorrectNote = computed(() => {
    if (isDeaf.value || !isSinging.value) return false
    if (!noteInfo.value || !isClean.value || !currentTarget.value) return false
    if (centsFromTarget.value === null) return false

    return (
      noteInfo.value.midiNote === currentTarget.value.midi &&
      Math.abs(centsFromTarget.value) <= maxCentsDeviation.value
    )
  })

  const showTooLow = computed(() => tooLowMs.value >= TOO_LOW_OR_HIGH_HINT_MS)
  const showTooHigh = computed(() => tooHighMs.value >= TOO_LOW_OR_HIGH_HINT_MS)

  function resetHold() {
    holdTimeMs.value = 0
    graceTimeMs.value = 0
    tooLowMs.value = 0
    tooHighMs.value = 0
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

        const cents = isDeaf.value ? null : centsFromTarget.value
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

      if (holdTimeMs.value >= holdDurationMs) {
        advanceTarget()
      }
    }

    lastTimestamp = timestamp

    if (isSinging.value && isListening.value) {
      timerFrameId = requestAnimationFrame(tickTimer)
    }
  }

  function startTimer() {
    stopTimer()
    timerFrameId = requestAnimationFrame(tickTimer)
  }

  function stopTimer() {
    if (timerFrameId !== null) {
      cancelAnimationFrame(timerFrameId)
      timerFrameId = null
    }
    lastTimestamp = null
  }

  /* Plays a tone and ignores the mic until its release tail has gone. The
   * window opens before the await so nothing scores while the engine warms
   * up. */
  async function playDeaf(play: () => Promise<number>) {
    deafUntilMs.value = Number.POSITIVE_INFINITY
    try {
      const seconds = await play()
      deafUntilMs.value = elapsedMs.value + seconds * 1000 + DEAF_BUFFER_MS
    } catch (playError) {
      /* No sound means nothing to mask — keep the round playable */
      deafUntilMs.value = 0
      debugLog('[CircleOfFifths] tone failed', playError)
    }
  }

  function advanceTarget() {
    resetHold()
    const heldIndex = currentTargetIndex.value
    const held = targets.value[heldIndex]
    const isLast = heldIndex >= targets.value.length - 1

    if (isWalking.value) {
      advanceWalk(heldIndex, held, isLast)
    } else if (isPatternSinging.value && isLast) {
      completePattern()
    } else {
      currentTargetIndex.value++
    }
  }

  function advanceWalk(heldIndex: number, held: SingTarget, isLast: boolean) {
    const reachedKeyIndex = walkOrder.value[heldIndex]
    /* Each lit key plays its chord — the reward, and a reminder of where SO is */
    void playDeaf(() => playback.playTriad(held.midi))

    if (isLast) {
      send({ type: 'COMPLETE' })
      stopTimer()
      stopDetection()

      return
    }

    litKeyIndices.value = [...litKeyIndices.value, reachedKeyIndex]
    currentTargetIndex.value++
  }

  function completePattern() {
    const keyIndex = patternKeyIndex.value
    if (keyIndex !== null) {
      const explored =
        activePattern.value === 'doLa'
          ? exploredMinorKeyIndices
          : exploredKeyIndices
      if (!explored.value.includes(keyIndex)) {
        explored.value = [...explored.value, keyIndex]
      }
    }

    /* COMPLETE before stopDetection, so the isListening watch below sees an
     * idle phase and doesn't treat it as a lost mic. */
    send({ type: 'COMPLETE' })
    stopTimer()
    stopDetection()
    clearRound()
  }

  function buildWalkTargets(): SingTarget[] {
    const steps = buildWalkSteps(direction.value, range.value)
    /* Clockwise hops up a fifth (SO); counter-clockwise up a fourth (FA) */
    const hopSolfege: Solfege = direction.value === 'clockwise' ? 'SO' : 'FA'

    return [
      { midi: steps[0].rootMidi, solfege: 'DO', keyIndex: C_KEY_INDEX },
      ...steps.map((step) => ({
        midi: step.nextMidi,
        solfege: hopSolfege,
        keyIndex: step.keyIndex,
      })),
    ]
  }

  function clearRound() {
    resetHold()
    targets.value = []
    currentTargetIndex.value = 0
    activePattern.value = null
    patternKeyIndex.value = null
    deafUntilMs.value = 0
  }

  async function startWalk() {
    playback.stopSequence()
    await startDetection()
    /* Mic denial doesn't throw — detection sets `error` and leaves isListening
     * false, so a denied mic stays on the idle screen with the error visible. */
    if (!isListening.value) return

    clearRound()
    litKeyIndices.value = []
    elapsedMs.value = 0
    targets.value = buildWalkTargets()
    send({ type: 'START_WALK' })
    startTimer()
    void playDeaf(() => playback.playReference(targets.value[0].midi))
  }

  async function startPattern(keyIndex: number, patternId: PatternId) {
    if (!isIdle.value) return

    playback.stopSequence()
    await startDetection()
    if (!isListening.value) return

    const pattern = PATTERNS[patternId]
    const tonic = placePattern(
      CIRCLE_KEYS[keyIndex].pitchClass,
      pattern.offsets,
      range.value,
    )

    clearRound()
    elapsedMs.value = 0
    selectedKeyIndex.value = keyIndex
    activePattern.value = patternId
    patternKeyIndex.value = keyIndex
    targets.value = pattern.offsets.map((offset, index) => ({
      midi: tonic + offset,
      solfege: pattern.solfege[index],
      keyIndex,
    }))
    send({ type: 'START_PATTERN' })
    startTimer()
    void playDeaf(() => playback.playTriad(tonic))
  }

  function stop() {
    /* RESET returns to idle from every state. Skip it once the actor has
     * stopped: on unmount @xstate/vue stops it before our onUnmounted runs. */
    if (snapshot.value.status === 'active') {
      send({ type: 'RESET' })
    }
    stopTimer()
    stopDetection()
    playback.stopSequence()
    clearRound()
    litKeyIndices.value = []
    elapsedMs.value = 0
  }

  /* DO of a key in the middle of the voice range, for listening */
  function keyTonic(keyIndex: number) {
    return placePitchClass(
      CIRCLE_KEYS[keyIndex].pitchClass,
      walkWindow(range.value),
    )
  }

  function selectKey(keyIndex: number) {
    if (!isIdle.value) return

    selectedKeyIndex.value = keyIndex
    void playback.playTriad(keyTonic(keyIndex))
  }

  function playSelectedKey() {
    if (selectedKeyIndex.value === null) return

    void playback.playCadence(keyTonic(selectedKeyIndex.value))
  }

  function playTarget() {
    if (!currentTarget.value || !isSinging.value) return

    const midi = currentTarget.value.midi
    void playDeaf(() => playback.playReference(midi))
  }

  function setDirection(next: CircleDirection) {
    if (next === direction.value) return

    direction.value = next
    stop()
  }

  function setRange(next: MidiWindow) {
    if (
      next.midiMin === range.value.midiMin &&
      next.midiMax === range.value.midiMax
    )
      return

    range.value = { midiMin: next.midiMin, midiMax: next.midiMax }
    stop()
  }

  /* Applies live — only the tolerance moves, so the round carries on */
  function setDifficulty(level: Difficulty) {
    difficulty.value = level
  }

  watch(isListening, (listening) => {
    if (listening) return

    stopTimer()
    /* Mic lost mid-round → back to idle */
    if (isSinging.value) send({ type: 'STOP' })
  })

  if (getCurrentInstance()) {
    onUnmounted(() => stop())
  }

  return {
    phase,
    isIdle,
    isWalking,
    isWalkComplete,
    isPatternSinging,
    isSinging,
    direction: readonly(direction),
    difficulty: readonly(difficulty),
    range: readonly(range),
    maxCentsDeviation,
    targets: readonly(targets),
    currentTargetIndex: readonly(currentTargetIndex),
    currentTarget,
    currentKeyIndex,
    nextKeyIndex,
    walkStartMidi,
    litKeyIndices: readonly(litKeyIndices),
    exploredKeyIndices: readonly(exploredKeyIndices),
    exploredMinorKeyIndices: readonly(exploredMinorKeyIndices),
    selectedKeyIndex: readonly(selectedKeyIndex),
    activePattern: readonly(activePattern),
    centsFromTarget,
    holdProgress,
    holdTimeMs: readonly(holdTimeMs),
    tooLowMs: readonly(tooLowMs),
    tooHighMs: readonly(tooHighMs),
    showTooLow,
    showTooHigh,
    elapsedMs: readonly(elapsedMs),
    isDeaf,
    isSingingCorrectNote,
    isListening,
    error,
    isPlayingSequence: playback.isPlayingSequence,
    currentChordIndex: playback.currentChordIndex,
    startWalk,
    startPattern,
    stop,
    selectKey,
    playSelectedKey,
    playTarget,
    setDirection,
    setRange,
    setDifficulty,
  }
}
