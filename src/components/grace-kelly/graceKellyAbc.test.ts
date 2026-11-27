import { describe, expect, test } from 'vitest'
import {
  groupNoteHeads,
  noteHeadCountsPerNote,
  vozMelodyToAbcString,
} from './graceKellyAbc'
import { VOZ_MELODIES, type VozMelody } from './graceKellyMelodies'
import { GRACE_KELLY_LYRIC_ABC } from './graceKellyLyrics'

/* Pulls the music body line out of the ABC string (the line after the K: header). */
function bodyLine(abc: string): string {
  const lines = abc.split('\n')
  const keyIndex = lines.findIndex((line) => line.startsWith('K:'))

  return lines[keyIndex + 1] ?? ''
}

/* The `w:` lyric line (without the `w:` prefix). */
function lyricLine(abc: string): string {
  return (
    abc
      .split('\n')
      .find((line) => line.startsWith('w:'))
      ?.slice(2) ?? ''
  )
}

/* Counts note-slots in a `w:` line: syllables are delimited by spaces (between
 * words) or "-" (within a word), one slot per notehead. */
function countLyricSlots(line: string): number {
  return line
    .trim()
    .split(' ')
    .flatMap((word) => word.split('-')).length
}

describe('vozMelodyToAbcString — 6/8 beat-straddling split', () => {
  /* Plain treble clef + start tone C5 (MIDI 72) → the tonic renders as the ABC
   * token `c`, so the body is easy to assert against. */
  const C5 = 72

  test('splits the middle quarter of a "three quarters" bar into two tied eighths', () => {
    const threeQuarters: VozMelody = {
      clef: 'treble',
      notes: [
        { midiOffset: 0, eighthNotes: 2 }, // beat-aligned at pos 0 — no split
        { midiOffset: 0, eighthNotes: 2 }, // starts pos 2 → crosses beat at 3
        { midiOffset: 0, eighthNotes: 2 }, // starts pos 4 — no split
      ],
    }

    const abc = vozMelodyToAbcString(threeQuarters, 'Test', C5, 120, false)

    /* Quarter, tied eighth, eighth, quarter — the dotted-quarter pulse is now
     * visible instead of a bare quarter straddling the beat. */
    expect(bodyLine(abc)).toContain('c2 c- c c2')
    expect(bodyLine(abc)).not.toContain('c2 c2 c2')
  })

  test('does not split notes that already sit within a beat', () => {
    const beatAligned: VozMelody = {
      clef: 'treble',
      /* Two dotted quarters fill the bar at beats 0 and 3 — neither straddles. */
      notes: [
        { midiOffset: 0, eighthNotes: 3 },
        { midiOffset: 0, eighthNotes: 3 },
      ],
    }

    const abc = vozMelodyToAbcString(beatAligned, 'Test', C5, 120, false)

    expect(bodyLine(abc)).not.toContain('-')
    expect(bodyLine(abc)).toContain('c3 c3')
  })

  test('leaves the w: line byte-identical when nothing splits', () => {
    const noSplit: VozMelody = {
      clef: 'treble',
      notes: [
        { midiOffset: 0, eighthNotes: 1 },
        { midiOffset: 0, eighthNotes: 1 },
        { midiOffset: 0, eighthNotes: 1 },
      ],
    }

    const abc = vozMelodyToAbcString(
      noSplit,
      'Test',
      C5,
      120,
      false,
      'do re mi',
    )

    expect(lyricLine(abc)).toBe('do re mi')
  })

  test('inserts exactly one melisma slot and keeps lyrics aligned (real melody)', () => {
    const abc = vozMelodyToAbcString(
      VOZ_MELODIES[0],
      'Voz 1',
      C5,
      120,
      false,
      GRACE_KELLY_LYRIC_ABC,
    )

    const originalSlots = countLyricSlots(GRACE_KELLY_LYRIC_ABC)
    const rebuiltSlots = countLyricSlots(lyricLine(abc))

    /* One synthetic continuation notehead → exactly one extra `w:` slot. */
    expect(rebuiltSlots).toBe(originalSlots + 1)
    /* The held "o" of "vi-o-let" now extends across the tie via a `_` melisma. */
    expect(lyricLine(abc)).toContain('vi-o _ let')
  })
})

describe('noteHeadCountsPerNote / groupNoteHeads — melody-index ↔ notehead map', () => {
  test('reports one notehead per note when nothing straddles a beat', () => {
    /* Three dotted quarters, each starting on a beat and filling it. */
    const onBeat: VozMelody = {
      clef: 'treble',
      notes: [
        { midiOffset: 0, eighthNotes: 3 },
        { midiOffset: 2, eighthNotes: 3 },
        { midiOffset: 4, eighthNotes: 3 },
      ],
    }

    expect(noteHeadCountsPerNote(onBeat)).toEqual([1, 1, 1])
  })

  test('counts the extra notehead a beat-straddling note splits into', () => {
    /* Quarter, quarter, quarter in 6/8: the middle quarter straddles the beat
     * boundary at eighth 3 → two tied noteheads, so counts are [1, 2, 1]. */
    const threeQuarters: VozMelody = {
      clef: 'treble',
      notes: [
        { midiOffset: 0, eighthNotes: 2 },
        { midiOffset: 2, eighthNotes: 2 },
        { midiOffset: 4, eighthNotes: 2 },
      ],
    }

    expect(noteHeadCountsPerNote(threeQuarters)).toEqual([1, 2, 1])
  })

  test('buckets the flat notehead list into one group per melody note', () => {
    /* Quarter, quarter, quarter in 6/8: the middle quarter is drawn as two tied
     * noteheads, so four noteheads belong to three notes. */
    const threeQuarters: VozMelody = {
      clef: 'treble',
      notes: [
        { midiOffset: 0, eighthNotes: 2 },
        { midiOffset: 2, eighthNotes: 2 },
        { midiOffset: 4, eighthNotes: 2 },
      ],
    }

    expect(groupNoteHeads(['a', 'b', 'c', 'd'], threeQuarters)).toEqual([
      ['a'],
      ['b', 'c'],
      ['d'],
    ])
  })

  test('counts one extra notehead in the real melody, on the note that straddles a beat', () => {
    const counts = noteHeadCountsPerNote(VOZ_MELODIES[0])

    /* Bar 3 is three quarters, so its middle one (note 12) is drawn as two
     * noteheads: 34 notes become 35 noteheads. */
    expect(counts[12]).toBe(2)
    expect(counts.reduce((sum, count) => sum + count, 0)).toBe(35)
  })
})
