import { describe, expect, it } from 'vitest'
import { vozMelodyToAbcString } from './graceKellyAbc'
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

  it('splits the middle quarter of a "three quarters" bar into two tied eighths', () => {
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

  it('does not split notes that already sit within a beat', () => {
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

  it('leaves the w: line byte-identical when nothing splits', () => {
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

  it('inserts exactly one melisma slot and keeps lyrics aligned (real melody)', () => {
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
