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
  'rowYourBoat',
  'whenTheSaints',
  'amazingGrace',
  'ohSusanna',
  'greensleeves',
  'mountainKing',
  'habanera',
  'entertainer',
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

export type Song = {
  id: SongId
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

/* Row, Row, Row Your Boat — C major, 6/8, range an octave. The "merrily"
 * line walks down the tonic chord from the top.
 * C. C. | C (D) E. | E (D) E (F) | G.. | (C' C' C')(G G G)(E E E)(C C C) |
 * G (F) E (D) | C.. */
const ROW_YOUR_BOAT: Song = {
  id: 'rowYourBoat',
  bpm: 100,
  // 6/8: two dotted-quarter pulses (1.5 beats each) per bar
  meter: { pulseBeats: 1.5, pulsesPerBar: 2, pickupBeats: 0 },
  notes: [
    note(0, 1.5),
    note(0, 1.5),
    note(0, 1),
    note(2, 0.5),
    note(4, 1.5),
    note(4, 1),
    note(2, 0.5),
    note(4, 1),
    note(5, 0.5),
    note(7, 3),
    note(12, 0.5),
    note(12, 0.5),
    note(12, 0.5),
    note(7, 0.5),
    note(7, 0.5),
    note(7, 0.5),
    note(4, 0.5),
    note(4, 0.5),
    note(4, 0.5),
    note(0, 0.5),
    note(0, 0.5),
    note(0, 0.5),
    note(7, 1),
    note(5, 0.5),
    note(4, 1),
    note(2, 0.5),
    note(0, 3),
  ],
}

/* When the Saints Go Marching In — C major, range a fifth, long held notes.
 * (C E F) | G––– | · C E F | G––– | · C E F | G– E– | C– E– | D––– |
 * · E E D | C––– | E– G– | G F–– | · · E F | G– E– | C– D– | C––– */
const WHEN_THE_SAINTS_CALL: SongNote[] = [note(0, 1), note(4, 1), note(5, 1)]
const WHEN_THE_SAINTS: Song = {
  id: 'whenTheSaints',
  bpm: 150,
  // 4/4 felt in two (half-note pulse), entered on a three-quarter pickup
  meter: { pulseBeats: 2, pulsesPerBar: 2, pickupBeats: 3 },
  notes: [
    ...WHEN_THE_SAINTS_CALL,
    note(7, 4, 1),
    ...WHEN_THE_SAINTS_CALL,
    note(7, 4, 1),
    ...WHEN_THE_SAINTS_CALL,
    note(7, 2),
    note(4, 2),
    note(0, 2),
    note(4, 2),
    note(2, 4, 1),
    note(4, 1),
    note(4, 1),
    note(2, 1),
    note(0, 4),
    note(4, 2),
    note(7, 2),
    note(7, 1),
    note(5, 3, 2),
    note(4, 1),
    note(5, 1),
    note(7, 2),
    note(4, 2),
    note(0, 2),
    note(2, 2),
    note(0, 4),
  ],
}

/* Amazing Grace (New Britain) — G major pentatonic, 3/4 with a one-beat
 * pickup, range an octave from the fifth below the tonic to the fifth above.
 * Offsets from G: D below = −5, E below = −3, A = 2, B = 4, D' = 7.
 * (D,) | G– (B G) | B– A | G– E, | D,– D, | G– (B G) | B– A | D'––|–– B |
 * D'. (B)(D' B) | G– D, | E,. (G)(G E,) | D,– D, | G– (B G) | B– A | G–– */
const AMAZING_GRACE_OPENING: SongNote[] = [
  note(0, 2),
  note(4, 0.5),
  note(0, 0.5),
  note(4, 2),
  note(2, 1),
]
const AMAZING_GRACE: Song = {
  id: 'amazingGrace',
  bpm: 100,
  meter: { pulseBeats: 1, pulsesPerBar: 3, pickupBeats: 1 }, // 3/4
  notes: [
    note(-5, 1),
    ...AMAZING_GRACE_OPENING,
    note(0, 2),
    note(-3, 1),
    note(-5, 2),
    note(-5, 1),
    ...AMAZING_GRACE_OPENING,
    note(7, 5), // "me": a full bar tied into the next
    note(4, 1),
    note(7, 1.5),
    note(4, 0.5),
    note(7, 0.5),
    note(4, 0.5),
    note(0, 2),
    note(-5, 1),
    note(-3, 1.5),
    note(0, 0.5),
    note(0, 0.5),
    note(-3, 0.5),
    note(-5, 2),
    note(-5, 1),
    ...AMAZING_GRACE_OPENING,
    note(0, 3),
  ],
}

/* Oh! Susanna (Foster), verse — C major pentatonic, range a sixth, with a
 * two-eighth pickup into each line.
 * (C D) | E G G. (A) | G E C. (D) | E E D C | D–– (C D) |
 *         E G G. (A) | G E C. (D) | E E D D | C––– */
const OH_SUSANNA_LINE: SongNote[] = [
  note(0, 0.5),
  note(2, 0.5),
  note(4, 1),
  note(7, 1),
  note(7, 1.5),
  note(9, 0.5),
  note(7, 1),
  note(4, 1),
  note(0, 1.5),
  note(2, 0.5),
  note(4, 1),
  note(4, 1),
  note(2, 1),
]
const OH_SUSANNA: Song = {
  id: 'ohSusanna',
  bpm: 100,
  meter: { pulseBeats: 1, pulsesPerBar: 4, pickupBeats: 1 }, // 4/4
  notes: [
    ...OH_SUSANNA_LINE,
    note(0, 1),
    note(2, 3),
    ...OH_SUSANNA_LINE,
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

export const SONGS: Record<SongId, Song> = {
  twinkle: TWINKLE,
  odeToJoy: ODE_TO_JOY,
  happyBirthday: HAPPY_BIRTHDAY,
  furElise: FUR_ELISE,
  maryLamb: MARY_LAMB,
  frereJacques: FRERE_JACQUES,
  londonBridge: LONDON_BRIDGE,
  jingleBells: JINGLE_BELLS,
  rowYourBoat: ROW_YOUR_BOAT,
  whenTheSaints: WHEN_THE_SAINTS,
  amazingGrace: AMAZING_GRACE,
  ohSusanna: OH_SUSANNA,
  greensleeves: GREENSLEEVES,
  mountainKing: MOUNTAIN_KING,
  habanera: HABANERA,
  entertainer: ENTERTAINER,
}
