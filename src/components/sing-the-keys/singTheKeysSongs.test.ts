import { describe, expect, test } from 'vitest'
import { C3_MIDI, START_TONE_OPTIONS } from '@/utils/noteUtils'
import {
  DEFAULT_RANGE_OFFSET,
  DEFAULT_SONG_ID,
  DEFAULT_SPEED,
  isSongId,
  isSpeedOption,
  SONG_IDS,
  SONGS,
  SPEED_OPTIONS,
  sungMidiRange,
  tonicMidiForRange,
} from './singTheKeysSongs'

describe('singTheKeysSongs', () => {
  test.each(SONG_IDS)('%s has notes with positive beats', (id) => {
    const song = SONGS[id]

    expect(song.id).toBe(id)
    expect(song.bpm).toBeGreaterThan(0)
    expect(song.notes.length).toBeGreaterThan(0)
    for (const note of song.notes) {
      expect(note.beats).toBeGreaterThan(0)
      expect(note.restAfterBeats ?? 0).toBeGreaterThanOrEqual(0)
    }
  })

  test.each(SONG_IDS)('%s has a pickup shorter than a bar', (id) => {
    const { pulseBeats, pulsesPerBar, pickupBeats } = SONGS[id].meter

    expect(pulseBeats).toBeGreaterThan(0)
    expect(Number.isInteger(pulsesPerBar)).toBe(true)
    expect(pickupBeats).toBeGreaterThanOrEqual(0)
    expect(pickupBeats).toBeLessThan(pulseBeats * pulsesPerBar)
  })

  test('Twinkle Twinkle has 42 notes and ends on the tonic', () => {
    expect(SONGS.twinkle.notes).toHaveLength(42)
    expect(SONGS.twinkle.notes.at(-1)?.midiOffset).toBe(0)
  })

  test('Für Elise opens on the E–D♯ trill', () => {
    const opening = SONGS.furElise.notes
      .slice(0, 5)
      .map((note) => note.midiOffset)

    expect(opening).toEqual([19, 18, 19, 18, 19])
  })

  test('Happy Birthday starts a fifth below the tonic', () => {
    expect(SONGS.happyBirthday.notes[0].midiOffset).toBe(-5)
  })

  test('the default song and speed are valid options', () => {
    expect(isSongId(DEFAULT_SONG_ID)).toBe(true)
    expect(isSpeedOption(DEFAULT_SPEED)).toBe(true)
    expect(isSongId('nope')).toBe(false)
    expect(isSpeedOption(3)).toBe(false)
  })

  /* "Vertical Ordering" in AGENTS.md: largest value at the top. */
  test('SPEED_OPTIONS is listed largest first', () => {
    expect([...SPEED_OPTIONS]).toEqual(
      [...SPEED_OPTIONS].toSorted((a, b) => b - a),
    )
  })

  describe('song range', () => {
    const rangeMidpoint = (id: (typeof SONG_IDS)[number], offset: number) => {
      const song = SONGS[id]
      const { lowestMidi, highestMidi } = sungMidiRange(
        song,
        tonicMidiForRange(song, offset),
      )

      return (lowestMidi + highestMidi) / 2
    }

    /* Each option centres the song where the same Do-Re-Mi start tone's
     * one-octave scale is centred (6 semitones up), within the half-semitone
     * rounding an odd span needs. */
    test.each(SONG_IDS)('%s is centred on the option', (id) => {
      for (const { offset } of START_TONE_OPTIONS) {
        const scaleMidpoint = C3_MIDI + offset + 6

        expect(
          Math.abs(rangeMidpoint(id, offset) - scaleMidpoint),
        ).toBeLessThanOrEqual(0.5)
      }
    })

    /* "Vertical Ordering" in AGENTS.md: a range sorts on its midpoint. */
    test.each(SONG_IDS)('%s options run high to low by midpoint', (id) => {
      const midpoints = START_TONE_OPTIONS.map(({ offset }) =>
        rangeMidpoint(id, offset),
      )

      expect(midpoints).toEqual(midpoints.toSorted((a, b) => b - a))
    })

    test('the default puts Für Elise at F3–A4', () => {
      const song = SONGS.furElise
      const tonicMidi = tonicMidiForRange(song, DEFAULT_RANGE_OFFSET)

      expect(sungMidiRange(song, tonicMidi)).toEqual({
        lowestMidi: 53,
        highestMidi: 69,
      })
    })
  })
})
