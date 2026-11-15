import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { h } from 'vue'
import type { VoiceRange } from '@/constants/voiceRanges'
import type { NoteInfo } from '@/utils/noteUtils'
import { frequencyToNote, midiToFrequency } from '@/utils/noteUtils'
import { GAME_PICKUP_LINE_RATIO, HISTORY_WINDOW_MS } from './singFlyConstants'
import { computeGeometry, isPipeOverBird } from './singFlyGeometry'
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

const CANVAS_WIDTH = 800

/* A fresh object per call, as the real detector emits one per frame */
function noteAt(midi: number): NoteInfo {
  return { ...frequencyToNote(midiToFrequency(midi))! }
}

function setup(noteInfo = ref<NoteInfo | null>(null)) {
  let api!: Api
  const wrapper = mount({
    setup() {
      api = useSingFly({
        noteInfo,
        isClean: ref(true),
        midiMin: ref(RANGE.midiMin),
        midiMax: ref(RANGE.midiMax),
        voiceRange: ref(RANGE),
        gameDurationMs: ref(10_000),
        difficulty: ref('easy'),
        canvasWidth: ref(CANVAS_WIDTH),
        canvasHeight: ref(300),
        isRtl: ref(false),
        manualClock: ref(true),
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

describe('useSingFly - scoring window', () => {
  test('should score a pipe flown through on its front half only', async () => {
    /* The hold accumulates real elapsed time, so the test owns the clock */
    let clock = 50_000
    vi.spyOn(performance, 'now').mockImplementation(() => clock)
    const noteInfo = ref<NoteInfo | null>(null)
    const api = setup(noteInfo)
    api.startGame()
    const target = api.targets.value[0]
    const geom = computeGeometry(CANVAS_WIDTH, false)
    const sing = async (midi: number) => {
      noteInfo.value = noteAt(midi)
      await nextTick()
    }

    /* Scrub to the first moment the pipe's column is over the bird */
    let elapsed = 0
    const isOverBird = () =>
      isPipeOverBird(target, api.gameStartTime.value! + elapsed, geom)
    while (!isOverBird()) {
      elapsed += 5
      api.setElapsedMs(elapsed)
    }
    /* Still before the pipe's centre reaches the bird, where scoring used to
     * open */
    const centreAtBirdMs = HISTORY_WINDOW_MS * (1 - GAME_PICKUP_LINE_RATIO)
    expect(elapsed + 60).toBeLessThan(centreAtBirdMs)

    /* In the gap for 60ms of the front half, then away before the centre */
    await sing(target.midi)
    /* Real time and the scrub move together, so the pipe scrolls on 60ms */
    clock += 60
    api.setElapsedMs(elapsed + 60)
    await sing(target.midi)

    expect(target.status).toBe('hit')
    expect(api.score.value).toBe(1)
  })

  test('should not score a pipe that has not reached the bird', async () => {
    const noteInfo = ref<NoteInfo | null>(null)
    const api = setup(noteInfo)
    api.startGame()
    const target = api.targets.value[0]

    let clock = 50_000
    vi.spyOn(performance, 'now').mockImplementation(() => clock)
    api.setElapsedMs(1000)
    noteInfo.value = noteAt(target.midi)
    await nextTick()
    clock += 60
    api.setElapsedMs(1060)
    noteInfo.value = noteAt(target.midi)
    await nextTick()

    expect(target.status).toBe('pending')
    expect(api.score.value).toBe(0)
  })
})
