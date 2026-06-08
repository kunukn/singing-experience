/* Grace Kelly lyrics, split into syllables and aligned to the melody's tones.
 *
 * All six Voz melodies share an identical 34-note rhythm (only pitches differ),
 * so this single syllable→note mapping drives the sung-syllable highlight for
 * every voice. The lyrics yield 33 syllables across 34 tones; the final tone
 * (33) carries no new syllable, so the closing "like" stays lit through the
 * ending (handled by the "last syllable reached" rule in the display
 * component).
 *
 * Multi-syllable words are stored as adjacent syllables (no internal space) so
 * each tone lights exactly one syllable while the word still reads seamlessly. */

export type LyricSyllable = { text: string; noteIndex: number }
export type LyricWord = LyricSyllable[]
export type LyricLine = LyricWord[]

export const GRACE_KELLY_LYRIC_LINES: LyricLine[] = [
  /* I could be brown, I could be blue */
  [
    [{ text: 'I', noteIndex: 0 }],
    [{ text: 'could', noteIndex: 1 }],
    [{ text: 'be', noteIndex: 2 }],
    [{ text: 'brown,', noteIndex: 3 }],
    [{ text: 'I', noteIndex: 4 }],
    [{ text: 'could', noteIndex: 5 }],
    [{ text: 'be', noteIndex: 6 }],
    [{ text: 'blue', noteIndex: 7 }],
  ],
  /* I could be vi-o-let sky — "vi-o-let" sung over three tones (E E E), "sky" on
   * the following tone (F). */
  [
    [{ text: 'I', noteIndex: 8 }],
    [{ text: 'could', noteIndex: 9 }],
    [{ text: 'be', noteIndex: 10 }],
    [
      { text: 'vi', noteIndex: 11 },
      { text: 'o', noteIndex: 12 },
      { text: 'let', noteIndex: 13 },
    ],
    [{ text: 'sky', noteIndex: 14 }],
  ],
  /* I could be hurtful, I could be purple */
  [
    [{ text: 'I', noteIndex: 15 }],
    [{ text: 'could', noteIndex: 16 }],
    [{ text: 'be', noteIndex: 17 }],
    [
      { text: 'hurt', noteIndex: 18 },
      { text: 'ful,', noteIndex: 19 },
    ],
    [{ text: 'I', noteIndex: 20 }],
    [{ text: 'could', noteIndex: 21 }],
    [{ text: 'be', noteIndex: 22 }],
    [
      { text: 'pur', noteIndex: 23 },
      { text: 'ple', noteIndex: 24 },
    ],
  ],
  /* I could be anything you like */
  [
    [{ text: 'I', noteIndex: 25 }],
    [{ text: 'could', noteIndex: 26 }],
    [{ text: 'be', noteIndex: 27 }],
    [
      { text: 'a', noteIndex: 28 },
      { text: 'ny', noteIndex: 29 },
      { text: 'thing', noteIndex: 30 },
    ],
    [{ text: 'you', noteIndex: 31 }],
    [{ text: 'like', noteIndex: 32 }],
  ],
]

/* All syllables in reading order with their starting note index — lets the
 * display resolve the active syllable without re-flattening the nested lines. */
export const GRACE_KELLY_SYLLABLES: ReadonlyArray<{ noteIndex: number }> =
  GRACE_KELLY_LYRIC_LINES.flat(2).map(({ noteIndex }) => ({ noteIndex }))
