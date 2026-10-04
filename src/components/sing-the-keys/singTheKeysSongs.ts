import { C3_MIDI } from '@/utils/noteUtils'

/* Sing the Keys — melody data.
 *
 * Pitches are semitone offsets from the song's tonic, so one range pick
 * transposes any song: sounding MIDI = tonicMidi + midiOffset. Durations are in
 * quarter-note beats; `bpm` is the song's own quarter-note tempo, scaled by the
 * speed select at play time. Every tune is public domain; the longer ones are
 * cut to an excerpt of 15–30 s. */

export type SongNote = {
  /* Semitones from the tonic. Negative for notes below it (Happy Birthday
   * starts on the fifth below). */
  midiOffset: number
  /* Duration in quarter-note beats: 0.25 = 16th, 0.5 = ♪, 1 = ♩, 2 = 𝅗𝅥.
   * 1 / 3 is a triplet eighth. */
  beats: number
  /* Silent beats after this note before the next one begins. */
  restAfterBeats?: number
  /* Lyric syllable for this note — reserved; blocks show note names for now. */
  syllable?: string
}

export const SONG_IDS = [
  'twinkle',
  'odeToJoy',
  'happyBirthday',
  'furElise',
  'maryLamb',
  'frereJacques',
  'londonBridge',
  'jingleBells',
  'greensleeves',
  'mountainKing',
  'habanera',
  'entertainer',
  'oldMacDonald',
  'brahmsLullaby',
  'auldLangSyne',
  'silentNight',
  'canCan',
  'williamTell',
  'swanLake',
  'pachelbelCanon',
  'pachelbelCanonVariation',
  'sakura',
  'moLiHua',
  'laCucaracha',
  'korobeiniki',
  'lammaBada',
  'burungKakatua',
  'shosholoza',
  'arirang',
  'eineKleineNachtmusik',
] as const

export type SongId = (typeof SONG_IDS)[number]

/* Where the felt beat falls, for the lane's beat lines. All in quarter-note
 * beats, like SongNote.beats. */
export type SongMeter = {
  /* Felt pulse — one lane line each. */
  pulseBeats: number
  /* Pulses per bar — every Nth line is a bold bar line. */
  pulsesPerBar: number
  /* Beats before the first downbeat (anacrusis). */
  pickupBeats: number
}

/* How hard a song is to sing, judged by ear from its span, rhythm and
 * out-of-key notes together. The values match the generic.difficulty_* keys,
 * and keep the conventional easy-first order of a named scale ("Vertical
 * Ordering" in AGENTS.md). */
export const SONG_DIFFICULTIES = ['easy', 'normal', 'hard'] as const

export type SongDifficulty = (typeof SONG_DIFFICULTIES)[number]

export type Song = {
  id: SongId
  difficulty: SongDifficulty
  /* Quarter notes per minute at 1× speed. */
  bpm: number
  meter: SongMeter
  notes: SongNote[]
}

export const DEFAULT_SONG_ID: SongId = 'twinkle'

/* Largest first — see "Vertical Ordering" in AGENTS.md. */
export const SPEED_OPTIONS = [1.25, 1, 0.75, 0.5] as const

export type SpeedOption = (typeof SPEED_OPTIONS)[number]

export const DEFAULT_SPEED: SpeedOption = 1

/* The Song range picker reuses the start-tone options (G4 … G2, offsets from
 * C3) and their voice tiers, but an option places the song by the middle of
 * its range rather than naming its tonic. A start tone in Do-Re-Mi begins a
 * one-octave scale whose middle sits SCALE_CENTER_SEMITONES above it; the song
 * is centred on that same pitch, so every tier holds a song as it holds a
 * scale, whatever the song's own span. Switching songs keeps the voice. */
const SCALE_CENTER_SEMITONES = 6

/* G3 — the same default as Do-Re-Mi (DEFAULT_STARTING_SEMITONE_OFFSET): the
 * song is centred on C♯4, the middle of the G3–G4 scale. */
export const DEFAULT_RANGE_OFFSET = 7

/* Lowest and highest sung note, as semitones from the tonic. */
function offsetSpan(song: Song): { min: number; max: number } {
  const offsets = song.notes.map((note) => note.midiOffset)

  return { min: Math.min(...offsets), max: Math.max(...offsets) }
}

/* Tonic that centres the song on the picked range option. The span's middle
 * can fall between two semitones; rounding it keeps the tonic a real key. */
export function tonicMidiForRange(song: Song, rangeOffset: number): number {
  const { min, max } = offsetSpan(song)
  const centerMidi = C3_MIDI + rangeOffset + SCALE_CENTER_SEMITONES

  return centerMidi - Math.round((min + max) / 2)
}

/* The notes the singer actually has to reach, tonic applied. */
export function sungMidiRange(
  song: Song,
  tonicMidi: number,
): { lowestMidi: number; highestMidi: number } {
  const { min, max } = offsetSpan(song)

  return { lowestMidi: tonicMidi + min, highestMidi: tonicMidi + max }
}

export function isSongId(value: unknown): value is SongId {
  return SONG_IDS.includes(value as SongId)
}

export function isSpeedOption(value: unknown): value is SpeedOption {
  return SPEED_OPTIONS.includes(value as SpeedOption)
}

function note(
  midiOffset: number,
  beats: number,
  restAfterBeats?: number,
): SongNote {
  return restAfterBeats === undefined
    ? { midiOffset, beats }
    : { midiOffset, beats, restAfterBeats }
}

/* Twinkle Twinkle Little Star — C major, range a sixth (tonic … la).
 * A: C C G G A A G | F F E E D D C
 * B: G G F F E E D | G G F F E E D
 * A again. */
const TWINKLE_PHRASE_A: SongNote[] = [
  note(0, 1),
  note(0, 1),
  note(7, 1),
  note(7, 1),
  note(9, 1),
  note(9, 1),
  note(7, 2),
  note(5, 1),
  note(5, 1),
  note(4, 1),
  note(4, 1),
  note(2, 1),
  note(2, 1),
  note(0, 2),
]
const TWINKLE_PHRASE_B: SongNote[] = [
  note(7, 1),
  note(7, 1),
  note(5, 1),
  note(5, 1),
  note(4, 1),
  note(4, 1),
  note(2, 2),
]
const TWINKLE: Song = {
  id: 'twinkle',
  difficulty: 'easy',
  bpm: 100,
  meter: { pulseBeats: 1, pulsesPerBar: 4, pickupBeats: 0 }, // 4/4
  notes: [
    ...TWINKLE_PHRASE_A,
    ...TWINKLE_PHRASE_B,
    ...TWINKLE_PHRASE_B,
    ...TWINKLE_PHRASE_A,
  ],
}

/* Ode to Joy (Beethoven) — C major, stepwise, range a fifth (do … so).
 * E E F G | G F E D | C C D E | E. D D
 * E E F G | G F E D | C C D E | D. C C */
const ODE_TO_JOY_OPENING: SongNote[] = [
  note(4, 1),
  note(4, 1),
  note(5, 1),
  note(7, 1),
  note(7, 1),
  note(5, 1),
  note(4, 1),
  note(2, 1),
  note(0, 1),
  note(0, 1),
  note(2, 1),
  note(4, 1),
]
const ODE_TO_JOY: Song = {
  id: 'odeToJoy',
  difficulty: 'easy',
  bpm: 100,
  meter: { pulseBeats: 1, pulsesPerBar: 4, pickupBeats: 0 }, // 4/4
  notes: [
    ...ODE_TO_JOY_OPENING,
    note(4, 1.5),
    note(2, 0.5),
    note(2, 2),
    ...ODE_TO_JOY_OPENING,
    note(2, 1.5),
    note(0, 0.5),
    note(0, 2),
  ],
}

/* Happy Birthday — F major, 3/4 with a two-eighth pickup. The pickup is two
 * plain eighths rather than a dotted-eighth + 16th: rounder blocks for children.
 * Offsets from F: C below = −5, D = −3, E = −1, G = 2, A = 4, B♭ = 5, C = 7.
 * (C C) D C F | E (C C) D C G | F (C C) C' A F E D | (B♭ B♭) A F G F */
const HAPPY_BIRTHDAY: Song = {
  id: 'happyBirthday',
  difficulty: 'normal',
  bpm: 100,
  // 3/4; the two-eighth pickup fills one beat before "birth" lands on 1
  meter: { pulseBeats: 1, pulsesPerBar: 3, pickupBeats: 1 },
  notes: [
    note(-5, 0.5),
    note(-5, 0.5),
    note(-3, 1),
    note(-5, 1),
    note(0, 1),
    note(-1, 2),
    note(-5, 0.5),
    note(-5, 0.5),
    note(-3, 1),
    note(-5, 1),
    note(2, 1),
    note(0, 2),
    note(-5, 0.5),
    note(-5, 0.5),
    note(7, 1),
    note(4, 1),
    note(0, 1),
    note(-1, 1),
    note(-3, 1),
    note(5, 0.5),
    note(5, 0.5),
    note(4, 1),
    note(0, 1),
    note(2, 1),
    note(0, 2),
  ],
}

/* Für Elise (Beethoven), opening theme — A minor, in 16ths at a slow quarter.
 * The tonic is the low A: the famous E5–D♯5 trill sits at +19/+18, and the
 * left-hand-answer notes C4 E4 A4 (+3 +7 +12) are sung too, since the game
 * has one voice. Offsets: C +3, E +7, G♯ +11, A +12, B +14, C +15, D +17,
 * D♯ +18, E +19. */
const FUR_ELISE_TRILL: SongNote[] = [
  note(19, 0.25),
  note(18, 0.25),
  note(19, 0.25),
  note(18, 0.25),
  note(19, 0.25),
  note(14, 0.25),
  note(17, 0.25),
  note(15, 0.25),
  note(12, 0.5, 0.25),
]
const FUR_ELISE_ANSWER: SongNote[] = [
  note(3, 0.25),
  note(7, 0.25),
  note(12, 0.25),
  note(14, 0.5, 0.25),
]
const FUR_ELISE: Song = {
  id: 'furElise',
  difficulty: 'hard',
  bpm: 50,
  /* 3/8, felt on the eighth (a quarter pulse would not line up with the
   * 1.5-beat bar); the E–D♯ sixteenth pickup is half a beat. */
  meter: { pulseBeats: 0.5, pulsesPerBar: 3, pickupBeats: 0.5 },
  notes: [
    ...FUR_ELISE_TRILL,
    ...FUR_ELISE_ANSWER,
    note(7, 0.25),
    note(11, 0.25),
    note(14, 0.25),
    note(15, 0.5, 0.25),
    note(7, 0.25),
    ...FUR_ELISE_TRILL,
    ...FUR_ELISE_ANSWER,
    note(7, 0.25),
    note(15, 0.25),
    note(14, 0.25),
    note(12, 1),
  ],
}

/* Mary Had a Little Lamb — C major, stepwise, range a fifth (do … so).
 * E D C D | E E E– | D D D– | E G G– | E D C D | E E E E | D D E D | C––– */
const MARY_LAMB: Song = {
  id: 'maryLamb',
  difficulty: 'easy',
  bpm: 100,
  meter: { pulseBeats: 1, pulsesPerBar: 4, pickupBeats: 0 }, // 4/4
  notes: [
    note(4, 1),
    note(2, 1),
    note(0, 1),
    note(2, 1),
    note(4, 1),
    note(4, 1),
    note(4, 2),
    note(2, 1),
    note(2, 1),
    note(2, 2),
    note(4, 1),
    note(7, 1),
    note(7, 2),
    note(4, 1),
    note(2, 1),
    note(0, 1),
    note(2, 1),
    note(4, 1),
    note(4, 1),
    note(4, 1),
    note(4, 1),
    note(2, 1),
    note(2, 1),
    note(4, 1),
    note(2, 1),
    note(0, 4),
  ],
}

/* Frère Jacques — C major, four phrases each sung twice. The last one dips to
 * the fifth below the tonic (−5).
 * C D E C | E F G– | (G A G F) E C | C G, C– */
const FRERE_JACQUES_WALK: SongNote[] = [
  note(0, 1),
  note(2, 1),
  note(4, 1),
  note(0, 1),
]
const FRERE_JACQUES_SLEEP: SongNote[] = [note(4, 1), note(5, 1), note(7, 2)]
const FRERE_JACQUES_BELLS: SongNote[] = [
  note(7, 0.5),
  note(9, 0.5),
  note(7, 0.5),
  note(5, 0.5),
  note(4, 1),
  note(0, 1),
]
const FRERE_JACQUES_DING: SongNote[] = [note(0, 1), note(-5, 1), note(0, 2)]
const FRERE_JACQUES: Song = {
  id: 'frereJacques',
  difficulty: 'easy',
  bpm: 100,
  meter: { pulseBeats: 1, pulsesPerBar: 4, pickupBeats: 0 }, // 4/4
  notes: [
    ...FRERE_JACQUES_WALK,
    ...FRERE_JACQUES_WALK,
    ...FRERE_JACQUES_SLEEP,
    ...FRERE_JACQUES_SLEEP,
    ...FRERE_JACQUES_BELLS,
    ...FRERE_JACQUES_BELLS,
    ...FRERE_JACQUES_DING,
    ...FRERE_JACQUES_DING,
  ],
}

/* London Bridge — C major, range a sixth, with a dotted opening.
 * G. (A) G F | E F G– | D E F– | E F G– | G. (A) G F | E F G– | D– G– | E C–– */
const LONDON_BRIDGE_OPENING: SongNote[] = [
  note(7, 1.5),
  note(9, 0.5),
  note(7, 1),
  note(5, 1),
  note(4, 1),
  note(5, 1),
  note(7, 2),
]
const LONDON_BRIDGE: Song = {
  id: 'londonBridge',
  difficulty: 'easy',
  bpm: 100,
  meter: { pulseBeats: 1, pulsesPerBar: 4, pickupBeats: 0 }, // 4/4
  notes: [
    ...LONDON_BRIDGE_OPENING,
    note(2, 1),
    note(4, 1),
    note(5, 2),
    note(4, 1),
    note(5, 1),
    note(7, 2),
    ...LONDON_BRIDGE_OPENING,
    note(2, 2),
    note(7, 2),
    note(4, 1),
    note(0, 3),
  ],
}

/* Jingle Bells (Pierpont), chorus — C major, range a fifth.
 * E E E– | E E E– | E G C. (D) | E––– | F F F. (F) | F E E (E E) | then
 * E D D E | D– G– the first time, G G F D | C––– the second. */
const JINGLE_BELLS_OPENING: SongNote[] = [
  note(4, 1),
  note(4, 1),
  note(4, 2),
  note(4, 1),
  note(4, 1),
  note(4, 2),
  note(4, 1),
  note(7, 1),
  note(0, 1.5),
  note(2, 0.5),
  note(4, 4),
  note(5, 1),
  note(5, 1),
  note(5, 1.5),
  note(5, 0.5),
  note(5, 1),
  note(4, 1),
  note(4, 1),
  note(4, 0.5),
  note(4, 0.5),
]
const JINGLE_BELLS: Song = {
  id: 'jingleBells',
  difficulty: 'easy',
  bpm: 132,
  /* 4/4 felt in two: at this tempo a quarter pulse would flash faster than
   * the beat lines allow, so the lane marks the half note. */
  meter: { pulseBeats: 2, pulsesPerBar: 2, pickupBeats: 0 },
  notes: [
    ...JINGLE_BELLS_OPENING,
    note(4, 1),
    note(2, 1),
    note(2, 1),
    note(4, 1),
    note(2, 2),
    note(7, 2),
    ...JINGLE_BELLS_OPENING,
    note(7, 1),
    note(7, 1),
    note(5, 1),
    note(2, 1),
    note(0, 4),
  ],
}

/* Greensleeves, first half — A minor in 6/8 with the lilting dotted figure.
 * The Dorian F♯ (+9) colours the opening and the cadence borrows G♯ and F♯
 * below the tonic. Offsets from A: E below = −5, F♯ below = −3, G = −2,
 * G♯ = −1, B = 2, C = 3, D = 5, E = 7, F♯ = 9.
 * (A) | C (D) E. F♯ (E) | D (B) G. A (B) | C (A) A. G♯ (A) | B (G♯) E (A) |
 *       C (D) E. F♯ (E) | D (B) G. A (B) | C. B (A) G♯. F♯ (G♯) | A.. */
const GREENSLEEVES_OPENING: SongNote[] = [
  note(3, 1),
  note(5, 0.5),
  note(7, 0.75),
  note(9, 0.25),
  note(7, 0.5),
  note(5, 1),
  note(2, 0.5),
  note(-2, 0.75),
  note(0, 0.25),
  note(2, 0.5),
]
const GREENSLEEVES: Song = {
  id: 'greensleeves',
  difficulty: 'hard',
  bpm: 60,
  // 6/8: two dotted-quarter pulses per bar, after an eighth pickup
  meter: { pulseBeats: 1.5, pulsesPerBar: 2, pickupBeats: 0.5 },
  notes: [
    note(0, 0.5),
    ...GREENSLEEVES_OPENING,
    note(3, 1),
    note(0, 0.5),
    note(0, 0.75),
    note(-1, 0.25),
    note(0, 0.5),
    note(2, 1),
    note(-1, 0.5),
    note(-5, 1),
    note(0, 0.5),
    ...GREENSLEEVES_OPENING,
    note(3, 0.75),
    note(2, 0.25),
    note(0, 0.5),
    note(-1, 0.75),
    note(-3, 0.25),
    note(-1, 0.5),
    note(0, 3),
  ],
}

/* In the Hall of the Mountain King (Grieg), main theme sung twice — B minor
 * in eighths, creeping by semitone: E♯ (+6) and C♮ (+1) lie outside the key.
 * Offsets from B: C♯ = 2, D = 3, E = 5, F♯ = 7, A = 10, B' = 12.
 * B C♯ D E F♯ D F♯– | E♯ C♯ E♯– E C E– | B C♯ D E F♯ D F♯ B' | A F♯ D F♯ A– · */
const MOUNTAIN_KING_CLIMB: SongNote[] = [
  note(0, 0.5),
  note(2, 0.5),
  note(3, 0.5),
  note(5, 0.5),
  note(7, 0.5),
  note(3, 0.5),
]
const MOUNTAIN_KING_THEME: SongNote[] = [
  ...MOUNTAIN_KING_CLIMB,
  note(7, 1),
  note(6, 0.5),
  note(2, 0.5),
  note(6, 1),
  note(5, 0.5),
  note(1, 0.5),
  note(5, 1),
  ...MOUNTAIN_KING_CLIMB,
  note(7, 0.5),
  note(12, 0.5),
  note(10, 0.5),
  note(7, 0.5),
  note(3, 0.5),
  note(7, 0.5),
  note(10, 1, 1),
]
const MOUNTAIN_KING: Song = {
  id: 'mountainKing',
  difficulty: 'hard',
  bpm: 100,
  meter: { pulseBeats: 1, pulsesPerBar: 4, pickupBeats: 0 }, // 4/4
  notes: [...MOUNTAIN_KING_THEME, ...MOUNTAIN_KING_THEME],
}

/* Habanera (Bizet, Carmen), opening two phrases — D minor, a chromatic slide
 * down from the upper tonic; the second phrase lands on the low tonic. The
 * score's quick ornamental turn on "peut" is a plain eighth here: rounder
 * blocks, like the Happy Birthday pickup.
 * Offsets from D: E = 2, F = 3, G = 5, G♯ = 6, A = 7, B♭ = 8, B = 9, C = 10,
 * C♯ = 11, D' = 12.
 * (D' C♯) | [C C C] B B♭ | A (A A) G♯ G | F (E F) G F | E · (D' C♯) |
 *           [C C C] B B♭ | A (A A) G F  | E (D E) F E | D– */
const TRIPLET_EIGHTH = 1 / 3 // three notes in the space of one quarter
const HABANERA_SLIDE: SongNote[] = [
  note(12, 0.5),
  note(11, 0.5),
  note(10, TRIPLET_EIGHTH),
  note(10, TRIPLET_EIGHTH),
  note(10, TRIPLET_EIGHTH),
  note(9, 0.5),
  note(8, 0.5),
  note(7, 0.5),
  note(7, 0.25),
  note(7, 0.25),
]
const HABANERA: Song = {
  id: 'habanera',
  difficulty: 'hard',
  bpm: 66,
  meter: { pulseBeats: 1, pulsesPerBar: 2, pickupBeats: 1 }, // 2/4
  notes: [
    ...HABANERA_SLIDE,
    note(6, 0.5),
    note(5, 0.5),
    note(3, 0.5),
    note(2, 0.25),
    note(3, 0.25),
    note(5, 0.5),
    note(3, 0.5),
    note(2, 0.5, 0.5),
    ...HABANERA_SLIDE,
    note(5, 0.5),
    note(3, 0.5),
    note(2, 0.5),
    note(0, 0.25),
    note(2, 0.25),
    note(3, 0.5),
    note(2, 0.5),
    note(0, 2),
  ],
}

/* The Entertainer (Joplin), first eight bars of the main strain — C major in
 * 16ths at a slow quarter, syncopated across the bar line. The piano doubles
 * the answer an octave higher; this is the lower octave, so the tune stays
 * within a ninth of its first note. Offsets from C: D = 2, D♯ = 3, E = 4,
 * F♯ = 6, G = 7, A = 9, B = 11, C' = 12, D' = 14, D♯' = 15, E' = 16.
 * (D D♯) | E C'– E C'– E C'~ | ~C'––– C' D' D♯' | E' C' D' E'– B D'– |
 * C'––– (D D♯) | E C'– E C'– E C'~ | ~C'–––– A G | F♯ A C' E'– D' C' A | D'–– */
const ENTERTAINER_RIFF: SongNote[] = [
  note(2, 0.25),
  note(3, 0.25),
  note(4, 0.25),
  note(12, 0.5),
  note(4, 0.25),
  note(12, 0.5),
  note(4, 0.25),
]
const ENTERTAINER: Song = {
  id: 'entertainer',
  difficulty: 'hard',
  bpm: 50,
  // 2/4 felt on the eighth, as Für Elise; the D–D♯ pickup is half a beat
  meter: { pulseBeats: 0.5, pulsesPerBar: 4, pickupBeats: 0.5 },
  notes: [
    ...ENTERTAINER_RIFF,
    note(12, 1.5),
    note(12, 0.25),
    note(14, 0.25),
    note(15, 0.25),
    note(16, 0.25),
    note(12, 0.25),
    note(14, 0.25),
    note(16, 0.5),
    note(11, 0.25),
    note(14, 0.5),
    note(12, 1.5),
    ...ENTERTAINER_RIFF,
    note(12, 1.75),
    note(9, 0.25),
    note(7, 0.25),
    note(6, 0.25),
    note(9, 0.25),
    note(12, 0.25),
    note(16, 0.5),
    note(14, 0.25),
    note(12, 0.25),
    note(9, 0.25),
    note(14, 2),
  ],
}

/* Old MacDonald Had a Farm, first two lines — G major, dipping to the fifth
 * below the tonic. Offsets from G: D below = −5, E below = −3, A = 2, B = 4.
 * G G G D, | E, E, D,– | B B A A | G–– D, | G G G D, | E, E, D,– | B B A A |
 * G––– */
const OLD_MACDONALD_OPENING: SongNote[] = [
  note(0, 1),
  note(0, 1),
  note(0, 1),
  note(-5, 1),
  note(-3, 1),
  note(-3, 1),
  note(-5, 2),
  note(4, 1),
  note(4, 1),
  note(2, 1),
  note(2, 1),
]
const OLD_MACDONALD: Song = {
  id: 'oldMacDonald',
  difficulty: 'easy',
  bpm: 100,
  meter: { pulseBeats: 1, pulsesPerBar: 4, pickupBeats: 0 }, // 4/4
  notes: [
    ...OLD_MACDONALD_OPENING,
    note(0, 3),
    note(-5, 1), // "And": the pickup into the second line
    ...OLD_MACDONALD_OPENING,
    note(0, 4),
  ],
}

/* Brahms' Lullaby (Wiegenlied, Op. 49 No. 4) — C major, 3/4 with a two-eighth
 * pickup, range an octave. Offsets from C: D = 2, E = 4, F = 5, G = 7, A = 9,
 * B = 11, C' = 12.
 * (E E) | G. (E) E | G– (E G) | C' B. (A) | A G (D E) | F D (D E) |
 * F– (D F) | (B A) G B | C'– (C C) | C'– (A F) | G– (E C) | F G A |
 * G– (C C) | C'– (A F) | G– (E C) | F E D | C– */
const BRAHMS_LULLABY_REST: SongNote[] = [
  note(12, 2),
  note(9, 0.5),
  note(5, 0.5),
  note(7, 2),
  note(4, 0.5),
  note(0, 0.5),
]
const BRAHMS_LULLABY: Song = {
  id: 'brahmsLullaby',
  difficulty: 'normal',
  bpm: 96,
  meter: { pulseBeats: 1, pulsesPerBar: 3, pickupBeats: 1 }, // 3/4
  notes: [
    note(4, 0.5),
    note(4, 0.5),
    note(7, 1.5),
    note(4, 0.5),
    note(4, 1),
    note(7, 2),
    note(4, 0.5),
    note(7, 0.5),
    note(12, 1),
    note(11, 1.5),
    note(9, 0.5),
    note(9, 1),
    note(7, 1),
    note(2, 0.5),
    note(4, 0.5),
    note(5, 1),
    note(2, 1),
    note(2, 0.5),
    note(4, 0.5),
    note(5, 2),
    note(2, 0.5),
    note(5, 0.5),
    note(11, 0.5),
    note(9, 0.5),
    note(7, 1),
    note(11, 1),
    note(12, 2),
    note(0, 0.5),
    note(0, 0.5),
    ...BRAHMS_LULLABY_REST,
    note(5, 1),
    note(7, 1),
    note(9, 1),
    note(7, 2),
    note(0, 0.5),
    note(0, 0.5),
    ...BRAHMS_LULLABY_REST,
    note(5, 1),
    note(4, 1),
    note(2, 1),
    note(0, 2),
  ],
}

/* Auld Lang Syne, verse — F major pentatonic, 4/4 with a one-beat pickup and
 * a dotted figure opening every bar. Offsets from F: C below = −5,
 * D below = −3, G = 2, A = 4, C' = 7, D' = 9.
 * (C,) | F. (F) F A | G. (F) G A | F. (F) A C' | D'–– D' |
 *        C'. (A) A F | G. (F) G A | F. (D,) D, C, | F–– */
const AULD_LANG_SYNE_TURN: SongNote[] = [
  note(2, 1.5),
  note(0, 0.5),
  note(2, 1),
  note(4, 1),
]
const AULD_LANG_SYNE: Song = {
  id: 'auldLangSyne',
  difficulty: 'normal',
  bpm: 100,
  meter: { pulseBeats: 1, pulsesPerBar: 4, pickupBeats: 1 }, // 4/4
  notes: [
    note(-5, 1),
    note(0, 1.5),
    note(0, 0.5),
    note(0, 1),
    note(4, 1),
    ...AULD_LANG_SYNE_TURN,
    note(0, 1.5),
    note(0, 0.5),
    note(4, 1),
    note(7, 1),
    note(9, 3),
    note(9, 1),
    note(7, 1.5),
    note(4, 0.5),
    note(4, 1),
    note(0, 1),
    ...AULD_LANG_SYNE_TURN,
    note(0, 1.5),
    note(-3, 0.5),
    note(-3, 1),
    note(-5, 1),
    note(0, 3),
  ],
}

/* Silent Night (Gruber) — C major in 6/8, range a ninth. The first "sleep in
 * heavenly peace" climbs to F', an eleventh above the tonic and wider than
 * the keyboard fits on a phone (KEYBOARD_MIN_SEMITONE_UNIT), so those two
 * bars are left out and the tune goes straight to the closing one.
 * Offsets from C: D = 2, E = 4, F = 5, G = 7, A = 9, B = 11, C' = 12,
 * D' = 14.
 * G. (A) G E.. | G. (A) G E.. | D'– D' B.. | C'– C' G.. |
 * A– A C'. (B) A | G. (A) G E.. | A– A C'. (B) A | G. (A) G E.. |
 * C' G E G. (F) D | C..... */
const SILENT_NIGHT_OPENING: SongNote[] = [
  note(7, 0.75),
  note(9, 0.25),
  note(7, 0.5),
  note(4, 1.5),
]
const SILENT_NIGHT_ROUND: SongNote[] = [
  note(9, 1),
  note(9, 0.5),
  note(12, 0.75),
  note(11, 0.25),
  note(9, 0.5),
]
const SILENT_NIGHT: Song = {
  id: 'silentNight',
  difficulty: 'normal',
  bpm: 72,
  // 6/8: two dotted-quarter pulses per bar
  meter: { pulseBeats: 1.5, pulsesPerBar: 2, pickupBeats: 0 },
  notes: [
    ...SILENT_NIGHT_OPENING,
    ...SILENT_NIGHT_OPENING,
    note(14, 1),
    note(14, 0.5),
    note(11, 1.5),
    note(12, 1),
    note(12, 0.5),
    note(7, 1.5),
    ...SILENT_NIGHT_ROUND,
    ...SILENT_NIGHT_OPENING,
    ...SILENT_NIGHT_ROUND,
    ...SILENT_NIGHT_OPENING,
    note(12, 0.5),
    note(7, 0.5),
    note(4, 0.5),
    note(7, 0.75),
    note(5, 0.25),
    note(2, 0.5),
    note(0, 3),
  ],
}

/* Can-Can (Offenbach, Orpheus in the Underworld), galop theme sung twice —
 * C major in running eighths, range an octave.
 * C– | (D F E D) | G G | (G A E F) | D D | (D F E D) | (C C' B A) |
 * (G F E D) | and again, closing on C. */
const CAN_CAN_RUN: SongNote[] = [
  note(2, 0.5),
  note(5, 0.5),
  note(4, 0.5),
  note(2, 0.5),
]
const CAN_CAN_THEME: SongNote[] = [
  note(0, 2),
  ...CAN_CAN_RUN,
  note(7, 1),
  note(7, 1),
  note(7, 0.5),
  note(9, 0.5),
  note(4, 0.5),
  note(5, 0.5),
  note(2, 1),
  note(2, 1),
  ...CAN_CAN_RUN,
  note(0, 0.5),
  note(12, 0.5),
  note(11, 0.5),
  note(9, 0.5),
  note(7, 0.5),
  note(5, 0.5),
  note(4, 0.5),
  note(2, 0.5),
]
const CAN_CAN: Song = {
  id: 'canCan',
  difficulty: 'hard',
  bpm: 120,
  /* 2/4 felt in one, as a galop is: a quarter pulse would flash faster than
   * the beat lines allow, so the lane marks each bar and bolds every other. */
  meter: { pulseBeats: 2, pulsesPerBar: 2, pickupBeats: 0 },
  notes: [...CAN_CAN_THEME, ...CAN_CAN_THEME, note(0, 4)],
}

/* William Tell Overture (Rossini), finale theme sung twice — E major in 16ths
 * at a slow quarter, a galloping "ti-ti-TUM" on the fifth below the tonic.
 * Offsets from E: B below = −5, D♯ below = −1, F♯ = 2, G♯ = 4, A = 5, B = 7.
 * (B, B,) | B, (B, B,) B, (B, B,) | E F♯ G♯ (B, B,) | B, (B, B,) E (G♯ G♯) |
 * F♯ D♯, B, (B, B,) | B, (B, B,) B, (B, B,) | E F♯ G♯ (E G♯) |
 * B~ (A G♯ F♯) | E G♯ E */
const WILLIAM_TELL_GALLOP: SongNote[] = [
  note(-5, 0.25),
  note(-5, 0.25),
  note(-5, 0.5),
]
const WILLIAM_TELL_CALL: SongNote[] = [
  ...WILLIAM_TELL_GALLOP,
  ...WILLIAM_TELL_GALLOP,
  note(-5, 0.25),
  note(-5, 0.25),
  note(0, 0.5),
  note(2, 0.5),
  note(4, 0.5),
]
const WILLIAM_TELL_THEME: SongNote[] = [
  ...WILLIAM_TELL_CALL,
  ...WILLIAM_TELL_GALLOP,
  note(-5, 0.25),
  note(-5, 0.25),
  note(0, 0.5),
  note(4, 0.25),
  note(4, 0.25),
  note(2, 0.5),
  note(-1, 0.5),
  note(-5, 0.5),
  ...WILLIAM_TELL_CALL,
  note(0, 0.25),
  note(4, 0.25),
  note(7, 1.25), // a quarter tied to the first 16th of the run down
  note(5, 0.25),
  note(4, 0.25),
  note(2, 0.25),
  note(0, 0.5),
  note(4, 0.5),
  note(0, 0.5),
]
const WILLIAM_TELL: Song = {
  id: 'williamTell',
  difficulty: 'hard',
  bpm: 72,
  // 2/4; the two-16th pickup is half a beat
  meter: { pulseBeats: 1, pulsesPerBar: 2, pickupBeats: 0.5 },
  notes: [...WILLIAM_TELL_THEME, ...WILLIAM_TELL_THEME],
}

/* Swan Lake (Tchaikovsky), swan theme sung twice — B minor, falling a fifth
 * from the held F♯ and then leaping through the G below the tonic.
 * Offsets from B: G below = −4, C♯ = 2, D = 3, E = 5, F♯ = 7.
 * F♯– (B C♯ D E) | F♯. (D) F♯. (D) | F♯. (B)(D B)(G, D) | B––– */
const SWAN_LAKE_PHRASE: SongNote[] = [
  note(7, 2),
  note(0, 0.5),
  note(2, 0.5),
  note(3, 0.5),
  note(5, 0.5),
  note(7, 1.5),
  note(3, 0.5),
  note(7, 1.5),
  note(3, 0.5),
  note(7, 1.5),
  note(0, 0.5),
  note(3, 0.5),
  note(0, 0.5),
  note(-4, 0.5),
  note(3, 0.5),
]
const SWAN_LAKE: Song = {
  id: 'swanLake',
  difficulty: 'hard',
  bpm: 80,
  meter: { pulseBeats: 1, pulsesPerBar: 4, pickupBeats: 0 }, // 4/4
  notes: [
    ...SWAN_LAKE_PHRASE,
    note(0, 3, 1), // a beat to breathe before the repeat
    ...SWAN_LAKE_PHRASE,
    note(0, 4),
  ],
}

/* Pachelbel's Canon, the first two violin phrases — D major, all half notes
 * stepping down from the third, then a closing low tonic that the canon itself
 * never stops on. The tonic is the upper D, so most of the tune lies below it.
 * Offsets from D: F♯ = 4, E = 2, C♯ = −1, B = −3, A = −5, G = −7, F♯, = −8,
 * E, = −10, D, = −12.
 * F♯ E | D C♯ | B A | B C♯ | D C♯ | B A | G F♯, | G E, | D,––– */
const PACHELBEL_CANON: Song = {
  id: 'pachelbelCanon',
  difficulty: 'easy',
  bpm: 100,
  meter: { pulseBeats: 1, pulsesPerBar: 4, pickupBeats: 0 }, // 4/4
  notes: [
    note(4, 2),
    note(2, 2),
    note(0, 2),
    note(-1, 2),
    note(-3, 2),
    note(-5, 2),
    note(-3, 2),
    note(-1, 2),
    note(0, 2),
    note(-1, 2),
    note(-3, 2),
    note(-5, 2),
    note(-7, 2),
    note(-8, 2),
    note(-7, 2),
    note(-10, 2),
    note(-12, 4),
  ],
}

/* Pachelbel's Canon, the running variation — D major, on the same upper-D
 * tonic as the theme above. Pachelbel wrote it in 16ths and 32nds; the values
 * are doubled here, as the theme's half notes are. The variation's own second
 * bar dips to the low D, a span of 19 semitones and wider than the keyboard
 * fits on a phone (KEYBOARD_MIN_SEMITONE_UNIT), so the second bar is borrowed
 * from the next variation, which runs over the same bass, and the excerpt
 * closes on the tonic that bar leads into.
 * Offsets from D: F♯, = −8, G, = −7, A, = −5, B = −3, C♯ = −1, E = 2, F♯ = 4,
 * G = 5, A = 7.
 * A (F♯ G) A (F♯ G)(A A, B C♯)(D E F♯ G) |
 * F♯ (D E) F♯ (F♯, G,)(A, B A, G,)(A, F♯, G, A,) |
 * B (D C♯) B (A, G,)(A, G, F♯, G,)(A, B C♯ D) |
 * B (D C♯) D (C♯ B)(C♯ D E D)(C♯ D B C♯) | D––– */
function canonFigure(midiOffsets: number[]): SongNote[] {
  return midiOffsets.map((midiOffset, index) =>
    // An eighth on the 1st and 4th note; the other twelve are 16ths
    note(midiOffset, index === 0 || index === 3 ? 0.5 : 0.25),
  )
}
const PACHELBEL_CANON_VARIATION: Song = {
  id: 'pachelbelCanonVariation',
  difficulty: 'hard',
  bpm: 60,
  meter: { pulseBeats: 1, pulsesPerBar: 4, pickupBeats: 0 }, // 4/4
  notes: [
    ...canonFigure([7, 4, 5, 7, 4, 5, 7, -5, -3, -1, 0, 2, 4, 5]),
    ...canonFigure([4, 0, 2, 4, -8, -7, -5, -3, -5, -7, -5, -8, -7, -5]),
    ...canonFigure([-3, 0, -1, -3, -5, -7, -5, -7, -8, -7, -5, -3, -1, 0]),
    ...canonFigure([-3, 0, -1, 0, -1, -3, -1, 0, 2, 0, -1, 0, -3, -1]),
    note(0, 4),
  ],
}

/* Sakura Sakura (Japan) — the in scale on E (E F A B C), which has no third
 * and leans on its two semitones. The middle lines repeat the second and
 * third, so they are left out to keep the tune under 30 s.
 * Offsets from E: B below = −5, C below = −4, F = 1, A = 5, B = 7, C' = 8.
 * A A B– | A A B– | A B C' B | A (B A) F– | E C, E F | E (E C,) B,– |
 * A A B– | A A B– | E F (B A) F | E––– */
const SAKURA_CALL: SongNote[] = [note(5, 1), note(5, 1), note(7, 2)]
const SAKURA: Song = {
  id: 'sakura',
  difficulty: 'normal',
  bpm: 84,
  meter: { pulseBeats: 1, pulsesPerBar: 4, pickupBeats: 0 }, // 4/4
  notes: [
    ...SAKURA_CALL,
    ...SAKURA_CALL,
    note(5, 1),
    note(7, 1),
    note(8, 1),
    note(7, 1),
    note(5, 1),
    note(7, 0.5),
    note(5, 0.5),
    note(1, 2),
    note(0, 1),
    note(-4, 1),
    note(0, 1),
    note(1, 1),
    note(0, 1),
    note(0, 0.5),
    note(-4, 0.5),
    note(-5, 2),
    ...SAKURA_CALL,
    ...SAKURA_CALL,
    note(0, 1),
    note(1, 1),
    note(7, 0.5),
    note(5, 0.5),
    note(1, 1),
    note(0, 4),
  ],
}

/* Mo Li Hua (Jasmine Flower, China), first four lines — C major pentatonic in
 * 2/4, range an octave; the fourth line comes to rest on the tonic.
 * Offsets from C: D = 2, E = 4, G = 7, A = 9, C' = 12.
 * E (E G) | (A C')(C' A) | G (G A) | G– | and again |
 * G G | G (E G) | A A | G– | E (D E) | G (E D) | C (C D) | C– */
const MO_LI_HUA_OPENING: SongNote[] = [
  note(4, 1),
  note(4, 0.5),
  note(7, 0.5),
  note(9, 0.5),
  note(12, 0.5),
  note(12, 0.5),
  note(9, 0.5),
  note(7, 1),
  note(7, 0.5),
  note(9, 0.5),
  note(7, 2),
]
const MO_LI_HUA: Song = {
  id: 'moLiHua',
  difficulty: 'normal',
  bpm: 84,
  meter: { pulseBeats: 1, pulsesPerBar: 2, pickupBeats: 0 }, // 2/4
  notes: [
    ...MO_LI_HUA_OPENING,
    ...MO_LI_HUA_OPENING,
    note(7, 1),
    note(7, 1),
    note(7, 1),
    note(4, 0.5),
    note(7, 0.5),
    note(9, 1),
    note(9, 1),
    note(7, 2),
    note(4, 1),
    note(2, 0.5),
    note(4, 0.5),
    note(7, 1),
    note(4, 0.5),
    note(2, 0.5),
    note(0, 1),
    note(0, 0.5),
    note(2, 0.5),
    note(0, 2),
  ],
}

/* La Cucaracha (Mexico), refrain — D major, a three-eighth pickup into every
 * line and a 3 + 2 + 3 eighth bar: "ra" is a dotted quarter, "cha" a quarter.
 * Offsets from D: A below = −5, B below = −3, C♯ below = −1, E = 2, F♯ = 4,
 * G = 5, A = 7, B = 9.
 * (A, A, A,) | D. F♯ (A, A, A,) | D. F♯–– | · D (D)(C♯ C♯)(B, B,) |
 * A,– · (A, A, A,) | C♯. E (A, A, A,) | C♯. E–– | · A (B)(A G)(F♯ E) | D–– */
const LA_CUCARACHA_PICKUP: SongNote[] = [
  note(-5, 0.5),
  note(-5, 0.5),
  note(-5, 0.5),
]
const LA_CUCARACHA: Song = {
  id: 'laCucaracha',
  difficulty: 'normal',
  bpm: 100,
  // 4/4; the three-eighth pickup is a beat and a half
  meter: { pulseBeats: 1, pulsesPerBar: 4, pickupBeats: 1.5 },
  notes: [
    ...LA_CUCARACHA_PICKUP,
    note(0, 1.5),
    note(4, 1),
    ...LA_CUCARACHA_PICKUP,
    note(0, 1.5),
    note(4, 2.5, 0.5),
    note(0, 1),
    note(0, 0.5),
    note(-1, 0.5),
    note(-1, 0.5),
    note(-3, 0.5),
    note(-3, 0.5),
    note(-5, 2, 0.5),
    ...LA_CUCARACHA_PICKUP,
    note(-1, 1.5),
    note(2, 1),
    ...LA_CUCARACHA_PICKUP,
    note(-1, 1.5),
    note(2, 2.5, 0.5),
    note(7, 1),
    note(9, 0.5),
    note(7, 0.5),
    note(5, 0.5),
    note(4, 0.5),
    note(2, 0.5),
    note(0, 2.5),
  ],
}

/* Korobeiniki (Russia), first strain — A minor, a brisk dance tune that
 * falls from the fifth and then leaps to the upper tonic.
 * Offsets from A: B = 2, C = 3, D = 5, E = 7, F = 8, G = 10, A' = 12.
 * E (B C) D (C B) | A (A C) E (D C) | B. (C) D E | C A A– |
 * D. (F) A' (G F) | E. (C) E (D C) | B (B C) D E | C A A– */
const KOROBEINIKI_CADENCE: SongNote[] = [note(3, 1), note(0, 1), note(0, 2)]
const KOROBEINIKI: Song = {
  id: 'korobeiniki',
  difficulty: 'hard',
  bpm: 120,
  // 4/4 felt in two, as Jingle Bells: a quarter pulse would flash too fast
  meter: { pulseBeats: 2, pulsesPerBar: 2, pickupBeats: 0 },
  notes: [
    note(7, 1),
    note(2, 0.5),
    note(3, 0.5),
    note(5, 1),
    note(3, 0.5),
    note(2, 0.5),
    note(0, 1),
    note(0, 0.5),
    note(3, 0.5),
    note(7, 1),
    note(5, 0.5),
    note(3, 0.5),
    note(2, 1.5),
    note(3, 0.5),
    note(5, 1),
    note(7, 1),
    ...KOROBEINIKI_CADENCE,
    note(5, 1.5),
    note(8, 0.5),
    note(12, 1),
    note(10, 0.5),
    note(8, 0.5),
    note(7, 1.5),
    note(3, 0.5),
    note(7, 1),
    note(5, 0.5),
    note(3, 0.5),
    note(2, 1),
    note(2, 0.5),
    note(3, 0.5),
    note(5, 1),
    note(7, 1),
    ...KOROBEINIKI_CADENCE,
  ],
}

/* Lamma Bada Yatathanna (Arabic muwashshah), first three bars — maqam
 * Nahawand on G, which is G minor with a raised leading tone (F♯), in the
 * 10/8 samai rhythm. The next bars fall an octave lower, a span of 20
 * semitones and wider than the keyboard fits on a phone
 * (KEYBOARD_MIN_SEMITONE_UNIT), so the excerpt closes on the third bar's
 * tonic instead. Offsets from G: D below = −5, F♯ below = −1, A = 2, B♭ = 3,
 * C = 5, D = 7.
 * (D,) | G– (A B♭)(C B♭ B♭ A)(A G G F♯) G– D, | G– (A B♭)(C B♭ B♭ A)
 * (A G G F♯) G– (A B♭) | C– D B♭. (A)(A G G F♯) G–– */
const LAMMA_BADA_OPENING: SongNote[] = [
  note(0, 1),
  note(2, 0.25),
  note(3, 0.25),
  note(5, 0.25),
  note(3, 0.25),
  note(3, 0.25),
  note(2, 0.25),
  note(2, 0.25),
  note(0, 0.25),
  note(0, 0.25),
  note(-1, 0.25),
  note(0, 1),
]
const LAMMA_BADA: Song = {
  id: 'lammaBada',
  difficulty: 'hard',
  bpm: 50,
  /* 10/8 felt on the eighth, as Für Elise: the samai's 3 + 2 + 2 + 3 grouping
   * has no even pulse a bar could be split into. The pickup is one eighth. */
  meter: { pulseBeats: 0.5, pulsesPerBar: 10, pickupBeats: 0.5 },
  notes: [
    note(-5, 0.5),
    ...LAMMA_BADA_OPENING,
    note(-5, 0.5),
    ...LAMMA_BADA_OPENING,
    note(2, 0.25),
    note(3, 0.25),
    note(5, 1),
    note(7, 0.5),
    note(3, 0.75),
    note(2, 0.25),
    note(2, 0.25),
    note(0, 0.25),
    note(0, 0.25),
    note(-1, 0.25),
    note(0, 1.5),
  ],
}

/* Burung Kakatua (Indonesia, Maluku), verse — C major waltz, range an octave,
 * with a one-beat pickup into each line and a leap of a sixth up to the high
 * tonic on "kak". Offsets from C: D = 2, E = 4, F = 5, G = 7, A = 9, B = 11,
 * C' = 12.
 * (G) | G– E | C'– E | D–– | D · (E) | F– A | G– F | E–– | E · (G) |
 *       G– E | C'– E | D–– | D · (B A) | G– F | E– D | C–– | C · */
const BURUNG_KAKATUA_CALL: SongNote[] = [
  note(7, 1),
  note(7, 2),
  note(4, 1),
  note(12, 2),
  note(4, 1),
  note(2, 4, 1), // "a": a full bar tied into the next, then a beat of rest
]
const BURUNG_KAKATUA: Song = {
  id: 'burungKakatua',
  difficulty: 'easy',
  bpm: 100,
  meter: { pulseBeats: 1, pulsesPerBar: 3, pickupBeats: 1 }, // 3/4
  notes: [
    ...BURUNG_KAKATUA_CALL,
    note(4, 1),
    note(5, 2),
    note(9, 1),
    note(7, 2),
    note(5, 1),
    note(4, 4, 1),
    ...BURUNG_KAKATUA_CALL,
    note(11, 0.5),
    note(9, 0.5),
    note(7, 2),
    note(5, 1),
    note(4, 2),
    note(2, 1),
    note(0, 4, 1),
  ],
}

/* Shosholoza (Southern Africa), call sung twice — G major, range a fourth,
 * with the answering lines entering off the beat. The score's dotted-eighth +
 * 16th figures are plain eighths here: rounder blocks, like the Happy Birthday
 * pickup. Offsets from G: A = 2, B = 4, C = 5.
 * G. (A)(B A) G | · (C C)(G C) B (A | A)(A A)(A B)(B A) B~ | ~(A) G · · |
 * (G G)(G A)(B A)(G) · | · (C C)(G C) B (A | A)(A A)(A B)(B A) B~ | ~(A) G–– */
const SHOSHOLOZA_ANSWER: SongNote[] = [
  note(5, 0.5),
  note(5, 0.5),
  note(0, 0.5),
  note(5, 0.5),
  note(4, 1),
  note(2, 0.5),
  note(2, 0.5),
  note(2, 0.5),
  note(2, 0.5),
  note(2, 0.5),
  note(4, 0.5),
  note(4, 0.5),
  note(2, 0.5),
  note(4, 1), // tied across the bar line
  note(2, 0.5),
]
const SHOSHOLOZA: Song = {
  id: 'shosholoza',
  difficulty: 'normal',
  bpm: 100,
  meter: { pulseBeats: 1, pulsesPerBar: 4, pickupBeats: 0 }, // 4/4
  notes: [
    note(0, 1.5),
    note(2, 0.5),
    note(4, 0.5),
    note(2, 0.5),
    note(0, 1, 0.5),
    ...SHOSHOLOZA_ANSWER,
    note(0, 1, 2),
    note(0, 0.5),
    note(0, 0.5),
    note(0, 0.5),
    note(2, 0.5),
    note(4, 0.5),
    note(2, 0.5),
    note(0, 0.5, 1),
    ...SHOSHOLOZA_ANSWER,
    note(0, 3),
  ],
}

/* Arirang (Korea), refrain — F major pentatonic in 9/8, range a sixth from
 * the fifth below the tonic. Each bar leans on a long first note and turns
 * through its upper neighbour.
 * Offsets from F: C below = −5, D below = −3, G = 2, A = 4.
 * C,–. (D,) C, (D,) | F–. (G) F (G) | A. (G A G) F (D,) | C,–. (D, C, D,) · |
 * F–. (G) F (G) | A (G) F (D,) C, (D,) | F–. (G) F. | F–– · */
const ARIRANG_RISE: SongNote[] = [
  note(0, 2.5),
  note(2, 0.5),
  note(0, 1),
  note(2, 0.5),
]
const ARIRANG: Song = {
  id: 'arirang',
  difficulty: 'normal',
  bpm: 108,
  // 9/8: three dotted-quarter pulses (1.5 beats each) per bar
  meter: { pulseBeats: 1.5, pulsesPerBar: 3, pickupBeats: 0 },
  notes: [
    note(-5, 2.5),
    note(-3, 0.5),
    note(-5, 1),
    note(-3, 0.5),
    ...ARIRANG_RISE,
    note(4, 1.5),
    note(2, 0.5),
    note(4, 0.5),
    note(2, 0.5),
    note(0, 1),
    note(-3, 0.5),
    note(-5, 2.5),
    note(-3, 0.5),
    note(-5, 0.5),
    note(-3, 0.5, 0.5),
    ...ARIRANG_RISE,
    note(4, 1),
    note(2, 0.5),
    note(0, 1),
    note(-3, 0.5),
    note(-5, 1),
    note(-3, 0.5),
    note(0, 2.5),
    note(2, 0.5),
    note(0, 1.5),
    note(0, 3, 1.5),
  ],
}

/* Eine kleine Nachtmusik (Mozart, K. 525), opening theme sung twice — G major,
 * a fanfare up and down the tonic and dominant chords that ends, as the score
 * does, on the low fifth. Offsets from G: D below = −5, F♯ below = −1, A = 2,
 * B = 4, C = 5, D = 7.
 * G · (D,) G · (D,) | (G D,)(G B) D' · | C · (A) C · (A) | (C A)(F♯ A) D, · */
const EINE_KLEINE_NACHTMUSIK_THEME: SongNote[] = [
  note(0, 1, 0.5),
  note(-5, 0.5),
  note(0, 1, 0.5),
  note(-5, 0.5),
  note(0, 0.5),
  note(-5, 0.5),
  note(0, 0.5),
  note(4, 0.5),
  note(7, 1, 1),
  note(5, 1, 0.5),
  note(2, 0.5),
  note(5, 1, 0.5),
  note(2, 0.5),
  note(5, 0.5),
  note(2, 0.5),
  note(-1, 0.5),
  note(2, 0.5),
  note(-5, 1, 1),
]
const EINE_KLEINE_NACHTMUSIK: Song = {
  id: 'eineKleineNachtmusik',
  difficulty: 'hard',
  bpm: 120,
  // 4/4 felt in two, as Jingle Bells: a quarter pulse would flash too fast
  meter: { pulseBeats: 2, pulsesPerBar: 2, pickupBeats: 0 },
  notes: [...EINE_KLEINE_NACHTMUSIK_THEME, ...EINE_KLEINE_NACHTMUSIK_THEME],
}

export const SONGS: Record<SongId, Song> = {
  twinkle: TWINKLE,
  odeToJoy: ODE_TO_JOY,
  happyBirthday: HAPPY_BIRTHDAY,
  furElise: FUR_ELISE,
  maryLamb: MARY_LAMB,
  frereJacques: FRERE_JACQUES,
  londonBridge: LONDON_BRIDGE,
  jingleBells: JINGLE_BELLS,
  greensleeves: GREENSLEEVES,
  mountainKing: MOUNTAIN_KING,
  habanera: HABANERA,
  entertainer: ENTERTAINER,
  oldMacDonald: OLD_MACDONALD,
  brahmsLullaby: BRAHMS_LULLABY,
  auldLangSyne: AULD_LANG_SYNE,
  silentNight: SILENT_NIGHT,
  canCan: CAN_CAN,
  williamTell: WILLIAM_TELL,
  swanLake: SWAN_LAKE,
  pachelbelCanon: PACHELBEL_CANON,
  pachelbelCanonVariation: PACHELBEL_CANON_VARIATION,
  sakura: SAKURA,
  moLiHua: MO_LI_HUA,
  laCucaracha: LA_CUCARACHA,
  korobeiniki: KOROBEINIKI,
  lammaBada: LAMMA_BADA,
  burungKakatua: BURUNG_KAKATUA,
  shosholoza: SHOSHOLOZA,
  arirang: ARIRANG,
  eineKleineNachtmusik: EINE_KLEINE_NACHTMUSIK,
}

export type SongDifficultyGroup = {
  difficulty: SongDifficulty
  songIds: SongId[]
}

/* The songs under each difficulty, easy first — the Song picker's groups. */
export function groupSongIdsByDifficulty(): SongDifficultyGroup[] {
  return SONG_DIFFICULTIES.map((difficulty) => ({
    difficulty,
    songIds: SONG_IDS.filter((id) => SONGS[id].difficulty === difficulty),
  }))
}
