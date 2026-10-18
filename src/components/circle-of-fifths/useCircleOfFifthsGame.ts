import { useMachine } from '@xstate/vue'
import type { ToneEngine } from '@/composables/toneEngine'
import type { Difficulty } from '@/constants/difficulty'
import { DEFAULT_RANGE_INDEX, VOICE_RANGES } from '@/constants/voiceRanges'
import type { NoteInfo } from '@/utils/noteUtils'
import {
  frequencyToCents,
  midiToFrequency,
  snapMidiWithHysteresis,
} from '@/utils/noteUtils'
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
import {
  DOMINANT_SEVENTH_OFFSETS,
  TRIAD_OFFSETS,
  useCircleOfFifthsPlayback,
} from './useCircleOfFifthsPlayback'

export type Solfege = 'DO' | 'MI' | 'SO' | 'LA'
export type PatternId = 'doMiSo' | 'doLa'
export type HopDirection = 'up' | 'down'
/* How the sung note compares with the target */
export type SungState = 'correct' | 'low' | 'high'

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
/* Seconds a note must be held. Floor 0.1 sits below GRACE_PERIOD_MS on purpose:
 * it lets fast singers race the walk, at the cost of a slide through a note
 * completing it; ceiling 3 keeps the 13-note walk a tour, not an endurance test. */
export const HOLD_DURATION_OPTIONS = [0.1, 0.3, 0.5, 0.75, 1, 2, 3] as const
/* Brief pitch-loss tolerance — lets singers breathe or wobble without resetting hold progress */
export const GRACE_PERIOD_MS = 250
/* Delay before showing "too low" / "too high" hint arrow — avoids flashing during brief pitch drift */
export const TOO_LOW_OR_HIGH_HINT_MS = 500
/* The sung note keeps its name until the pitch is 70 cents away — a fifth of
 * a semitone past the midpoint — so a slightly flat voice settles on one note.
 * Semitone neighbours sit on opposite sides of the wheel, so every flip would
 * throw the outline across it. Wider than SingFly's 0.6: there a median filter
 * steadies the pitch first, here only the EMA does. Kept under 0.8 so a voice
 * on pitch (CLOSE_CENTS) is always named by its own note. */
export const SUNG_NOTE_HYSTERESIS_SEMITONES = 0.7
/* Extra deaf time after a tone's release tail, for audio scheduling jitter */
const DEAF_BUFFER_MS = 250
export const DEFAULT_DIFFICULTY: Difficulty = 'easy'
export const DEFAULT_DIRECTION: CircleDirection = 'clockwise'
/* Whether landing back on C plays its chord like every other lit key. Off: the
 * finish is confetti only, and the mic is released at once. */
export const SHOULD_PLAY_CLOSING_CHORD = false

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
/* A perfect fourth — SO sits this far below DO */
const FOURTH_SEMITONES = 5

export type CircleOfFifthsGameOptions = {
  pitchDetection?: PitchDetectionProvider
  toneEngine?: ToneEngine
  holdDurationMs?: number
  difficulty?: Difficulty
}

export type CircleOfFifthsGameResult = ReturnType<typeof useCircleOfFifthsGame>

export function useCircleOfFifthsGame(options: CircleOfFifthsGameOptions = {}) {
  const holdDurationMs = ref(options.holdDurationMs ?? DEFAULT_HOLD_DURATION_MS)
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
  const selectedKeyIndex = ref<number | null>(null)
  const activePattern = ref<PatternId | null>(null)

  const holdTimeMs = ref(0)
  const graceTimeMs = ref(0)
  const elapsedMs = ref(0)
  const tooLowMs = ref(0)
  const tooHighMs = ref(0)
  /* Elapsed-time threshold below which pitch matches are ignored (deaf period) */
  const deafUntilMs = ref(0)
  /* The chord the last lit key played, kept after it fades so the centre
   * can fade it out with its notes still in place */
  const chordMidis = ref<number[]>([])
  const chordUntilMs = ref(0)

  let lastTimestamp: number | null = null
  let timerFrameId: number | null = null

  const walkOrder = computed(() => walkKeyOrder(direction.value))
  /* The walk's first note — DO of C in the middle of the voice range */
  const walkStartMidi = computed(() => keyTonic(C_KEY_INDEX))

  const currentTarget = computed<SingTarget | null>(
    () => targets.value[currentTargetIndex.value] ?? null,
  )
  /* The key the singer stands in — C while singing SO of C, and still C while
   * singing DO of F going fourths, whose target already belongs to F */
  const currentKeyIndex = computed(() => {
    if (isWalking.value && currentTargetIndex.value > 0)
      return walkOrder.value[currentTargetIndex.value - 1] ?? null

    return currentTarget.value?.keyIndex ?? null
  })
  /* Which way the current note jumps from the one just held — the walk hops
   * down a fourth instead of up a fifth whenever that keeps it in range, so
   * the note name alone doesn't say which octave to aim for */
  const hopDirection = computed<HopDirection | null>(() => {
    const previous = targets.value[currentTargetIndex.value - 1]
    if (!previous || !currentTarget.value) return null
    if (currentTarget.value.midi === previous.midi) return null

    return currentTarget.value.midi > previous.midi ? 'up' : 'down'
  })
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
    Math.min(holdTimeMs.value / holdDurationMs.value, 1),
  )

  const isDeaf = computed(() => elapsedMs.value < deafUntilMs.value)
  const isChordRinging = computed(() => elapsedMs.value < chordUntilMs.value)

  /* The singer's continuous pitch — hidden while a reference tone rings so the
   * speaker never shows up as the singer's voice */
  const heardMidi = computed(() => {
    if (!isSinging.value || isDeaf.value || !isClean.value) return null
    if (!noteInfo.value) return null

    return noteInfo.value.midiNote + noteInfo.value.cents / 100 // 100 cents per semitone
  })

  const isSingingCorrectNote = computed(() => {
    if (isDeaf.value || !isSinging.value) return false
    if (!noteInfo.value || !isClean.value || !currentTarget.value) return false
    if (centsFromTarget.value === null) return false

    return (
      noteInfo.value.midiNote === currentTarget.value.midi &&
      Math.abs(centsFromTarget.value) <= maxCentsDeviation.value
    )
  })

  /* The note the singer is on, held through a hover between two semitones
   * (SUNG_NOTE_HYSTERESIS_SEMITONES). Display only — scoring reads the raw
   * pitch — and a pass always names the target, so the label never disagrees
   * with the green. Silence clears it, so each new note starts fresh. */
  const sungMidi = ref<number | null>(null)

  watch([heardMidi, isSingingCorrectNote], ([midi, isCorrect]) => {
    if (midi === null) {
      sungMidi.value = null

      return
    }

    if (isCorrect && currentTarget.value) {
      sungMidi.value = currentTarget.value.midi

      return
    }

    sungMidi.value = snapMidiWithHysteresis(
      midi,
      sungMidi.value,
      SUNG_NOTE_HYSTERESIS_SEMITONES,
    )
  })

  /* Cents from the note the label names — from the target once it's a pass,
   * so an easy-mode pass still shows how clean it was. The dead band lets it
   * reach about ±70 before the label flips. */
  const sungCents = computed(
    () =>
      heardMidi.value === null || sungMidi.value === null
        ? null
        : Math.round((heardMidi.value - sungMidi.value) * 100), // 100 cents per semitone
  )

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

      if (holdTimeMs.value >= holdDurationMs.value) {
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
   * up. Resolves to the seconds the tone sounds for (0 if it failed). */
  async function playDeaf(play: () => Promise<number>) {
    deafUntilMs.value = Number.POSITIVE_INFINITY
    try {
      const seconds = await play()
      deafUntilMs.value = elapsedMs.value + seconds * 1000 + DEAF_BUFFER_MS
      return seconds
    } catch (playError) {
      /* No sound means nothing to mask — keep the round playable */
      deafUntilMs.value = 0
      debugLog('[CircleOfFifths] tone failed', playError)
      return 0
    }
  }

  /* Releasing the mic switches the audio session back to playback, and that
   * switch cuts off whatever is sounding — so the closing chord rings out
   * first. Play Again inside the window leaves the complete phase, so the mic
   * stays open for the new walk. */
  let micReleaseTimeoutId: ReturnType<typeof setTimeout> | null = null

  function releaseMicAfter(seconds: number) {
    cancelMicRelease()
    micReleaseTimeoutId = setTimeout(() => {
      micReleaseTimeoutId = null
      if (isWalkComplete.value) stopDetection()
    }, seconds * 1000)
  }

  function cancelMicRelease() {
    if (micReleaseTimeoutId === null) return

    clearTimeout(micReleaseTimeoutId)
    micReleaseTimeoutId = null
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
    if (isLast) {
      completeWalk(held)

      return
    }

    /* Each lit key plays its chord — the reward, and a pointer to the next
     * note: SO tops the triad going fifths; going fourths the dominant 7th
     * pulls home to the next key's DO. That chord is rooted a fourth below
     * the next note — an octave under the held note on a downward hop — so
     * its TI is always the half step right below the target, never an
     * octave off */
    const isClockwise = direction.value === 'clockwise'
    const offsets = isClockwise ? TRIAD_OFFSETS : DOMINANT_SEVENTH_OFFSETS
    const nextTarget = targets.value[heldIndex + 1]
    const root = isClockwise ? held.midi : nextTarget.midi - FOURTH_SEMITONES
    chordMidis.value = offsets.map((offset) => root + offset)
    /* Shown from the moment it's triggered; the real length lands once the
     * engine has warmed up */
    chordUntilMs.value = Number.POSITIVE_INFINITY
    void playDeaf(() => playback.playChord(root, offsets)).then((seconds) => {
      chordUntilMs.value = elapsedMs.value + seconds * 1000
    })
    litKeyIndices.value = [...litKeyIndices.value, walkOrder.value[heldIndex]]
    currentTargetIndex.value++
  }

  function completeWalk(held: SingTarget) {
    send({ type: 'COMPLETE' })
    stopTimer()

    if (!SHOULD_PLAY_CLOSING_CHORD) {
      stopDetection()

      return
    }

    void playDeaf(() => playback.playTriad(held.midi)).then(releaseMicAfter)
  }

  function completePattern() {
    /* COMPLETE before stopDetection, so the isListening watch below sees an
     * idle phase and doesn't treat it as a lost mic. */
    send({ type: 'COMPLETE' })
    stopTimer()
    stopDetection()
    clearRound()
  }

  function buildWalkTargets(): SingTarget[] {
    const steps = buildWalkSteps(direction.value, range.value)
    /* Clockwise hops to SO of the key just sung. Counter-clockwise lands on
     * the same pitch as FA, heard as DO of the next key instead: the held
     * note is that key's SO, and SO → DO is the easiest resolution to hear */
    const isClockwise = direction.value === 'clockwise'

    return [
      { midi: steps[0].rootMidi, solfege: 'DO', keyIndex: C_KEY_INDEX },
      ...steps.map((step, index) => ({
        midi: step.nextMidi,
        solfege: isClockwise ? ('SO' as const) : ('DO' as const),
        keyIndex: isClockwise ? step.keyIndex : walkOrder.value[index + 1],
      })),
    ]
  }

  function clearRound() {
    resetHold()
    targets.value = []
    currentTargetIndex.value = 0
    activePattern.value = null
    deafUntilMs.value = 0
    chordMidis.value = []
    chordUntilMs.value = 0
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
    cancelMicRelease()
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

  /* The key's DO on its own, in the octave the walk will ask for — a preview
   * of the reference tone the round plays */
  function playKeyTone(keyIndex: number) {
    if (!isIdle.value) return

    void playback.playReference(keyTonic(keyIndex))
  }

  function playSelectedKey() {
    if (selectedKeyIndex.value === null) return

    void playback.playCadence(keyTonic(selectedKeyIndex.value))
  }

  function playTarget() {
    if (!currentTarget.value || !isSinging.value) return

    const midi = currentTarget.value.midi
    /* Hear it replaces the chord with a single note */
    chordUntilMs.value = 0
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

  /* Applies live — progress already held is kept and measured against the new length */
  function setHoldDuration(ms: number) {
    holdDurationMs.value = ms
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
    holdDurationMs: readonly(holdDurationMs),
    range: readonly(range),
    maxCentsDeviation,
    targets: readonly(targets),
    currentTargetIndex: readonly(currentTargetIndex),
    currentTarget,
    currentKeyIndex,
    hopDirection,
    nextKeyIndex,
    walkStartMidi,
    litKeyIndices: readonly(litKeyIndices),
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
    chordMidis: readonly(chordMidis),
    isChordRinging,
    isSingingCorrectNote,
    sungMidi: readonly(sungMidi),
    sungCents,
    isListening,
    error,
    isPlayingSequence: playback.isPlayingSequence,
    currentChordIndex: playback.currentChordIndex,
    startWalk,
    startPattern,
    stop,
    selectKey,
    playKeyTone,
    playSelectedKey,
    playTarget,
    setDirection,
    setRange,
    setDifficulty,
    setHoldDuration,
  }
}
