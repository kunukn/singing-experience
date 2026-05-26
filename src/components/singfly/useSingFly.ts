import { useMachine } from '@xstate/vue'
import type { Ref } from 'vue'
import type { VoiceRange } from '@/constants/voiceRanges'
import type { NoteInfo } from '@/utils/noteUtils'
import { frequencyToMidi } from '@/utils/noteUtils'

import {
  singFlyMachine,
  type CrashCause,
  type SingFlyPhase,
} from './singFlyMachine'
import {
  DIFFICULTY_GAP_HALF_SEMITONES,
  DIFFICULTY_MAX_NOTE_STEP_SEMITONES,
  DIFFICULTY_PIPE_INTERVAL_MS,
  GAME_PICKUP_LINE_RATIO,
  HISTORY_WINDOW_MS,
} from './singFlyConstants'
import { createCrashGuard } from './singFlyCrashGuard'
import {
  findCollidingTarget,
  isOutOfRange,
  isPitchInGap,
} from './singFlyGeometry'
import { DEFAULT_DIFFICULTY, type Difficulty } from './singFlyOptions'

/* 'missed' = unresolved when the round ended (scrolled past, or bulk-marked
 * by stopGame) — renders green like a pending pillar. 'crashed' = the single
 * pillar the bird actually flew into, the cause of death — the only red one. */
export type GameTargetStatus = 'pending' | 'hit' | 'missed' | 'crashed'

export type GameTarget = {
  id: number
  midi: number
  dueTime: number
  status: GameTargetStatus
}

export type GameSummary = {
  durationMs: number
  score: number
  totalTargets: number
  difficulty: Difficulty
  voiceRangeLabelKey: string
  voiceRangeNoteRange: string
}

type UseSingFlyOptions = {
  noteInfo: Ref<NoteInfo | null>
  isClean: Ref<boolean>
  midiMin: Ref<number>
  midiMax: Ref<number>
  voiceRange: Ref<VoiceRange>
  gameDurationMs: Ref<number>
  difficulty: Ref<Difficulty>
  /* Live canvas size (CSS px) and direction — collision is computed against
   * the exact pixel rectangles the canvas draws, so it needs the same
   * dimensions. 0 size (not yet measured) means no collision is possible. */
  canvasWidth: Ref<number>
  canvasHeight: Ref<number>
  isRtl: Ref<boolean>
  /* When true at startGame(), the game runs without its own RAF clock —
   * elapsedMs is driven externally via setElapsedMs (used by the test page). */
  manualClock?: Ref<boolean>
}

const DEFAULT_GAME_DURATION_MS = 10_000
/* Time a target spends approaching from the live edge before it crosses the
 * pickup line and becomes capturable. Derived from GAME_PICKUP_LINE_RATIO so
 * the visual line and the hit-detection window stay locked together. */
const LEAD_IN_MS = HISTORY_WINDOW_MS * (1 - GAME_PICKUP_LINE_RATIO)

/* Random timing jitter applied to each pipe (except the first) so the field
 * doesn't feel mechanically uniform. ±150 ms is well under every
 * DIFFICULTY_PIPE_INTERVAL_MS value so pipes never visually collide. */
const PIPE_JITTER_MS = 150
/* Minimum on-pitch time inside the pickup zone before a pipe counts as hit.
 * Just enough to filter out a single noisy detection frame; not user-facing. */
const HIT_STABILITY_MS = 50
/* Continuous time the bird must stay inside a pipe wall before the round ends.
 * The stabilized pitch can still carry a short few-semitone fluke (~50ms) that
 * the median lets through; requiring sustained overlap means such a blip can't
 * crash the bird while a genuinely off-pitch hold still does. Crash-side
 * analogue of HIT_STABILITY_MS — sized to also absorb the median's recovery
 * lag after the spike ends. */
const CRASH_GRACE_MS = 100

/* Sentinel "wall id" fed to the boundary crash guard when the bird is out of
 * range. Real target ids are 0..n, so -1 can never collide with a pipe id. */
const BOUNDARY_WALL_ID = -1

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/* Random int in [min, max] that is never `exclude`, so the game never shows
 * the same note on two consecutive pipes. Falls back to the single available
 * value when the range collapses to one semitone (a repeat is unavoidable
 * then — doesn't happen with real voice ranges, all span ≥12 semitones). */
function randomIntExcluding(min: number, max: number, exclude: number): number {
  if (min >= max) return min

  let value = randomInt(min, max)
  while (value === exclude) {
    value = randomInt(min, max)
  }
  return value
}

/* Pick the next pipe's note: random in [min, max], never `previous`, and no
 * more than maxStep semitones from `previous`. maxStep === Infinity widens
 * the window back to the full range (normal/hard — unchanged behavior). */
function randomMidiStep(
  min: number,
  max: number,
  previous: number | null,
  maxStep: number,
): number {
  if (previous === null) return randomInt(min, max)

  const lo = Math.max(min, previous - maxStep)
  const hi = Math.min(max, previous + maxStep)
  return randomIntExcluding(lo, hi, previous)
}

/* Back-compat projection of the machine phase for the panel `v-if`,
 * defineExpose and the test page. crashed/won both read as 'complete'. */
export type GameState = 'idle' | 'playing' | 'complete'

export function useSingFly(options: UseSingFlyOptions) {
  const targets = ref<GameTarget[]>([])
  const score = ref(0)
  const summary = ref<GameSummary | null>(null)
  const gameStartTime = ref<number | null>(null)
  const elapsedMs = ref(0)

  /* The single source of truth for the round lifecycle. Side-effects live in
   * watch(phase) handlers in the Display/Canvas, not here. */
  const { snapshot, send } = useMachine(singFlyMachine)
  const phase = computed<SingFlyPhase>(
    () => snapshot.value.value as SingFlyPhase,
  )
  const crashCause = computed<CrashCause | null>(
    () => snapshot.value.context.crashCause,
  )
  const isIdle = computed(() => phase.value === 'idle')
  const isPlaying = computed(() => phase.value === 'playing')
  const isCrashed = computed(() => phase.value === 'crashed')
  const isWon = computed(() => phase.value === 'won')
  const isEnded = computed(() => isCrashed.value || isWon.value)

  const gameState = computed<GameState>(() =>
    phase.value === 'idle'
      ? 'idle'
      : phase.value === 'playing'
        ? 'playing'
        : 'complete',
  )

  let endTimer: ReturnType<typeof setTimeout> | null = null
  let elapsedFrameId: number | null = null

  /* Per-run snapshot — locked in at startGame() so a mid-game change to the
   * game-duration setting doesn't disturb the current round. */
  let currentGameDurationMs = DEFAULT_GAME_DURATION_MS
  let currentManualClock = false
  let currentDifficulty: Difficulty = DEFAULT_DIFFICULTY
  let currentPipeIntervalMs = DIFFICULTY_PIPE_INTERVAL_MS[DEFAULT_DIFFICULTY]
  let currentMaxNoteStep =
    DIFFICULTY_MAX_NOTE_STEP_SEMITONES[DEFAULT_DIFFICULTY]
  let currentGapHalfSemitones =
    DIFFICULTY_GAP_HALF_SEMITONES[DEFAULT_DIFFICULTY]

  /* Per-target accumulated on-pitch time within the pickup zone. */
  const holdProgress = new Map<number, number>()

  /* Debounces wall crashes so a brief pitch fluke can't end the round. */
  const crashGuard = createCrashGuard(CRASH_GRACE_MS)

  /* Same debounce for the ceiling/floor: an octave/fifth spike that briefly
   * lands out of range can't instant-kill — only a sustained out-of-range hold
   * crashes the bird into the wall. */
  const boundaryGuard = createCrashGuard(CRASH_GRACE_MS)

  /* Shared time anchor for the hold and crash accumulators — advanced by
   * whichever clock drives evaluate(): the RAF ticker in real-time play, the
   * detection watcher under the manual test-page clock. */
  let lastEvalTime: number | null = null

  function clearEndTimer() {
    if (endTimer !== null) {
      clearTimeout(endTimer)
      endTimer = null
    }
  }

  /* The single bird every game decision (scoring + collision) reads: the
   * pitch-bird position (useBirdMotion's smoothNoteInfo, passed in as
   * options.noteInfo). It is always present while playing — easing toward the
   * sung note, or holding its last position on silence (no gravity) — so
   * "what you see is what you hit" holds with no held-note bookkeeping. null
   * only on an unmeasured frame. */
  function resolveBirdMidi(): number | null {
    const info = options.noteInfo.value
    if (!info || info.frequency <= 0) return null

    return frequencyToMidi(info.frequency)
  }

  /* Current game time. Under the test page's manual scrub clock the slider is
   * the time source (gameStartTime + elapsedMs); otherwise it's the real wall
   * clock. Hit/miss/collision all read time through here so real-time play
   * and slider scrubbing stay consistent. */
  function resolveNow(): number {
    return currentManualClock && gameStartTime.value !== null
      ? gameStartTime.value + elapsedMs.value
      : performance.now()
  }

  /* A pipe scrolling past unhit (or a wall crash) ends the round only in
   * real-time play. Under the manual scrub clock the user is exploring the
   * field, so the pipe is just marked missed and the round keeps going. */
  function shouldAutoEndRound(): boolean {
    return !currentManualClock
  }

  /* Crash test: a pipe column is horizontally over the bird AND the bird's
   * pitch is outside that pipe's gap (the same isPitchInGap the scoring gate
   * passes on — one source of truth). On silence the bird holds its last
   * position (no gravity), so a brief dropout never moves it into a wall;
   * only an actually off-pitch sung note crashes it (debounced by
   * CRASH_GRACE_MS). */
  function collidingTargetId(now: number): number | null {
    return findCollidingTarget({
      targets: targets.value,
      birdMidi: resolveBirdMidi(),
      now,
      width: options.canvasWidth.value,
      height: options.canvasHeight.value,
      isRtl: options.isRtl.value,
      midiMin: options.midiMin.value,
      midiMax: options.midiMax.value,
      gapHalfSemitones: currentGapHalfSemitones,
    })
  }

  function stopElapsedTicker() {
    if (elapsedFrameId !== null) {
      cancelAnimationFrame(elapsedFrameId)
      elapsedFrameId = null
    }
  }

  /* The single time-driven sweep for scoring, crashing and round-end. Reads
   * the pitch bird (resolveBirdMidi) for both the score gate and the crash
   * test so the game always agrees with the visible bird. Returns true when
   * the round has ended so the caller stops its clock.
   *
   * Death is exactly: the bird's pitch is outside a pipe's gap while that
   * column is over it (sustained CRASH_GRACE_MS), or a sung pitch is past the
   * range into the lethal floor/ceiling. A player who never sings just holds
   * on the perch (no gravity); each pipe scrolls past as a miss and the round
   * ends once every pipe is resolved (or the end-timer fires). */
  function evaluate(now: number, tickDeltaMs: number): boolean {
    const birdMidi = resolveBirdMidi()

    for (const target of targets.value) {
      if (target.status !== 'pending') continue

      /* Scrolled fully past unresolved → just a miss; the round ends via a
       * crash, the boundary, or every pipe being resolved. A silent player's
       * pipes all become misses and the round ends when none stay pending. */
      if (now > target.dueTime + HISTORY_WINDOW_MS) {
        target.status = 'missed'
        continue
      }

      const inPickupZone =
        now >= target.dueTime + LEAD_IN_MS &&
        now <= target.dueTime + HISTORY_WINDOW_MS
      if (!inPickupZone) continue

      /* Same predicate the collision test negates and the renderer sizes the
       * gap from — scoring "pass" and "didn't crash" are one boolean, so what
       * you see is exactly what you hit at any canvas size or voice range.
       * Held-note fallback means a brief dropout in the gap still accrues. */
      if (
        birdMidi !== null &&
        isPitchInGap(birdMidi, target.midi, currentGapHalfSemitones)
      ) {
        const accumulated = (holdProgress.get(target.id) ?? 0) + tickDeltaMs
        holdProgress.set(target.id, accumulated)
        if (accumulated >= HIT_STABILITY_MS) {
          target.status = 'hit'
          score.value += 1
        }
      }
    }

    /* Wall crash, debounced: the stabilized pitch can still carry a brief
     * few-semitone fluke that the median lets through in ~50ms, so require
     * CRASH_GRACE_MS of *continuous* overlap. Leaving the wall (or moving to a
     * different pipe) resets the guard, so only an uninterrupted off-pitch
     * overlap ends the round — a blip just dips the bird and recovers. */
    const hitWallId = collidingTargetId(now)
    if (crashGuard.update(hitWallId, tickDeltaMs)) {
      const target = targets.value.find(
        (candidate) => candidate.id === hitWallId,
      )
      if (target && target.status === 'pending') {
        target.status = 'crashed'
        debugLog('[SingFly] crash: pipe', {
          pipeId: target.id,
          gapMidi: target.midi,
          birdMidi,
          gapHalfSemitones: currentGapHalfSemitones,
          elapsedMs: elapsedMs.value,
        })
        if (shouldAutoEndRound()) {
          stopGame({ kind: 'pipe', pipeId: target.id })
          return true
        }
      }
    }

    /* Boundary crash: pitch outside the selected range (± tolerance), sustained
     * CRASH_GRACE_MS — same debounce a pipe wall gets, so an octave/fifth fluke
     * can't instant-kill. Ends the round only in real-time play; on the test
     * page (manual clock) shouldAutoEndRound() is false so it just surfaces via
     * the hitbox overlay, exactly matching the wall-crash branch. */
    const outOfRange =
      birdMidi !== null &&
      isOutOfRange(
        birdMidi,
        options.midiMin.value,
        options.midiMax.value,
        currentGapHalfSemitones,
      )
    if (
      boundaryGuard.update(outOfRange ? BOUNDARY_WALL_ID : null, tickDeltaMs)
    ) {
      /* Below midiMin = fell into the floor; otherwise rose into the ceiling.
       * birdMidi is non-null here — outOfRange required it for the guard to
       * receive BOUNDARY_WALL_ID. */
      const side: 'floor' | 'ceiling' =
        birdMidi !== null && birdMidi < options.midiMin.value
          ? 'floor'
          : 'ceiling'
      debugLog('[SingFly] crash: boundary', {
        side,
        birdMidi,
        midiMin: options.midiMin.value,
        midiMax: options.midiMax.value,
        gapHalfSemitones: currentGapHalfSemitones,
        elapsedMs: elapsedMs.value,
      })
      if (shouldAutoEndRound()) {
        stopGame({ kind: 'boundary', side })
        return true
      }
    }

    /* Early end once every pipe has been resolved (all hit). */
    if (
      isPlaying.value &&
      targets.value.length > 0 &&
      targets.value.every((t) => t.status !== 'pending')
    ) {
      stopGame()
      return true
    }

    return false
  }

  function startElapsedTicker() {
    stopElapsedTicker()
    const tick = () => {
      if (gameStartTime.value === null) return

      const now = performance.now()
      elapsedMs.value = now - gameStartTime.value
      const tickDelta =
        lastEvalTime === null ? 0 : Math.max(0, now - lastEvalTime)
      lastEvalTime = now

      if (evaluate(now, tickDelta)) return

      elapsedFrameId = requestAnimationFrame(tick)
    }
    elapsedFrameId = requestAnimationFrame(tick)
  }

  function startGame() {
    reset()

    currentGameDurationMs = options.gameDurationMs.value
    currentManualClock = options.manualClock?.value ?? false
    currentDifficulty = options.difficulty.value
    currentPipeIntervalMs =
      DIFFICULTY_PIPE_INTERVAL_MS[options.difficulty.value]
    currentMaxNoteStep =
      DIFFICULTY_MAX_NOTE_STEP_SEMITONES[options.difficulty.value]
    currentGapHalfSemitones =
      DIFFICULTY_GAP_HALF_SEMITONES[options.difficulty.value]

    const now = performance.now()
    gameStartTime.value = now

    /* Pre-generate the full playing field. Even spacing every
     * currentPipeIntervalMs (difficulty-derived) with small jitter, so the
     * chosen game duration and difficulty together determine pipe count. */
    const playableMs = Math.max(0, currentGameDurationMs - LEAD_IN_MS)
    /* +1 so the LAST pipe's pickup-line crossing lands at ~currentGameDurationMs:
     * a pipe is hittable LEAD_IN_MS after spawn, and the round ends the instant
     * every pipe is resolved, so without the +1 the last pipe (and the win)
     * lands a full pipeInterval + LEAD_IN_MS early. floor keeps the realized
     * win time at or just under the picked duration, never over. */
    const targetCount = Math.max(
      1,
      Math.floor(playableMs / currentPipeIntervalMs) + 1,
    )

    const generated: GameTarget[] = []
    let previousMidi: number | null = null
    for (let i = 0; i < targetCount; i++) {
      const baseTime = now + i * currentPipeIntervalMs
      /* Skip jitter on the first pipe so it spawns cleanly at the right edge. */
      const jitter = i === 0 ? 0 : (Math.random() * 2 - 1) * PIPE_JITTER_MS
      const midi: number = randomMidiStep(
        options.midiMin.value,
        options.midiMax.value,
        previousMidi,
        currentMaxNoteStep,
      )
      previousMidi = midi
      generated.push({
        id: i,
        midi,
        dueTime: baseTime + jitter,
        status: 'pending',
      })
    }
    targets.value = generated

    elapsedMs.value = 0
    /* reset() above sent RESET → idle; START enters 'playing' (entry action
     * clears any previous crashCause). */
    send({ type: 'START' })

    /* Manual-clock mode (test page): skip the real-time RAF tick and the
     * natural-end timer. The driver controls elapsedMs via setElapsedMs and
     * decides when to stop. */
    if (currentManualClock) return

    startElapsedTicker()

    /* End naturally just after the last pipe traverses the chart. The 250 ms
     * tail buys time for the last hit/miss decision to paint. */
    const lastDueTime = generated[generated.length - 1].dueTime
    const totalMs = lastDueTime - now + HISTORY_WINDOW_MS + 250
    endTimer = setTimeout(() => {
      endTimer = null
      stopGame()
    }, totalMs)
  }

  /* Finalize the round. `cause` is the lethal hit when called from a crash
   * branch; omitted for a natural end (the end-timer or every pipe resolved),
   * where the outcome is won (all scored) or incomplete (ran out unhit). The
   * machine is the sole exit from 'playing', so this guard makes a double call
   * a no-op without an extra flag. */
  function stopGame(cause?: CrashCause) {
    if (snapshot.value.value !== 'playing') return

    clearEndTimer()
    stopElapsedTicker()

    if (gameStartTime.value !== null) {
      elapsedMs.value = performance.now() - gameStartTime.value
    }

    for (const target of targets.value) {
      if (target.status === 'pending') target.status = 'missed'
    }

    summary.value = {
      durationMs: currentGameDurationMs,
      score: score.value,
      totalTargets: targets.value.length,
      difficulty: currentDifficulty,
      voiceRangeLabelKey: options.voiceRange.value.labelKey,
      voiceRangeNoteRange: options.voiceRange.value.noteRange,
    }

    if (cause) {
      send({ type: 'CRASH', cause })
    } else if (
      targets.value.length > 0 &&
      score.value === targets.value.length
    ) {
      send({ type: 'WON' })
    } else {
      send({ type: 'CRASH', cause: { kind: 'incomplete' } })
    }
  }

  /* Test/debug helper: shift the perceived game clock so elapsedMs becomes
   * targetMs. Moves both gameStartTime and every target.dueTime by the same
   * delta so pipe positions stay self-consistent. In real-time mode the next
   * RAF frame will overwrite elapsedMs, so this is a one-shot nudge. In
   * manual-clock mode there is no ticker, so we also set elapsedMs.value
   * directly — the slider IS the time source. */
  function setElapsedMs(targetMs: number) {
    if (gameStartTime.value === null) return

    const currentElapsed = performance.now() - gameStartTime.value
    const deltaMs = targetMs - currentElapsed
    gameStartTime.value -= deltaMs
    for (const target of targets.value) {
      target.dueTime -= deltaMs
    }
    elapsedMs.value = targetMs

    /* Manual-clock mode has no RAF ticker, so collision/miss won't be detected
     * unless the noteInfo watcher happens to fire. Run the sweep against the
     * new virtual now so scrubbing the slider reveals collisions at the exact
     * moment they would occur — but stay debug-friendly: mark and continue,
     * don't stopGame(). The CRASH_GRACE_MS debounce is intentionally NOT
     * applied here: the test page is meant to surface raw overlap for tuning,
     * and the slider has no real per-frame delta to accumulate. */
    if (!currentManualClock) return

    const virtualNow = resolveNow()
    const hitWallId = collidingTargetId(virtualNow)
    for (const target of targets.value) {
      if (target.status !== 'pending') continue

      if (target.id === hitWallId) {
        target.status = 'crashed'
      } else if (virtualNow > target.dueTime + HISTORY_WINDOW_MS) {
        target.status = 'missed'
      }
    }
  }

  function reset() {
    clearEndTimer()
    stopElapsedTicker()
    targets.value = []
    score.value = 0
    summary.value = null
    gameStartTime.value = null
    elapsedMs.value = 0
    holdProgress.clear()
    crashGuard.reset()
    boundaryGuard.reset()
    send({ type: 'RESET' })
    lastEvalTime = null
  }

  /* The pitch bird (smoothNoteInfo) updates every frame it moves. In
   * real-time the RAF ticker owns evaluate(); under the manual test clock
   * there is no ticker, so this watcher drives the same evaluate() whenever
   * the bird position changes (no second accumulator → no double counting). */
  watch(options.noteInfo, () => {
    if (!isPlaying.value || !currentManualClock) return

    const now = resolveNow()
    const delta = lastEvalTime === null ? 0 : Math.max(0, now - lastEvalTime)
    lastEvalTime = now
    evaluate(now, delta)
  })

  onUnmounted(() => {
    clearEndTimer()
    stopElapsedTicker()
  })

  return {
    targets,
    score,
    summary,
    phase,
    crashCause,
    isIdle,
    isPlaying,
    isCrashed,
    isWon,
    isEnded,
    gameState,
    elapsedMs,
    gameStartTime,
    startGame,
    stopGame,
    reset,
    setElapsedMs,
  }
}
