import { describe, expect, test } from 'vitest'
import { C3_MIDI, START_TONE_OPTIONS } from '@/utils/noteUtils'
import {
  DEFAULT_RANGE_OFFSET,
  DEFAULT_SONG_ID,
  DEFAULT_SPEED,
  groupSongIdsByDifficulty,
  isSongId,
  isSpeedOption,
  SONG_DIFFICULTIES,
  SONG_IDS,
  SONGS,
  SPEED_OPTIONS,
  sungMidiRange,
  tonicMidiForRange,
  type SongId,
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

  describe('timing rules', () => {
    const MS_PER_MINUTE = 60000
    const beatMs = (id: SongId) => MS_PER_MINUTE / SONGS[id].bpm
    /* Quarter-note beats from the first note to the end, rests included. */
    const totalBeats = (id: SongId) =>
      SONGS[id].notes.reduce(
        (sum, note) => sum + note.beats + (note.restAfterBeats ?? 0),
        0,
      )
    /* Triplet thirds do not add up exactly in floating point. */
    const isWholeNumber = (value: number) =>
      Math.abs(value - Math.round(value)) < 1e-9

    /* The hit line flashes on every pulse. 600 ms at 1× is 480 ms at the
     * fastest speed (1.25×) — safely under the 3 Hz photosensitivity limit
     * that BEAT_FLASH_MS in singTheKeysTimeline.ts relies on. */
    test.each(SONG_IDS)('%s pulses no faster than every 600 ms', (id) => {
      const pulseMs = SONGS[id].meter.pulseBeats * beatMs(id)

      expect(pulseMs).toBeGreaterThanOrEqual(600)
    })

    /* Shorter than a fifth of a second is over before a voice settles on it. */
    test.each(SONG_IDS)('%s has no note shorter than 200 ms', (id) => {
      const shortestBeats = Math.min(
        ...SONGS[id].notes.map((note) => note.beats),
      )

      expect(shortestBeats * beatMs(id)).toBeGreaterThanOrEqual(200)
    })

    test.each(SONG_IDS)('%s lasts between 10 and 32 seconds', (id) => {
      const seconds = (totalBeats(id) * beatMs(id)) / 1000

      expect(seconds).toBeGreaterThanOrEqual(10)
      expect(seconds).toBeLessThanOrEqual(32)
    })

    /* A song stops on a bar line, or its last bar is short by exactly the
     * pickup. Anything else means a beat was dropped or added in the data. */
    test.each(SONG_IDS)('%s fills whole bars', (id) => {
      const { pulseBeats, pulsesPerBar, pickupBeats } = SONGS[id].meter
      const barBeats = pulseBeats * pulsesPerBar
      const beats = totalBeats(id)

      expect(
        isWholeNumber(beats / barBeats) ||
          isWholeNumber((beats - pickupBeats) / barBeats),
      ).toBe(true)
    })
  })

  /* Lowest and highest note as semitones from the tonic: the span decides how
   * much of a voice the song needs, and with it the range labels. */
  test.each([
    { id: 'maryLamb', lowest: 0, highest: 7 },
    { id: 'frereJacques', lowest: -5, highest: 9 },
    { id: 'londonBridge', lowest: 0, highest: 9 },
    { id: 'jingleBells', lowest: 0, highest: 7 },
    { id: 'rowYourBoat', lowest: 0, highest: 12 },
    { id: 'whenTheSaints', lowest: 0, highest: 7 },
    { id: 'amazingGrace', lowest: -5, highest: 7 },
    { id: 'ohSusanna', lowest: 0, highest: 9 },
    { id: 'greensleeves', lowest: -5, highest: 9 },
    { id: 'mountainKing', lowest: 0, highest: 12 },
    { id: 'habanera', lowest: 0, highest: 12 },
    { id: 'entertainer', lowest: 2, highest: 16 },
  ] as const)('$id spans $lowest to $highest', ({ id, lowest, highest }) => {
    const offsets = SONGS[id].notes.map((note) => note.midiOffset)

    expect(Math.min(...offsets)).toBe(lowest)
    expect(Math.max(...offsets)).toBe(highest)
  })

  test('In the Hall of the Mountain King sings its theme twice', () => {
    const { notes } = SONGS.mountainKing
    const half = notes.length / 2

    expect(notes.slice(half)).toEqual(notes.slice(0, half))
  })

  test('Habanera slides from the upper tonic down to the lower', () => {
    expect(SONGS.habanera.notes[0].midiOffset).toBe(12)
    expect(SONGS.habanera.notes.at(-1)?.midiOffset).toBe(0)
  })

  describe('difficulty groups', () => {
    /* A named scale keeps its conventional order — "Vertical Ordering" in
     * AGENTS.md exempts it from largest-first. */
    test('returns the groups easy first', () => {
      const difficulties = groupSongIdsByDifficulty().map(
        (group) => group.difficulty,
      )

      expect(difficulties).toEqual(['easy', 'normal', 'hard'])
      expect(difficulties).toEqual([...SONG_DIFFICULTIES])
    })

    test('puts every song in exactly one group', () => {
      const groupedIds = groupSongIdsByDifficulty().flatMap(
        (group) => group.songIds,
      )

      expect(groupedIds.toSorted()).toEqual([...SONG_IDS].toSorted())
    })

    /* An empty group would leave a header with nothing under it. */
    test.each(SONG_DIFFICULTIES)('has at least one %s song', (difficulty) => {
      const group = groupSongIdsByDifficulty().find(
        (candidate) => candidate.difficulty === difficulty,
      )

      expect(group?.songIds.length).toBeGreaterThan(0)
    })

    /* Semitones above the tonic that belong to the major scale. A note outside
     * it is harder to pitch, so such a tune does not belong under Easy. */
    const MAJOR_SCALE_SEMITONES = [0, 2, 4, 5, 7, 9, 11]
    const SEMITONES_PER_OCTAVE = 12

    test('keeps easy songs inside the major scale', () => {
      const easyIds = SONG_IDS.filter((id) => SONGS[id].difficulty === 'easy')

      for (const id of easyIds) {
        const outOfScale = SONGS[id].notes
          .map(
            ({ midiOffset }) =>
              /* Positive modulo: offsets below the tonic are negative. */
              ((midiOffset % SEMITONES_PER_OCTAVE) + SEMITONES_PER_OCTAVE) %
              SEMITONES_PER_OCTAVE,
          )
          .filter((semitone) => !MAJOR_SCALE_SEMITONES.includes(semitone))

        expect(outOfScale, id).toEqual([])
      }
    })
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
