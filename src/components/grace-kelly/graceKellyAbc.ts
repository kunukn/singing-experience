import type { VozMelody } from './graceKellyMelodies'

/* The sheet notates each voice at its real sounding pitch, transposed by the
 * selected start tone. Most voices use an 8vb treble clef (clef=treble-8):
 * every note sounds an octave lower than it is drawn, so the written pitch is
 * the sounding pitch plus 12 — this keeps the low voices off ledger lines. The
 * high voices (Voz 1–3, melody.clef === 'treble') use a plain treble clef and
 * are drawn at true pitch (no "8"). Notes are stored as semitone offsets from
 * the tonic (start tone); since the melodies are fully diatonic, the whole part
 * lands in the start tone's major key, which we emit as a key signature — no
 * per-note accidentals needed. */

/* Tonic pitch class (0 = C) → major key signature + the key's tonic letter.
 * Black-key tonics use their conventional major spelling (Db/Eb/Ab/Bb, F#). */
const PITCHCLASS_TO_KEY: { abcKey: string; letter: string }[] = [
  { abcKey: 'C', letter: 'C' }, // 0
  { abcKey: 'Db', letter: 'D' }, // 1
  { abcKey: 'D', letter: 'D' }, // 2
  { abcKey: 'Eb', letter: 'E' }, // 3
  { abcKey: 'E', letter: 'E' }, // 4
  { abcKey: 'F', letter: 'F' }, // 5
  { abcKey: 'F#', letter: 'F' }, // 6
  { abcKey: 'G', letter: 'G' }, // 7
  { abcKey: 'Ab', letter: 'A' }, // 8
  { abcKey: 'A', letter: 'A' }, // 9
  { abcKey: 'Bb', letter: 'B' }, // 10
  { abcKey: 'B', letter: 'B' }, // 11
]

/* Semitone above the tonic → 0-based major-scale degree (do=0, re=1, … ti=6).
 * The melodies are diatonic, so every note's `midiOffset % 12` is one of these
 * keys. A chromatic offset would be absent here and must not be added without
 * first teaching this module to emit explicit accidentals. */
const MAJOR_DEGREE: Record<number, number> = {
  0: 0, // do
  2: 1, // re
  4: 2, // mi
  5: 3, // fa
  7: 4, // sol
  9: 5, // la
  11: 6, // ti
}

const DIATONIC_TO_LETTER = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
const LETTER_TO_DIATONIC: Record<string, number> = {
  C: 0,
  D: 1,
  E: 2,
  F: 3,
  G: 4,
  A: 5,
  B: 6,
}
/* Natural (no-accidental) pitch class of each letter — used to anchor the
 * tonic's staff octave. */
const NAT: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
}

/* Converts a staff letter + scientific octave to an ABC pitch token.
 * ABC octave convention: uppercase `C` = middle C (C4); `c` = C5; `C,` = C3;
 * lower octaves add commas, higher octaves add apostrophes. */
function abcOctaveToken(letter: string, octave: number): string {
  if (octave >= 5) return letter.toLowerCase() + "'".repeat(octave - 5)

  return letter + ','.repeat(4 - octave)
}

/* Returns a staffwidth that fits all notes on one line (prevents abcjs wrapping). */
export function estimateStaffWidth(noteCount: number): number {
  return Math.max(900, noteCount * 80)
}

/* Formats a duration in eighth-note units (the L:1/8 unit) as an ABC length
 * token. Whole units render bare per the ABC spec (1 → '', 2 → '2', 3 → '3');
 * half units render as an x/2 fraction (1.5 → '3/2' dotted eighth, 0.5 → '1/2'
 * sixteenth). Only whole and half eighths occur in these transcriptions. */
function abcDurationToken(eighthNotes: number): string {
  /* Work in half-eighth units so 1.5 → 3 halves — integer math, no float compare. */
  const halves = Math.round(eighthNotes * 2)
  if (halves % 2 === 0) {
    const whole = halves / 2
    return whole === 1 ? '' : String(whole)
  }

  return `${halves}/2`
}

/* Splits a note that crosses one or more intra-bar beat boundaries into the
 * sequence of piece lengths (in eighths) that each sit within a single beat —
 * the standard 6/8 rule that keeps the dotted-quarter pulse visible. A quarter
 * starting off the beat renders as two tied eighths rather than one beat-
 * straddling quarter; a note already inside one beat returns a single piece.
 * The bar end (barTarget) is never a split point — the barline handles that, so
 * a note that fills or overflows the bar is emitted whole (existing behaviour). */
function splitNoteAcrossBeats(
  barPos: number,
  eighthNotes: number,
  beatEighths: number,
  barTarget: number,
): number[] {
  const pieces: number[] = []
  let position = barPos
  let remaining = eighthNotes
  while (remaining > 0) {
    const nextBeatBoundary =
      (Math.floor(position / beatEighths) + 1) * beatEighths
    const limit = Math.min(nextBeatBoundary, barTarget)
    if (limit <= position) {
      pieces.push(remaining)
      break
    }
    const pieceEighths = Math.min(remaining, limit - position)
    pieces.push(pieceEighths)
    position += pieceEighths
    remaining -= pieceEighths
  }

  return pieces
}

/* Tokenizes an ABC `w:` lyric string into ordered syllables, each tagged with
 * the separator that precedes it: a space between words, "-" between a word's
 * own syllables. Used to rebuild the `w:` line note-by-note when beat-splitting
 * adds noteheads that each need their own lyric token. */
function parseAbcLyricSyllables(
  lyrics: string,
): { text: string; separator: string }[] {
  const syllables: { text: string; separator: string }[] = []
  lyrics.split(' ').forEach((word, wordIndex) => {
    if (word.length === 0) return

    word.split('-').forEach((text, partIndex) => {
      const separator = partIndex > 0 ? '-' : wordIndex === 0 ? '' : ' '
      syllables.push({ text, separator })
    })
  })

  return syllables
}

/* One emitted `w:` token: a real syllable or a "_" melisma standing in for a
 * synthetic tied continuation notehead. `separator` is the ABC character drawn
 * before it; `isMelisma` lets a following real syllable know its word broke. */
type LyricSlot = { text: string; separator: string; isMelisma: boolean }

/* Converts a VozMelody to an ABC notation string ready for abcjs.renderAbc,
 * transposed so the tonic sounds at `startToneMidi`. The key signature is the
 * major key of the start tone; since the melody is diatonic, the note body
 * carries no accidentals. */
export function vozMelodyToAbcString(
  melody: VozMelody,
  label: string,
  startToneMidi: number,
  bpm = 120,
  showTempo = true,
  lyrics?: string,
): string {
  /* 6/8 = 6 eighth notes per measure */
  const EIGHTHS_PER_MEASURE = 6

  /* 6/8 beats are dotted quarters = 3 eighth notes. ABC beams notes written
   * without a separating space; we beam consecutive eighth notes that fall in
   * the same beat and break the beam at beat boundaries, longer notes, and
   * barlines — the standard 6/8 engraving. */
  const BEAT_EIGHTHS = 3

  const pitchClass = ((startToneMidi % 12) + 12) % 12
  const key = PITCHCLASS_TO_KEY[pitchClass]

  /* 'treble-8' (8vb) is the default; the high voices opt into a plain treble. */
  const useOctaveDownClef = melody.clef !== 'treble'
  const clefToken = useOctaveDownClef ? 'treble-8' : 'treble'

  /* An 8vb clef draws an octave above the sounding pitch, so the written tonic
   * is startTone + 12; a plain treble clef draws at true pitch. Anchor the tonic
   * onto the diatonic staff "ladder" (one step per letter) so each note's octave
   * marks follow from its scale degree. */
  const writtenTonicMidi = startToneMidi + (useOctaveDownClef ? 12 : 0)
  const tonicStaffOctave =
    Math.round((writtenTonicMidi - NAT[key.letter]) / 12) - 1
  const tonicLadder = tonicStaffOctave * 7 + LETTER_TO_DIATONIC[key.letter]

  let body = ''
  let barPos = 0 // eighths elapsed in the current bar (note start position)
  /* The first bar's target is the anacrusis length (a pickup), if any; every
   * subsequent bar targets a full 6/8 measure. */
  let barTarget =
    melody.anacrusisEighths && melody.anacrusisEighths > 0
      ? melody.anacrusisEighths
      : EIGHTHS_PER_MEASURE
  let atBarStart = true
  let previousBeamable = false
  let previousBeat = -1

  /* Lyric realignment: abcjs assigns one `w:` token per notehead, so each note a
   * beat-split turns into tied pieces gains an extra notehead needing its own
   * token. Rebuild the `w:` line as we walk the body — real notes consume the
   * next syllable; synthetic tied continuations get a `_` melisma so the held
   * syllable visibly extends across the tie. */
  const lyricSlots: LyricSlot[] = []
  const syllables = lyrics ? parseAbcLyricSyllables(lyrics) : []
  let syllableIndex = 0

  for (const note of melody.notes) {
    const within = ((note.midiOffset % 12) + 12) % 12
    const degree = MAJOR_DEGREE[within]
    if (degree === undefined) {
      debugLog(
        `[graceKelly] non-diatonic midiOffset ${note.midiOffset} cannot be spelled in a key signature`,
      )
    }
    const ladder =
      tonicLadder + Math.floor(note.midiOffset / 12) * 7 + (degree ?? 0)
    const staffOctave = Math.floor(ladder / 7)
    const letter = DIATONIC_TO_LETTER[((ladder % 7) + 7) % 7]
    const pitch = abcOctaveToken(letter, staffOctave)

    /* Split at every intra-bar beat boundary the note crosses, then emit each
     * piece as its own (tied) notehead — proper 6/8 engraving. */
    const pieces = splitNoteAcrossBeats(
      barPos,
      note.eighthNotes,
      BEAT_EIGHTHS,
      barTarget,
    )

    let piecePos = barPos
    for (let pieceIndex = 0; pieceIndex < pieces.length; pieceIndex++) {
      const pieceEighths = pieces[pieceIndex]
      const isLastPiece = pieceIndex === pieces.length - 1
      const duration = abcDurationToken(pieceEighths)
      /* Non-final pieces tie to the next piece; the final piece carries the
       * note's own tie flag. ABC tie "-" must directly follow the note. */
      const tie = isLastPiece ? (note.tie ? '-' : '') : '-'

      const beat = Math.floor(piecePos / BEAT_EIGHTHS)
      /* Only a plain eighth beams; longer notes carry their own flag. Split
       * pieces sit in different beats, so the beat check below never beams
       * them together. */
      const beamable = pieceEighths === 1

      if (!atBarStart) {
        /* Join to the previous note (no space = beam) only when both are eighth
         * notes inside the same beat; otherwise separate them with a space. */
        const beam = beamable && previousBeamable && beat === previousBeat
        body += beam ? '' : ' '
      }

      body += pitch + duration + tie

      if (lyrics) {
        if (pieceIndex === 0) {
          /* First piece is the real note — consume its syllable (none once the
           * lyrics run out, e.g. a trailing held note). */
          const syllable = syllables[syllableIndex]
          if (syllable) {
            syllableIndex += 1
            /* A word-internal "-" only holds between true siblings; if a melisma
             * was just inserted, the word broke — space the next syllable. */
            const previousSlot = lyricSlots[lyricSlots.length - 1]
            const separator =
              syllable.separator === '-' && previousSlot?.isMelisma
                ? ' '
                : syllable.separator
            lyricSlots.push({
              text: syllable.text,
              separator,
              isMelisma: false,
            })
          }
        } else {
          lyricSlots.push({ text: '_', separator: ' ', isMelisma: true })
        }
      }

      previousBeamable = beamable
      previousBeat = beat
      atBarStart = false
      piecePos += pieceEighths
    }

    /* A clipped note (restAfterEighths) is drawn as the note followed by a rest
     * that fills the remaining time — e.g. a dotted-eighth note + a sixteenth
     * rest. The rest is notation + scheduled silence only; it adds no entry to
     * melody.notes and takes no lyric token, so indexing and alignment hold. */
    if (note.restAfterEighths && note.restAfterEighths > 0) {
      body += ' z' + abcDurationToken(note.restAfterEighths)
      /* A trailing rest breaks the beam — the next note can't beam across it. */
      previousBeamable = false
    }

    barPos += note.eighthNotes + (note.restAfterEighths ?? 0)

    if (barPos >= barTarget) {
      body += ' | '
      barPos = 0
      barTarget = EIGHTHS_PER_MEASURE
      atBarStart = true
    }
  }

  const lyricLine = lyricSlots
    .map((slot) => slot.separator + slot.text)
    .join('')

  /* Append visual-only trailing rests to balance the closing bar against the
   * pickup. These live in the ABC only (never in melody.notes), so the players
   * schedule no trailing silence — purely a notational nicety. A bare `z` is an
   * eighth rest under L:1/8, so N eighth rests render as `z z …`. */
  if (melody.trailingRestEighths && melody.trailingRestEighths > 0) {
    const rests = Array.from({ length: melody.trailingRestEighths }, () => 'z')
    body += (body.endsWith(' ') ? '' : ' ') + rests.join(' ')
  }

  return [
    'X:1',
    `T:${label}`,
    'M:6/8',
    'L:1/8',
    /* Tempo marking is optional — some sheets render without the BPM header. */
    ...(showTempo ? [`Q:3/8=${bpm}`] : []),
    /* Treble clef — 8vb for the low voices (notes sound an octave below where
     * drawn, matching the source score), plain treble for the high voices. The
     * key signature is the start tone's major key, so the diatonic melody needs
     * no per-note accidentals. */
    `K:${key.abcKey} clef=${clefToken}`,
    body.trim(),
    /* A `w:` line after the music aligns each space-separated syllable to a
     * note, drawing the lyrics under the staff. Rebuilt above so beat-split
     * notes stay aligned. Omitted when no lyrics given. */
    ...(lyrics ? [`w:${lyricLine}`] : []),
  ].join('\n')
}
