import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'

import type { VoiceRange } from '@/constants/voiceRanges'
import type { NoteInfo } from '@/utils/noteUtils'
import { frequencyToNote, midiToFrequency } from '@/utils/noteUtils'
import { LEAD_IN_MS, useNoteRush } from './useNoteRush'

const RANGE: VoiceRange = {
  labelKey: 'voiceRanges.test',
  noteRange: 'C3–C5',
  midiMin: 48,
  midiMax: 72,
  group: 'easy',
}
const HOLD_MS = 200
/* About one animation frame, the pace pitch frames arrive at */
const FRAME_MS = 16

type Api = ReturnType<typeof useNoteRush>

const wrappers: { unmount: () => void }[] = []
const noteInfo = ref<NoteInfo | null>(null)
let now = 0

/* useMachine starts its actor in onMounted, so the composable needs a mounted component. */
function setup() {
  let api!: Api
  wrappers.push(
    mount({
      setup() {
        api = useNoteRush({
          noteInfo,
          isClean: ref(true),
          midiMin: ref(RANGE.midiMin),
          midiMax: ref(RANGE.midiMax),
          voiceRange: ref(RANGE),
          holdDurationMs: ref(HOLD_MS),
          gameDurationMs: ref(20_000),
          difficulty: ref('normal'),
        })

        return () => h('div')
      },
    }),
  )

  return api
}

async function sing(midi: number | null, atMs: number) {
  now = atMs
  /* A new, complete reading each frame, as the detector produces */
  noteInfo.value = midi === null ? null : frequencyToNote(midiToFrequency(midi))
  await nextTick()
}

async function singFor(midi: number, fromMs: number, durationMs: number) {
  for (let elapsed = 0; elapsed <= durationMs; elapsed += FRAME_MS) {
    await sing(midi, fromMs + elapsed)
  }
}

describe('useNoteRush - hold detection', () => {
  beforeEach(() => {
    now = 0
    noteInfo.value = null
    vi.spyOn(performance, 'now').mockImplementation(() => now)
  })

  afterEach(() => {
    while (wrappers.length) wrappers.pop()!.unmount()
    vi.restoreAllMocks()
  })

  /* The first note is due LEAD_IN_MS after the start and can be caught LEAD_IN_MS after that */
  const ZONE_START_MS = 2 * LEAD_IN_MS

  test('should score a note held for the hold duration', async () => {
    const game = setup()
    game.startGame()
    const target = game.targets.value[0]

    await singFor(target.midi, ZONE_START_MS, HOLD_MS + FRAME_MS)

    expect(target.status).toBe('hit')
    expect(game.score.value).toBe(1)
  })

  test('should stamp a hit with its time and start a streak', async () => {
    const game = setup()
    game.startGame()
    const target = game.targets.value[0]

    await singFor(target.midi, ZONE_START_MS, HOLD_MS + FRAME_MS)

    expect(target.resolvedAt).toBe(now)
    expect(target.streak).toBe(1)
    expect(game.streak.value).toBe(1)
  })

  test('should not run a streak across a skipped note', async () => {
    const game = setup()
    game.startGame()
    const [first, skipped, third] = game.targets.value
    /* When the third note can be caught, with the skipped one still pending */
    const thirdZoneStartMs = third.dueTime + LEAD_IN_MS

    await singFor(first.midi, ZONE_START_MS, HOLD_MS + FRAME_MS)
    await singFor(third.midi, thirdZoneStartMs, HOLD_MS + FRAME_MS)

    expect(skipped.status).not.toBe('hit')
    expect(third.status).toBe('hit')
    expect(third.streak).toBe(1)
  })

  test('should end the streak on a miss and keep the best one', async () => {
    const game = setup()
    game.startGame()
    const target = game.targets.value[0]

    await singFor(target.midi, ZONE_START_MS, HOLD_MS + FRAME_MS)
    game.stopGame()

    /* Stopping misses every note but the one that was hit */
    const missed = game.targets.value.filter(
      (target) => target.status === 'missed',
    )
    expect(missed).toHaveLength(game.targets.value.length - 1)
    expect(missed.length).toBeGreaterThan(0)
    expect(missed.every((target) => target.resolvedAt === now)).toBe(true)
    expect(game.streak.value).toBe(0)
    expect(game.summary.value?.bestStreak).toBe(1)
  })

  test('should not score a note sung for less than the hold duration', async () => {
    const game = setup()
    game.startGame()
    const target = game.targets.value[0]

    await singFor(target.midi, ZONE_START_MS, HOLD_MS / 2)

    expect(target.status).toBe('pending')
  })

  test('should not count a silent pause as held', async () => {
    const game = setup()
    game.startGame()
    const target = game.targets.value[0]

    await sing(target.midi, ZONE_START_MS)
    await sing(null, ZONE_START_MS + FRAME_MS)
    await sing(target.midi, ZONE_START_MS + 1000)

    expect(target.status).toBe('pending')
  })

  test('should not count the slide in from another note as held', async () => {
    const game = setup()
    game.startGame()
    const target = game.targets.value[0]
    const otherMidi =
      target.midi === RANGE.midiMin ? target.midi + 2 : target.midi - 2

    await singFor(otherMidi, ZONE_START_MS, 1000)
    await sing(target.midi, ZONE_START_MS + 1000 + FRAME_MS)

    expect(target.status).toBe('pending')
  })

  test('should not count time when pitch frames stall', async () => {
    const game = setup()
    game.startGame()
    const target = game.targets.value[0]

    await sing(target.midi, ZONE_START_MS)
    await sing(target.midi, ZONE_START_MS + 1000)

    expect(target.status).toBe('pending')
  })

  test('should keep the progress across a brief drift off the note', async () => {
    const game = setup()
    game.startGame()
    const target = game.targets.value[0]

    await singFor(target.midi, ZONE_START_MS, HOLD_MS * 0.6)
    await sing(null, ZONE_START_MS + 150)
    await singFor(target.midi, ZONE_START_MS + 300, HOLD_MS * 0.6)

    expect(target.status).toBe('hit')
  })
})
