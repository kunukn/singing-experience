import { describe, expect, test } from 'vitest'
import {
  DEFAULT_SONG_ID,
  DEFAULT_SPEED,
  isSongId,
  isSpeedOption,
  SONG_IDS,
  SONGS,
  SPEED_OPTIONS,
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
})
