import { describe, expect, test } from 'vitest'
import type { Song } from './singTheKeysSongs'
import { SONGS } from './singTheKeysSongs'
import {
  activeNoteIndexAt,
  BEAT_FLASH_MS,
  beatFlashAt,
  beatPulseAt,
  buildTimeline,
  LOOKAHEAD_MS,
  songMidiRange,
} from './singTheKeysTimeline'

const C4 = 60

const song: Song = {
  id: 'twinkle',
  bpm: 100,
  meter: { pulseBeats: 1, pulsesPerBar: 4, pickupBeats: 0 },
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

describe('buildTimeline - beat lines', () => {
  test('lays a line every beat with a bar line every 4 in 4/4', () => {
    const { beatLines, beatMs } = buildTimeline(SONGS.twinkle, C4, 1)
    const downbeat = beatLines.findIndex((line) => line.ms === 0)

    expect(beatLines.slice(downbeat, downbeat + 5)).toEqual([
      { ms: 0, pulseInBar: 0, isBarStart: true },
      { ms: beatMs, pulseInBar: 1, isBarStart: false },
      { ms: 2 * beatMs, pulseInBar: 2, isBarStart: false },
      { ms: 3 * beatMs, pulseInBar: 3, isBarStart: false },
      { ms: 4 * beatMs, pulseInBar: 0, isBarStart: true },
    ])
  })

  test('starts the lines at the lead-in and ends them at the song end', () => {
    const { beatLines, totalMs } = buildTimeline(SONGS.twinkle, C4, 1)

    /* 3000ms lead-in over a 600ms beat: exactly five count-in lines. */
    expect(beatLines[0].ms).toBe(-LOOKAHEAD_MS)
    expect(beatLines.at(-1)?.ms).toBe(totalMs)
  })

  test('puts the first bar line after the pickup', () => {
    /* Happy Birthday: the two-eighth pickup fills one beat, so "birth" (note
     * 2) lands on the first bar line. */
    const { beatLines, beatMs, notes } = buildTimeline(
      SONGS.happyBirthday,
      C4,
      1,
    )
    const firstBar = beatLines.find((line) => line.isBarStart && line.ms >= 0)

    expect(firstBar?.ms).toBe(beatMs)
    expect(notes[2].startMs).toBe(beatMs)
  })

  test('marks bar lines every 3 beats in 3/4, including the lead-in', () => {
    const { beatLines, beatMs } = buildTimeline(SONGS.happyBirthday, C4, 1)
    const barLines = beatLines
      .filter((line) => line.isBarStart)
      .map((line) => line.ms)

    expect(barLines.slice(0, 3)).toEqual([
      beatMs - 6 * beatMs,
      beatMs - 3 * beatMs,
      beatMs,
    ])
  })

  test('pulses on the eighth for Für Elise', () => {
    const { beatLines, beatMs } = buildTimeline(SONGS.furElise, C4, 1)

    expect(beatLines[1].ms - beatLines[0].ms).toBe(beatMs / 2)
  })

  test('scales the line spacing with speed', () => {
    const slow = buildTimeline(SONGS.twinkle, C4, 0.5).beatLines
    const fast = buildTimeline(SONGS.twinkle, C4, 1.25).beatLines

    expect(slow[1].ms - slow[0].ms).toBe(1200)
    expect(fast[1].ms - fast[0].ms).toBe(480)
  })
})

describe('buildTimeline - pulse in bar', () => {
  test('counts 1 2 3 across the lead-in and the pickup in 3/4', () => {
    /* Happy Birthday's first downbeat is at 1 beat (600ms); the lead-in lines
     * from −3000ms count back from it. */
    const { beatLines } = buildTimeline(SONGS.happyBirthday, C4, 1)

    expect(beatLines.slice(0, 7).map((line) => line.pulseInBar)).toEqual([
      0, 1, 2, 0, 1, 2, 0,
    ])
    expect(beatLines[6].ms).toBe(600)
  })
})

describe('beatPulseAt', () => {
  const lines = [
    { ms: 0, pulseInBar: 0, isBarStart: true },
    { ms: 600, pulseInBar: 1, isBarStart: false },
    { ms: 1200, pulseInBar: 2, isBarStart: false },
  ]

  test('returns null before the first line', () => {
    expect(beatPulseAt(lines, -1)).toBeNull()
  })

  test.each([
    { elapsedMs: 0, pulseInBar: 0, progress: 0 },
    { elapsedMs: 300, pulseInBar: 0, progress: 0.5 },
    { elapsedMs: 600, pulseInBar: 1, progress: 0 },
    /* After the last line there is no next one to measure against. */
    { elapsedMs: 1500, pulseInBar: 2, progress: 1 },
  ])(
    'is at pulse $pulseInBar, $progress along, at $elapsedMs ms',
    ({ elapsedMs, pulseInBar, progress }) => {
      const pulse = beatPulseAt(lines, elapsedMs)

      expect(pulse?.pulseInBar).toBe(pulseInBar)
      expect(pulse?.progress).toBeCloseTo(progress)
    },
  )
})

describe('beatFlashAt', () => {
  const lines = [
    { ms: 0, pulseInBar: 0, isBarStart: true },
    { ms: 600, pulseInBar: 1, isBarStart: false },
  ]

  test.each([
    { elapsedMs: -1, expected: null },
    { elapsedMs: 0, expected: { intensity: 1, isBarStart: true } },
    {
      elapsedMs: BEAT_FLASH_MS / 2,
      expected: { intensity: 0.5, isBarStart: true },
    },
    { elapsedMs: BEAT_FLASH_MS, expected: null },
    { elapsedMs: 599, expected: null },
    { elapsedMs: 600, expected: { intensity: 1, isBarStart: false } },
  ])('returns $expected at $elapsedMs ms', ({ elapsedMs, expected }) => {
    expect(beatFlashAt(lines, elapsedMs)).toEqual(expected)
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
