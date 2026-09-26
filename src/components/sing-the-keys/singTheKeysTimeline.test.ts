import { describe, expect, test } from 'vitest'
import type { Song } from './singTheKeysSongs'
import { SONGS } from './singTheKeysSongs'
import {
  activeNoteIndexAt,
  buildTimeline,
  songMidiRange,
} from './singTheKeysTimeline'

const C4 = 60

const song: Song = {
  id: 'twinkle',
  bpm: 100,
  notes: [
    { midiOffset: 0, beats: 1 },
    { midiOffset: 7, beats: 0.5, restAfterBeats: 0.5 },
    { midiOffset: -2, beats: 2 },
  ],
}

describe('buildTimeline', () => {
  test('derives the beat length from bpm and speed', () => {
    expect(buildTimeline(song, C4, 1).beatMs).toBe(600)
    expect(buildTimeline(song, C4, 0.5).beatMs).toBe(1200)
    expect(buildTimeline(song, C4, 1.25).beatMs).toBe(480)
  })

  test('lays notes out end to end, with rests shifting the next start', () => {
    const { notes, totalMs } = buildTimeline(song, C4, 1)

    expect(notes).toEqual([
      { index: 0, midi: 60, startMs: 0, durationMs: 600 },
      { index: 1, midi: 67, startMs: 600, durationMs: 300 },
      { index: 2, midi: 58, startMs: 1200, durationMs: 1200 },
    ])
    expect(totalMs).toBe(2400)
  })
})

describe('activeNoteIndexAt', () => {
  const { notes } = buildTimeline(song, C4, 1)

  test.each([
    { elapsedMs: -1, expected: null },
    { elapsedMs: 0, expected: 0 },
    { elapsedMs: 599, expected: 0 },
    { elapsedMs: 600, expected: 1 },
    { elapsedMs: 900, expected: null },
    { elapsedMs: 1199, expected: null },
    { elapsedMs: 1200, expected: 2 },
    { elapsedMs: 2399, expected: 2 },
    { elapsedMs: 2400, expected: null },
  ])('returns $expected at $elapsedMs ms', ({ elapsedMs, expected }) => {
    expect(activeNoteIndexAt(notes, elapsedMs)).toBe(expected)
  })
})

describe('songMidiRange', () => {
  test('pads the melody by a semitone and widens to natural notes', () => {
    /* Ode to Joy at C4 spans C4–G4 (60–67); ±1 gives B3–G♯4, and G♯4 widens
     * up to A4. */
    expect(songMidiRange(SONGS.odeToJoy, C4)).toEqual({
      midiMin: 59,
      midiMax: 69,
    })
  })

  test('handles negative offsets', () => {
    /* Happy Birthday at F3 (53): lowest C3 (48), highest C4 (60); ±1 gives
     * B2–C♯4, and C♯4 widens up to D4. */
    expect(songMidiRange(SONGS.happyBirthday, 53)).toEqual({
      midiMin: 47,
      midiMax: 62,
    })
  })
})
