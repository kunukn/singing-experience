/* Sing the Keys — melody data.
 *
 * Pitches are semitone offsets from the song's tonic, so one start-tone pick
 * transposes any song: sounding MIDI = tonicMidi + midiOffset. Durations are in
 * quarter-note beats; `bpm` is the song's own quarter-note tempo, scaled by the
 * speed select at play time. All four tunes are public domain. */

export type SongNote = {
  /* Semitones from the tonic. Negative for notes below it (Happy Birthday
   * starts on the fifth below). */
  midiOffset: number
  /* Duration in quarter-note beats: 0.25 = 16th, 0.5 = ♪, 1 = ♩, 2 = 𝅗𝅥. */
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
] as const

export type SongId = (typeof SONG_IDS)[number]

export type Song = {
  id: SongId
  /* Quarter notes per minute at 1× speed. */
  bpm: number
  notes: SongNote[]
}

export const DEFAULT_SONG_ID: SongId = 'twinkle'

/* Largest first — see "Vertical Ordering" in AGENTS.md. */
export const SPEED_OPTIONS = [1.25, 1, 0.75, 0.5] as const

export type SpeedOption = (typeof SPEED_OPTIONS)[number]

export const DEFAULT_SPEED: SpeedOption = 1

/* G3 — the same tonic default as Do-Re-Mi (DEFAULT_STARTING_SEMITONE_OFFSET). */
export const DEFAULT_START_OFFSET = 7

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

export const SONGS: Record<SongId, Song> = {
  twinkle: TWINKLE,
  odeToJoy: ODE_TO_JOY,
  happyBirthday: HAPPY_BIRTHDAY,
  furElise: FUR_ELISE,
}
