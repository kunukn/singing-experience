import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { h } from 'vue'
import type { Difficulty } from '@/constants/difficulty'
import type { VoiceRange } from '@/constants/voiceRanges'
import type { NoteInfo } from '@/utils/noteUtils'
import { frequencyToNote, midiToFrequency } from '@/utils/noteUtils'
import {
  DIFFICULTY_PIPE_INTERVAL_MS,
  HISTORY_WINDOW_MS,
} from './singFlyConstants'
import { computeGeometry, isPipeOverBird } from './singFlyGeometry'
import { GAME_DURATION_OPTIONS, type GameDurationSec } from './singFlyOptions'
import { useSingFly } from './useSingFly'

/* useSingFly owns an XState actor via @xstate/vue's useMachine, which starts
 * the actor in onMounted — so the composable must run inside a mounted
 * component. All cases use manualClock so startGame() takes the deterministic
 * path (no RAF / end-timer) and the test drives transitions directly, exactly
 * like the scrub test page. The real-time collision math is covered by
 * singFlyGeometry / singFlyCrashGuard tests; the FSM graph by
 * singFlyMachine.test.ts. Here we assert the useSingFly ↔ machine contract. */

const RANGE: VoiceRange = {
  labelKey: 'voiceRanges.test',
  noteRange: 'C3–C5',
  midiMin: 48,
  midiMax: 72,
  group: 'easy',
}

type Api = ReturnType<typeof useSingFly>

const wrappers: { unmount: () => void }[] = []

/* px — the page column's full width (max-w-3xl), the widest the canvas gets */
const CANVAS_WIDTH = 768

/* A fresh object per call, as the real detector emits one per frame */
function noteAt(midi: number): NoteInfo {
  return { ...frequencyToNote(midiToFrequency(midi))! }
}

type Round = { difficulty: Difficulty; gameDurationMs: number }

const DEFAULT_ROUND: Round = { difficulty: 'easy', gameDurationMs: 10_000 }

function setup(
  noteInfo = ref<NoteInfo | null>(null),
  manualClock = true,
  canvasWidth = CANVAS_WIDTH,
  round = DEFAULT_ROUND,
) {
  let api!: Api
  const wrapper = mount({
    setup() {
      api = useSingFly({
        noteInfo,
        isClean: ref(true),
        midiMin: ref(RANGE.midiMin),
        midiMax: ref(RANGE.midiMax),
        voiceRange: ref(RANGE),
        gameDurationMs: ref(round.gameDurationMs),
        difficulty: ref(round.difficulty),
        canvasWidth: ref(canvasWidth),
        canvasHeight: ref(300),
        isRtl: ref(false),
        manualClock: ref(manualClock),
      })
      return () => h('div')
    },
  })
  wrappers.push(wrapper)
  return api
}

afterEach(() => {
  while (wrappers.length) wrappers.pop()!.unmount()
  vi.restoreAllMocks()
})

describe('useSingFly ↔ machine', () => {
  test('starts idle; gameState projects idle', () => {
    const api = setup()
    expect(api.phase.value).toBe('idle')
    expect(api.gameState.value).toBe('idle')
    expect(api.crashCause.value).toBeNull()
  })

  test('startGame → playing, builds targets, gameState "playing"', () => {
    const api = setup()
    api.startGame()
    expect(api.phase.value).toBe('playing')
    expect(api.gameState.value).toBe('playing')
    expect(api.targets.value.length).toBeGreaterThan(0)
  })

  test('stopGame(pipe cause) → crashed + cause + summary; gameState "complete"', () => {
    const api = setup()
    api.startGame()
    api.stopGame({ kind: 'pipe', pipeId: 0 })
    expect(api.phase.value).toBe('crashed')
    expect(api.crashCause.value).toEqual({ kind: 'pipe', pipeId: 0 })
    expect(api.gameState.value).toBe('complete')
    expect(api.summary.value).not.toBeNull()
  })

  test('stopGame(boundary cause) → crashed with side', () => {
    const api = setup()
    api.startGame()
    api.stopGame({ kind: 'boundary', side: 'ceiling' })
    expect(api.crashCause.value).toEqual({ kind: 'boundary', side: 'ceiling' })
  })

  test('stopGame() with no hits → crashed/incomplete (no won)', () => {
    const api = setup()
    api.startGame()
    api.stopGame()
    expect(api.phase.value).toBe('crashed')
    expect(api.crashCause.value).toEqual({ kind: 'incomplete' })
    expect(api.isWon.value).toBe(false)
  })

  test('a second stopGame is a no-op (machine is the sole exit)', () => {
    const api = setup()
    api.startGame()
    api.stopGame({ kind: 'pipe', pipeId: 1 })
    api.stopGame() // would otherwise re-resolve to incomplete
    expect(api.crashCause.value).toEqual({ kind: 'pipe', pipeId: 1 })
  })

  test('reset → idle, summary cleared', () => {
    const api = setup()
    api.startGame()
    api.stopGame({ kind: 'pipe', pipeId: 0 })
    api.reset()
    expect(api.phase.value).toBe('idle')
    expect(api.gameState.value).toBe('idle')
    expect(api.summary.value).toBeNull()
  })

  test('replay clears the previous crash cause on re-entering playing', () => {
    const api = setup()
    api.startGame()
    api.stopGame({ kind: 'pipe', pipeId: 0 })
    api.startGame()
    expect(api.phase.value).toBe('playing')
    expect(api.crashCause.value).toBeNull()
  })

  test('manual clock: scrubbing marks targets but never auto-ends the round', () => {
    const api = setup()
    api.startGame()
    /* Scrub far past every pipe's window; silent (noteInfo null) so no crash,
     * just misses. The test-page contract: mark & continue, no stopGame. */
    api.setElapsedMs(60_000)
    expect(api.phase.value).toBe('playing')
    expect(api.targets.value.every((t) => t.status !== 'pending')).toBe(true)
  })
})

/* Real-time rounds on a fake clock: requestAnimationFrame drives the game's
 * own ticker one 16ms frame at a time, exactly as in play, and the "singer"
 * decides its note each frame.
 *
 * Tradeoff: noteInfo is the bird itself here (no useBirdMotion), so the bird
 * is wherever the singer says, within one frame. The real bird eases about a
 * fifth of the way per frame, so it cannot make these 6-semitone jumps and
 * would spend longer in a wall than the timings below say. These rounds pin
 * what the game does with a given bird path: a pipe is a crash or a point,
 * decided by the time spent in its wall. How the real bird moves is covered
 * by useBirdMotion.test.ts. */
describe('useSingFly - flying a round', () => {
  const FRAME_MS = 16
  const geom = computeGeometry(CANVAS_WIDTH, false)

  /* ms after a pipe's dueTime at which its centre is on the bird: the middle
   * of the stretch its column is over the bird. */
  function findCentreAge(canvasWidth: number): number {
    const probe = { id: 0, midi: 60, dueTime: 0, status: 'pending' as const }
    const probeGeom = computeGeometry(canvasWidth, false)
    let first: number | null = null
    let last = 0
    for (let age = 0; age <= HISTORY_WINDOW_MS; age++) {
      if (!isPipeOverBird(probe, age, probeGeom)) continue

      first ??= age
      last = age
    }

    return (first! + last) / 2
  }
  const centreAge = findCentreAge(CANVAS_WIDTH)

  /* A note far outside the pipe's gap but inside the voice range */
  function awayFrom(midi: number): number {
    return midi + 6 <= RANGE.midiMax ? midi + 6 : midi - 6
  }

  type Singer = (target: { midi: number }, msAfterCentre: number) => number

  /* Plays until the round ends. Each frame the singer is asked what to sing
   * for the pipe that is next to be decided. */
  function playRound(
    singer: Singer,
    canvasWidth = CANVAS_WIDTH,
    round = DEFAULT_ROUND,
  ) {
    const noteInfo = ref<NoteInfo | null>(null)
    const api = setup(noteInfo, false, canvasWidth, round)
    const roundCentreAge = findCentreAge(canvasWidth)
    api.startGame()
    /* Twice the round's length is far more than any round needs */
    const giveUpAfterMs = round.gameDurationMs * 2
    for (let elapsed = 0; elapsed < giveUpAfterMs; elapsed += FRAME_MS) {
      if (api.phase.value !== 'playing') break

      const next = api.targets.value.find(
        (target) => target.status === 'pending',
      )
      if (next) {
        const msAfterCentre =
          performance.now() - (next.dueTime + roundCentreAge)
        noteInfo.value = noteAt(singer(next, msAfterCentre))
      }
      vi.advanceTimersByTime(FRAME_MS)
    }

    return api
  }

  beforeEach(() => {
    vi.useFakeTimers({
      toFake: [
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'setTimeout',
        'clearTimeout',
        'performance',
      ],
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('should win when every pipe is flown through', () => {
    const api = playRound((target) => target.midi)

    expect(api.phase.value).toBe('won')
    expect(api.score.value).toBe(api.targets.value.length)
    expect(api.targets.value.every((target) => target.status === 'hit')).toBe(
      true,
    )
  })

  /* The run that used to end as "Game over": the singer is in the gap as the
   * pipe arrives and moves on just after its centre has passed. Too little
   * time in the gap for the old hold timer, too little time in the wall to
   * crash — the pipe became a silent miss. */
  test('should win when the singer moves on just after each pipe centre', () => {
    const api = playRound((target, msAfterCentre) =>
      msAfterCentre < 60 ? target.midi : awayFrom(target.midi),
    )

    expect(api.phase.value).toBe('won')
    expect(api.score.value).toBe(api.targets.value.length)
  })

  test('should win when the singer is in each gap only around its centre', () => {
    /* A pipe is over the bird for about 250ms on this canvas. In the gap from
     * 48ms before the centre to 40ms after it, in the wall before and after —
     * about 77ms and 85ms. The game judges a note one frame after it is sung,
     * which makes that about 93ms and 69ms: never CRASH_GRACE_MS in a row. */
    const api = playRound((target, msAfterCentre) =>
      msAfterCentre >= -48 && msAfterCentre < 40
        ? target.midi
        : awayFrom(target.midi),
    )

    expect(api.phase.value).toBe('won')
    expect(api.score.value).toBe(api.targets.value.length)
  })

  test('should crash on the pipe the singer leaves too early', () => {
    const api = playRound((target, msAfterCentre) =>
      msAfterCentre < -40 ? target.midi : awayFrom(target.midi),
    )

    expect(api.phase.value).toBe('crashed')
    expect(api.crashCause.value).toEqual({ kind: 'pipe', pipeId: 0 })
    expect(api.targets.value[0].status).toBe('crashed')
    expect(api.score.value).toBe(0)
  })

  test('should never leave a pipe missed in a round played to its end', () => {
    /* Whatever the singer does, a pipe that passes the bird is either the
     * crash that ends the round or a point: sweep the moment of moving on. */
    for (let leaveAt = -200; leaveAt <= 200; leaveAt += 8) {
      const api = playRound((target, msAfterCentre) =>
        msAfterCentre < leaveAt ? target.midi : awayFrom(target.midi),
      )
      const statuses = api.targets.value.map((target) => target.status)

      if (api.phase.value === 'won') {
        expect(statuses, `leaveAt ${leaveAt}`).not.toContain('missed')
      } else {
        expect(api.crashCause.value?.kind, `leaveAt ${leaveAt}`).toBe('pipe')
      }
      wrappers.pop()!.unmount()
    }
  })

  const rounds = (['easy', 'normal', 'hard'] as const).flatMap((difficulty) =>
    GAME_DURATION_OPTIONS.map((durationSec) => ({ difficulty, durationSec })),
  )

  /* A full run used to stop up to one pipe interval early: "18.0s / 20s" */
  test.each(rounds)(
    'should end a full $difficulty $durationSec s run on the picked length',
    ({ difficulty, durationSec }) => {
      const gameDurationMs = durationSec * 1000
      /* A phone and the widest the page gets: the last pipe parts from the
       * bird later on a narrow chart, and the layout allows for it */
      for (const canvasWidth of [360, CANVAS_WIDTH]) {
        const api = playRound((target) => target.midi, canvasWidth, {
          difficulty,
          gameDurationMs,
        })

        expect(api.phase.value, `width ${canvasWidth}`).toBe('won')
        /* Won on the first frame at or after the picked length; the end
         * screen clamps the readout to it */
        expect(api.elapsedMs.value).toBeGreaterThanOrEqual(gameDurationMs)
        expect(api.elapsedMs.value).toBeLessThan(gameDurationMs + 2 * FRAME_MS)
        wrappers.pop()!.unmount()
      }
    },
  )

  /* Pipes in a round, counted by hand: one as the round starts, then one per
   * pipe interval in what is left after the 4000ms approach from the live
   * edge to the bird. Easy 10s: 6000ms left, a pipe every 2800ms, so 2 more
   * and 3 in all. Best scores store this total, so a number that has to
   * change here means stored scores no longer fit their round. */
  const PIPE_COUNTS: Record<Difficulty, Record<GameDurationSec, number>> = {
    easy: { 5: 1, 10: 3, 20: 6, 30: 10, 40: 13, 50: 17, 60: 21 },
    normal: { 5: 1, 10: 4, 20: 9, 30: 14, 40: 19, 50: 25, 60: 30 },
    hard: { 5: 1, 10: 5, 20: 12, 30: 19, 40: 26, 50: 33, 60: 41 },
  }

  test.each(rounds)(
    'should keep the pipe count and spacing of a $difficulty $durationSec s round',
    ({ difficulty, durationSec }) => {
      const gameDurationMs = durationSec * 1000
      const intervalMs = DIFFICULTY_PIPE_INTERVAL_MS[difficulty]
      const api = setup(undefined, true, CANVAS_WIDTH, {
        difficulty,
        gameDurationMs,
      })
      api.startGame()
      const dueTimes = api.targets.value.map((target) => target.dueTime)

      expect(dueTimes).toHaveLength(PIPE_COUNTS[difficulty][durationSec])
      if (dueTimes.length < 2) return

      const spacingMs =
        (dueTimes[dueTimes.length - 1] - dueTimes[0]) / (dueTimes.length - 1)
      /* Never meaningfully closer than the difficulty asks, never more than
       * 15% wider */
      expect(spacingMs).toBeGreaterThan(intervalMs * 0.99)
      expect(spacingMs).toBeLessThan(intervalMs * 1.15)
    },
  )

  test('should score a pipe only once its back edge has passed the bird', () => {
    const noteInfo = ref<NoteInfo | null>(null)
    const api = setup(noteInfo, false)
    api.startGame()
    const target = api.targets.value[0]
    noteInfo.value = noteAt(target.midi)

    /* To the pipe's centre: over the bird, in the gap, still undecided */
    vi.advanceTimersByTime(centreAge)
    expect(isPipeOverBird(target, performance.now(), geom)).toBe(true)
    expect(target.status).toBe('pending')
    expect(api.score.value).toBe(0)

    while (isPipeOverBird(target, performance.now(), geom)) {
      vi.advanceTimersByTime(FRAME_MS)
    }
    vi.advanceTimersByTime(FRAME_MS)

    expect(target.status).toBe('hit')
    expect(api.score.value).toBe(1)
  })
})

describe('useSingFly - stalled frames', () => {
  test('should not crash on one long step outside the gap', async () => {
    /* The scrub clock drives one evaluation per detected note, so the test
     * owns the size of each step */
    let clock = 50_000
    vi.spyOn(performance, 'now').mockImplementation(() => clock)
    const noteInfo = ref<NoteInfo | null>(null)
    const api = setup(noteInfo)
    api.startGame()
    const target = api.targets.value[0]
    const geom = computeGeometry(CANVAS_WIDTH, false)

    /* Scrub to the first moment the pipe's column is over the bird */
    let elapsed = 0
    while (!isPipeOverBird(target, api.gameStartTime.value! + elapsed, geom)) {
      elapsed += 5
      api.setElapsedMs(elapsed)
    }
    noteInfo.value = noteAt(target.midi)
    await nextTick()

    /* 120ms pass in a single step — longer than the crash grace — and the
     * bird is outside the gap when the game next looks */
    clock += 120
    api.setElapsedMs(elapsed + 120)
    noteInfo.value = noteAt(target.midi + 6)
    await nextTick()

    expect(
      isPipeOverBird(target, api.gameStartTime.value! + elapsed + 120, geom),
    ).toBe(true)
    expect(target.status).toBe('pending')
  })
})
