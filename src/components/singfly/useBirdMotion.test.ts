import { describe, expect, test } from 'vitest'
import type { NoteInfo } from '@/utils/noteUtils'
import {
  frequencyToMidi,
  frequencyToNote,
  midiToFrequency,
} from '@/utils/noteUtils'
import { useBirdMotion } from './useBirdMotion'

/* All cases drive the deterministic manual-clock path (the test page's): no
 * RAF, time is the virtual scrub clock (gameStartTime + elapsedMs), the bird
 * is integrated on each elapsedMs/noteInfo change — exactly what the canvas
 * does while scrubbing, so no fake timers are needed.
 *
 * SingFly is a pure tone→height game: a sung pitch eases the bird toward it;
 * NO pitch holds the last position (no gravity, the bird never free-falls). */

const PERCH = 65 // F4 — an arbitrary fixed perch for these motion tests

function noteInfoForMidi(midi: number): NoteInfo {
  return frequencyToNote(midiToFrequency(midi))!
}

function out(info: NoteInfo | null): number | null {
  return info ? frequencyToMidi(info.frequency) : null
}

function setup() {
  const noteInfo = ref<NoteInfo | null>(null)
  const smoothNoteInfo = ref<NoteInfo | null>(null)
  const isPlaying = ref(false)
  const perchMidi = ref(PERCH)
  const manualClock = ref(true)
  const gameStartTime = ref<number | null>(0)
  const elapsedMs = ref(0)

  useBirdMotion({
    noteInfo,
    smoothNoteInfo,
    isPlaying,
    perchMidi,
    manualClock,
    gameStartTime,
    elapsedMs,
  })

  async function start() {
    isPlaying.value = true
    await nextTick()
  }

  /* One ~16 ms virtual frame: advance the scrub clock and (re)write the sung
   * note (null = silent), so the watcher integrates exactly once. */
  async function frame(midi: number | null, dtMs = 16) {
    elapsedMs.value += dtMs
    noteInfo.value = midi === null ? null : noteInfoForMidi(midi)
    await nextTick()
  }

  async function frames(midi: number | null, count: number, dtMs = 16) {
    for (let i = 0; i < count; i++) await frame(midi, dtMs)
  }

  return {
    noteInfo,
    smoothNoteInfo,
    isPlaying,
    elapsedMs,
    start,
    frame,
    frames,
    value: () => out(smoothNoteInfo.value),
  }
}

describe('useBirdMotion — pitch bird (no gravity)', () => {
  test('snaps to the perch when the round starts', async () => {
    const game = setup()
    await game.start()
    expect(game.value()).toBeCloseTo(PERCH)
  })

  test('idle (not playing) produces no position', async () => {
    const game = setup()
    await game.frame(null)
    expect(game.smoothNoteInfo.value).toBeNull()
  })

  test('holds the perch indefinitely on silence — never falls', async () => {
    const game = setup()
    await game.start()

    /* A long stretch of pure silence: the bird stays exactly on the perch,
     * no gravity pulls it down. */
    await game.frames(null, 400)
    expect(game.value()).toBeCloseTo(PERCH, 6)
  })

  test('holds the LAST sung position on silence (no fall back / down)', async () => {
    const game = setup()
    await game.start()

    /* Sing up to a steady note... */
    await game.frames(72, 60) // C5, above the perch
    const held = game.value()!
    expect(held).toBeCloseTo(72, 0)

    /* ...then go silent for a long time: the bird stays where it was sung,
     * it does not drift or fall. */
    await game.frames(null, 400)
    expect(game.value()!).toBeCloseTo(held, 6)
  })

  test('climbs fast UP toward a sung note, never overshooting', async () => {
    const game = setup()
    await game.start()

    let previous = game.value()!
    for (let i = 0; i < 300; i++) {
      await game.frame(72) // C5, above the perch
      const value = game.value()!
      expect(value).toBeGreaterThanOrEqual(previous - 1e-9)
      expect(value).toBeLessThanOrEqual(72 + 1e-6)
      previous = value
    }
    expect(game.value()).toBeCloseTo(72, 0)
  })

  test('climbs fast DOWN toward a sung note (climb = move toward)', async () => {
    const game = setup()
    await game.start()

    let previous = game.value()!
    for (let i = 0; i < 300; i++) {
      await game.frame(50) // D3, below the perch
      const value = game.value()!
      expect(value).toBeLessThanOrEqual(previous + 1e-9)
      expect(value).toBeGreaterThanOrEqual(50 - 1e-6)
      previous = value
    }
    expect(game.value()).toBeCloseTo(50, 0)
  })

  /* Hard mode's worst case: a ~octave leap must land in the (1-semitone) gap
   * fast enough to beat the next pipe. The distance-aware cap no longer
   * throttles the TAU ease, so a 12-st jump reaches the gap well inside
   * ~224ms (~14 frames). */
  const BIG_JUMP_FRAMES = 14 // ~224ms of 16ms frames

  test('a big UP leap reaches the hard gap fast, never overshooting', async () => {
    const game = setup()
    await game.start() // on the perch (65)

    const target = PERCH + 12 // F4 → F5, a full octave up
    let previous = game.value()!
    for (let i = 0; i < BIG_JUMP_FRAMES; i++) {
      await game.frame(target)
      const value = game.value()!
      /* Monotone toward the note and never past it. */
      expect(value).toBeGreaterThanOrEqual(previous - 1e-9)
      expect(value).toBeLessThanOrEqual(target + 1e-6)
      previous = value
    }
    /* Inside the hard difficulty's 1-semitone gap within the budget. */
    expect(Math.abs(game.value()! - target)).toBeLessThanOrEqual(1)
  })

  test('a big DOWN leap reaches the hard gap fast, never overshooting', async () => {
    const game = setup()
    await game.start()

    const target = PERCH - 12 // F4 → F3, a full octave down
    let previous = game.value()!
    for (let i = 0; i < BIG_JUMP_FRAMES; i++) {
      await game.frame(target)
      const value = game.value()!
      expect(value).toBeLessThanOrEqual(previous + 1e-9)
      expect(value).toBeGreaterThanOrEqual(target - 1e-6)
      previous = value
    }
    expect(Math.abs(game.value()! - target)).toBeLessThanOrEqual(1)
  })

  test('a small move keeps the gentle ease — no single-frame snap', async () => {
    const game = setup()
    await game.start()

    const target = PERCH + 2 // a 2-semitone nudge
    await game.frame(target)
    const afterOneFrame = game.value()!
    /* Moved toward the note, but only a small fraction of the way — the
     * base-rate floor + TAU ease still govern small moves, so it must NOT
     * have snapped onto the target in one frame. */
    expect(afterOneFrame).toBeGreaterThan(PERCH)
    expect(afterOneFrame).toBeLessThan(PERCH + 1)

    /* It still converges (monotone) over the next frames. */
    let previous = afterOneFrame
    for (let i = 0; i < 40; i++) {
      await game.frame(target)
      const value = game.value()!
      expect(value).toBeGreaterThanOrEqual(previous - 1e-9)
      expect(value).toBeLessThanOrEqual(target + 1e-6)
      previous = value
    }
    expect(game.value()).toBeCloseTo(target, 0)
  })

  test('never emits null while playing (silence holds, not clears)', async () => {
    const game = setup()
    await game.start()
    await game.frames(72, 5)
    await game.frames(null, 30)
    await game.frames(60, 5)
    expect(game.smoothNoteInfo.value).not.toBeNull()
  })

  test('a huge clock jump on silence still does not move the bird', async () => {
    const game = setup()
    await game.start()
    await game.frames(58, 20) // sing down to a steady note
    const held = game.value()!

    /* A 2 s scrub jump in a single silent step: with no gravity there is
     * nothing to integrate, so the bird stays exactly put. */
    await game.frame(null, 2000)
    expect(game.value()!).toBeCloseTo(held, 6)
  })

  test('freezes its last position when the round ends', async () => {
    const game = setup()
    await game.start()
    await game.frames(72, 40)
    const atEnd = game.value()!

    game.isPlaying.value = false
    await nextTick()
    /* Retained for the completion/crash frame so the bird stays put. */
    expect(game.value()).toBeCloseTo(atEnd)
  })
})
