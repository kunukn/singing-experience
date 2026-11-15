import { useMachine } from '@xstate/vue'
import type { Difficulty } from '@/constants/difficulty'
import type { VoiceRange } from '@/constants/voiceRanges'
import type { NoteInfo } from '@/utils/noteUtils'
import type { Ref } from 'vue'

import { GAME_PICKUP_LINE_RATIO, HISTORY_WINDOW_MS } from './noteRushConstants'
import { noteRushMachine, type NoteRushPhase } from './noteRushMachine'
import {
  DEFAULT_DIFFICULTY,
  DIFFICULTY_HIT_TOLERANCE_CENTS,
  generateTargetSchedule,
} from './noteRushTargets'

export type GameTargetStatus = 'pending' | 'hit' | 'missed'

export type GameTarget = {
  id: number
  midi: number
  dueTime: number
  status: GameTargetStatus
}

export type GameSummary = {
  durationMs: number
  difficulty: Difficulty
  score: number
  totalTargets: number
  voiceRangeLabelKey: string
  voiceRangeNoteRange: string
  /* How the round ended — 'natural' when the timer elapsed or every target
   * resolved, 'manual' when the player hit Stop. Drives whether the Display
   * celebrates with confetti. */
  endReason: 'natural' | 'manual'
}

type UseNoteRushOptions = {
  noteInfo: Ref<NoteInfo | null>
  isClean: Ref<boolean>
  midiMin: Ref<number>
  midiMax: Ref<number>
  voiceRange: Ref<VoiceRange>
  holdDurationMs: Ref<number>
  gameDurationMs: Ref<number>
  difficulty: Ref<Difficulty>
  onHit?: (target: GameTarget) => void
  onEnd?: () => void
}

export const DEFAULT_GAME_DURATION_MS = 10_000
/* Time a target spends approaching from the live edge before it crosses the
 * pickup line and becomes capturable. Derived from GAME_PICKUP_LINE_RATIO so
 * the visual line and the hit-detection window stay locked together. */
export const LEAD_IN_MS = HISTORY_WINDOW_MS * (1 - GAME_PICKUP_LINE_RATIO)

export type GameState = 'idle' | 'playing' | 'complete'

export function useNoteRush(options: UseNoteRushOptions) {
  const targets = ref<GameTarget[]>([])
  const score = ref(0)
  const summary = ref<GameSummary | null>(null)
  const gameStartTime = ref<number | null>(null)
  const elapsedMs = ref(0)
  /* Set when a round starts, so the chart snaps the dot at the same distance
   * the round scores at. */
  const hitToleranceCents = ref(
    DIFFICULTY_HIT_TOLERANCE_CENTS[DEFAULT_DIFFICULTY],
  )

  /* The single source of truth for the round lifecycle. Side-effects (mic via
   * onEnd, RAF tick, end timer, confetti) live in the imperative wrappers
   * below and in the Display's watchers, not in the machine — it stays pure. */
  const { snapshot, send } = useMachine(noteRushMachine)
  const phase = computed<NoteRushPhase>(
    () => snapshot.value.value as NoteRushPhase,
  )
  const gameState = phase
  const isIdle = computed(() => phase.value === 'idle')
  const isPlaying = computed(() => phase.value === 'playing')
  const isComplete = computed(() => phase.value === 'complete')

  let endTimer: ReturnType<typeof setTimeout> | null = null
  let elapsedFrameId: number | null = null

  /* Per-run snapshots — locked in at startGame() so mid-game setting changes
   * don't disturb the current round. */
  let currentGameDurationMs = DEFAULT_GAME_DURATION_MS
  let currentHoldDurationMs = 50
  let currentDifficulty: Difficulty = DEFAULT_DIFFICULTY

  /* Per-target accumulated on-pitch time within the pickup zone. Forgiving:
   * persists across frames so a brief drift doesn't reset progress. */
  const holdProgress = new Map<number, number>()
  let lastWatchTime: number | null = null

  function clearEndTimer() {
    if (endTimer !== null) {
      clearTimeout(endTimer)
      endTimer = null
    }
  }

  function stopElapsedTicker() {
    if (elapsedFrameId !== null) {
      cancelAnimationFrame(elapsedFrameId)
      elapsedFrameId = null
    }
  }

  function startElapsedTicker() {
    stopElapsedTicker()
    const tick = () => {
      if (gameStartTime.value === null) return

      const now = performance.now()
      elapsedMs.value = now - gameStartTime.value

      /* Sweep stale targets so the early-end check below can fire even when
       * the player stops singing after the last pickup window. */
      for (const target of targets.value) {
        if (
          target.status === 'pending' &&
          now > target.dueTime + HISTORY_WINDOW_MS
        ) {
          target.status = 'missed'
        }
      }

      if (
        isPlaying.value &&
        targets.value.length > 0 &&
        targets.value.every((t) => t.status !== 'pending')
      ) {
        stopGame()
        return
      }

      elapsedFrameId = requestAnimationFrame(tick)
    }
    elapsedFrameId = requestAnimationFrame(tick)
  }

  function startGame() {
    reset()

    currentGameDurationMs = options.gameDurationMs.value
    currentHoldDurationMs = options.holdDurationMs.value
    currentDifficulty = options.difficulty.value
    hitToleranceCents.value = DIFFICULTY_HIT_TOLERANCE_CENTS[currentDifficulty]

    const now = performance.now()
    gameStartTime.value = now

    /* Cap the latest offset so the last possible hit (the end of the pickup
     * zone) lands at or before currentGameDurationMs — keeps the displayed
     * elapsed time bounded by the configured game length. */
    const maxOffset = Math.max(
      0,
      currentGameDurationMs - LEAD_IN_MS - HISTORY_WINDOW_MS,
    )

    targets.value = generateTargetSchedule({
      durationMs: currentGameDurationMs,
      maxOffsetMs: maxOffset,
      difficulty: currentDifficulty,
      midiMin: options.midiMin.value,
      midiMax: options.midiMax.value,
    }).map(({ offsetMs, midi }, index): GameTarget => ({
      id: index,
      midi,
      dueTime: now + LEAD_IN_MS + offsetMs,
      status: 'pending',
    }))

    elapsedMs.value = 0
    /* reset() above sent RESET → idle; START enters 'playing'. */
    send({ type: 'START' })
    startElapsedTicker()

    /* End after: lead-in + game duration + half-window so the last target has
     * time to traverse the pickup zone before the summary appears. */
    const totalMs = LEAD_IN_MS + currentGameDurationMs + HISTORY_WINDOW_MS / 2
    endTimer = setTimeout(() => {
      endTimer = null
      stopGame()
    }, totalMs)
  }

  function stopGame(reason: GameSummary['endReason'] = 'natural') {
    /* The machine is the sole exit from 'playing', so this guard makes a
     * double call (Stop + end-timer, or all-resolved + Stop) a structural
     * no-op without an extra flag. */
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
      difficulty: currentDifficulty,
      score: score.value,
      totalTargets: targets.value.length,
      voiceRangeLabelKey: options.voiceRange.value.labelKey,
      voiceRangeNoteRange: options.voiceRange.value.noteRange,
      endReason: reason,
    }

    /* summary set above, before the state flips, so a watch(gameState) seeing
     * 'complete' already has the summary; onEnd last, matching the old order. */
    send({ type: 'COMPLETE' })
    options.onEnd?.()
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
    lastWatchTime = null
    send({ type: 'RESET' })
  }

  watch(options.noteInfo, (info) => {
    if (!isPlaying.value) return
    if (!info || !options.isClean.value) return
    if (info.frequency <= 0) return

    const singerMidi = 12 * Math.log2(info.frequency / 440) + 69
    const now = performance.now()
    const delta = lastWatchTime === null ? 0 : Math.max(0, now - lastWatchTime)
    lastWatchTime = now

    for (const target of targets.value) {
      if (target.status !== 'pending') continue

      const inPickupZone =
        now >= target.dueTime + LEAD_IN_MS &&
        now <= target.dueTime + HISTORY_WINDOW_MS

      if (!inPickupZone) {
        if (now > target.dueTime + HISTORY_WINDOW_MS) {
          target.status = 'missed'
        }
        continue
      }

      const centsDiff = Math.abs(singerMidi - target.midi) * 100
      if (centsDiff <= hitToleranceCents.value) {
        const accumulated = (holdProgress.get(target.id) ?? 0) + delta
        holdProgress.set(target.id, accumulated)
        if (accumulated >= currentHoldDurationMs) {
          target.status = 'hit'
          score.value += 1
          options.onHit?.(target)
        }
      }
    }
  })

  onUnmounted(() => {
    clearEndTimer()
    stopElapsedTicker()
  })

  return {
    targets,
    score,
    phase,
    isIdle,
    isPlaying,
    isComplete,
    summary,
    gameState,
    elapsedMs,
    hitToleranceCents,
    startGame,
    stopGame,
    reset,
  }
}
