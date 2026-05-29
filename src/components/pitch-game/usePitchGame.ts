import { useMachine } from '@xstate/vue'
import type { VoiceRange } from '@/constants/voiceRanges'
import type { NoteInfo } from '@/utils/noteUtils'
import type { Ref } from 'vue'

import { GAME_PICKUP_LINE_RATIO, HISTORY_WINDOW_MS } from './pitchConstants'
import { pitchGameMachine, type PitchGamePhase } from './pitchGameMachine'

export type GameTargetStatus = 'pending' | 'hit' | 'missed'

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
  voiceRangeLabelKey: string
  voiceRangeNoteRange: string
  /* How the round ended — 'natural' when the timer elapsed or every target
   * resolved, 'manual' when the player hit Stop. Drives whether the Display
   * celebrates with confetti. */
  endReason: 'natural' | 'manual'
}

type UseGameOptions = {
  noteInfo: Ref<NoteInfo | null>
  isClean: Ref<boolean>
  midiMin: Ref<number>
  midiMax: Ref<number>
  voiceRange: Ref<VoiceRange>
  holdDurationMs: Ref<number>
  gameDurationMs: Ref<number>
  onHit?: (target: GameTarget) => void
  onEnd?: () => void
}

export const DEFAULT_GAME_DURATION_MS = 10_000
export const HIT_TOLERANCE_CENTS = 50
/* Time a target spends approaching from the live edge before it crosses the
 * pickup line and becomes capturable. Derived from GAME_PICKUP_LINE_RATIO so
 * the visual line and the hit-detection window stay locked together. */
export const LEAD_IN_MS = HISTORY_WINDOW_MS * (1 - GAME_PICKUP_LINE_RATIO)
/* Minimum gap between two consecutive target dueTimes. A singer can only
 * sing one note at a time, so two targets must not land at the exact same
 * moment — 100 ms is enough separation to keep them visually distinct. */
const MIN_TARGET_GAP_MS = 100

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/* Random int in [min, max] that is never `exclude`, so the game never shows
 * the same note on two consecutive targets. Falls back to the single available
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

export type GameState = 'idle' | 'playing' | 'complete'

export function useGame(options: UseGameOptions) {
  const targets = ref<GameTarget[]>([])
  const score = ref(0)
  const summary = ref<GameSummary | null>(null)
  const gameStartTime = ref<number | null>(null)
  const elapsedMs = ref(0)

  /* The single source of truth for the round lifecycle. Side-effects (mic via
   * onEnd, RAF tick, end timer, confetti) live in the imperative wrappers
   * below and in the Display's watchers, not in the machine — it stays pure. */
  const { snapshot, send } = useMachine(pitchGameMachine)
  const phase = computed<PitchGamePhase>(
    () => snapshot.value.value as PitchGamePhase,
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

    const now = performance.now()
    gameStartTime.value = now

    /* Half a target per second of game duration — same rule as before. */
    const targetCount = Math.max(
      1,
      Math.floor(currentGameDurationMs / 1000 / 2),
    )

    /* Cap the latest offset so the last possible hit (the end of the pickup
     * zone) lands at or before currentGameDurationMs — keeps the displayed
     * elapsed time bounded by the configured game length. */
    const maxOffset = Math.max(
      0,
      currentGameDurationMs - LEAD_IN_MS - HISTORY_WINDOW_MS,
    )

    const generated: GameTarget[] = []
    for (let i = 0; i < targetCount; i++) {
      /* First target enters the chart at game start so the playing panel
       * isn't empty. Remaining targets stay random within the safe window. */
      const offset = i === 0 ? 0 : Math.random() * maxOffset
      /* midi assigned after the sort below, in time order, so the
       * no-immediate-repeat rule applies to the order the player hears. */
      generated.push({
        id: i,
        midi: 0,
        dueTime: now + LEAD_IN_MS + offset,
        status: 'pending',
      })
    }
    generated.sort((a, b) => a.dueTime - b.dueTime)

    /* Enforce a minimum gap so two targets never share a dueTime. Walking in
     * order and bumping forward preserves the randomness of the earlier
     * targets while guaranteeing no visual pile-up. */
    for (let i = 1; i < generated.length; i++) {
      const minDueTime = generated[i - 1].dueTime + MIN_TARGET_GAP_MS
      if (generated[i].dueTime < minDueTime) {
        generated[i].dueTime = minDueTime
      }
    }

    /* Assign notes in time order so no two consecutive targets repeat. */
    let previousMidi: number | null = null
    for (const target of generated) {
      const midi: number =
        previousMidi === null
          ? randomInt(options.midiMin.value, options.midiMax.value)
          : randomIntExcluding(
              options.midiMin.value,
              options.midiMax.value,
              previousMidi,
            )
      target.midi = midi
      previousMidi = midi
    }
    targets.value = generated

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
      if (centsDiff <= HIT_TOLERANCE_CENTS) {
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
    startGame,
    stopGame,
    reset,
  }
}
