/*
 * Computer-keyboard → pitch map for the on-screen piano.
 *
 * Two QWERTY rows, two octaves — the layout every DAW virtual keyboard uses
 * (FL Studio, GarageBand's Musical Typing, tracker software):
 *
 *     2 3   5 6 7  9 0      ← C♯4 D♯4   F♯4 G♯4 A♯4  C♯5 D♯5
 *    Q W E R T Y U I O P    ← C4 D4 E4 F4 G4 A4 B4 C5 D5 E5
 *     S D   G H J  L ;      ← C♯3 D♯3   F♯3 G♯3 A♯3  C♯4 D♯4
 *    Z X C V B N M , . /    ← C3 D3 E3 F3 G3 A3 B3 C4 D4 E4
 *
 * The map is ABSOLUTE, not relative to the selected voice range: Z is always C3
 * and Q is always C4, whichever range the singer picks. Keys landing outside the
 * current range are inert rather than remapped — a key's pitch never moves, so
 * muscle memory survives a range change.
 *
 * Anchoring the lower row at C3 (rather than middle C) is what keeps the low
 * presets usable: "Comfy men" (C3–C4) reaches all 13 of its notes from a C3
 * anchor but only one from a C4 anchor. Middle C then lands on Q, matching the
 * FL Studio / tracker convention of lower row = base octave, upper row = base+1.
 *
 * The last five keys of each row overlap the row above (`,` and Q both play C4).
 * That redundancy is deliberate — it puts a full C-major scale under one row —
 * and it is why the binding order matters (see PIANO_KEYBOARD_BINDINGS).
 *
 * Codes, not characters: KeyboardEvent.code is the key's PHYSICAL position, so
 * the instrument stays under the same fingers on AZERTY, QWERTZ and Dvorak even
 * though the printed letters differ.
 */

/* C3 — the pitch of the lower row's leftmost key (Z). */
export const PIANO_KEYBOARD_BASE_MIDI = 48

export type PianoKeyboardBinding = {
  /* KeyboardEvent.code — physical key position, layout-independent. */
  code: string
  /* Semitones above PIANO_KEYBOARD_BASE_MIDI. */
  semitoneOffset: number
}

/*
 * Order decides which character gets printed on a key that has two bindings
 * (C4–E4 sit on both rows): the first binding wins. The upper row is listed
 * before the lower row's overflow keys so those pitches advertise Q/2/W/3/E —
 * the start of a complete octave — rather than the stray `,` `L` `.` `;` `/`.
 */
const PIANO_KEYBOARD_BINDINGS: PianoKeyboardBinding[] = [
  /* Lower row — C3 octave */
  { code: 'KeyZ', semitoneOffset: 0 }, // C3
  { code: 'KeyS', semitoneOffset: 1 },
  { code: 'KeyX', semitoneOffset: 2 },
  { code: 'KeyD', semitoneOffset: 3 },
  { code: 'KeyC', semitoneOffset: 4 },
  { code: 'KeyV', semitoneOffset: 5 },
  { code: 'KeyG', semitoneOffset: 6 },
  { code: 'KeyB', semitoneOffset: 7 },
  { code: 'KeyH', semitoneOffset: 8 },
  { code: 'KeyN', semitoneOffset: 9 },
  { code: 'KeyJ', semitoneOffset: 10 },
  { code: 'KeyM', semitoneOffset: 11 }, // B3

  /* Upper row — C4 octave */
  { code: 'KeyQ', semitoneOffset: 12 }, // C4 (middle C)
  { code: 'Digit2', semitoneOffset: 13 },
  { code: 'KeyW', semitoneOffset: 14 },
  { code: 'Digit3', semitoneOffset: 15 },
  { code: 'KeyE', semitoneOffset: 16 },
  { code: 'KeyR', semitoneOffset: 17 },
  { code: 'Digit5', semitoneOffset: 18 },
  { code: 'KeyT', semitoneOffset: 19 },
  { code: 'Digit6', semitoneOffset: 20 },
  { code: 'KeyY', semitoneOffset: 21 },
  { code: 'Digit7', semitoneOffset: 22 },
  { code: 'KeyU', semitoneOffset: 23 }, // B4
  /* Upper row overflow — reaches into the C5 octave */
  { code: 'KeyI', semitoneOffset: 24 }, // C5
  { code: 'Digit9', semitoneOffset: 25 },
  { code: 'KeyO', semitoneOffset: 26 },
  { code: 'Digit0', semitoneOffset: 27 },
  { code: 'KeyP', semitoneOffset: 28 }, // E5

  /* Lower row overflow — duplicates C4–E4 so one row spans a full C scale */
  { code: 'Comma', semitoneOffset: 12 },
  { code: 'KeyL', semitoneOffset: 13 },
  { code: 'Period', semitoneOffset: 14 },
  { code: 'Semicolon', semitoneOffset: 15 },
  { code: 'Slash', semitoneOffset: 16 },
]

const MIDI_BY_CODE = new Map(
  PIANO_KEYBOARD_BINDINGS.map((binding) => [
    binding.code,
    PIANO_KEYBOARD_BASE_MIDI + binding.semitoneOffset,
  ]),
)

const CODE_BY_MIDI = new Map<number, string>()
for (const [code, midi] of MIDI_BY_CODE) {
  if (!CODE_BY_MIDI.has(midi)) CODE_BY_MIDI.set(midi, code)
}

/* The pitch a physical key plays, or null when the key is not part of the map. */
export function midiForKeyboardCode(code: string): number | null {
  return MIDI_BY_CODE.get(code) ?? null
}

/* The key to print on a piano key, or null when the pitch is unreachable. */
export function keyboardCodeForMidi(midi: number): string | null {
  return CODE_BY_MIDI.get(midi) ?? null
}

/* Highest offset in the map (KeyP), so a shifted layout spans base..base+this. */
export const PIANO_KEYBOARD_TOP_OFFSET = Math.max(
  ...PIANO_KEYBOARD_BINDINGS.map((binding) => binding.semitoneOffset),
)

export const SEMITONES_PER_OCTAVE = 12

/*
 * Octave shift.
 *
 * Two rows reach 29 semitones; the widest preset (C2–C7) is 61, so the low and
 * high ends of several ranges are otherwise unplayable from the keyboard. Moving
 * the whole map by whole octaves keeps every key's relationship to every other
 * intact — only the printed characters slide, and they re-render, so the shifted
 * mapping stays visible rather than remembered.
 */

/* Beyond ±3 octaves nothing meaningful overlaps any range in VOICE_RANGES. */
const CANDIDATE_OCTAVE_SHIFTS = [-3, -2, -1, 0, 1, 2, 3]

/* A shift must expose at least an octave of the range to earn a slot — below
 * that the rows are more empty than useful. Narrow ranges need only cover
 * themselves. */
const MIN_USEFUL_REACH = 13

export type ReachableSpan = {
  /* Lowest and highest pitch of the range playable at this shift. */
  low: number
  high: number
  count: number
}

/* The slice of a voice range the keyboard can reach at a given octave shift. */
export function reachableSpan(
  shift: number,
  midiMin: number,
  midiMax: number,
): ReachableSpan {
  const base = PIANO_KEYBOARD_BASE_MIDI + shift * SEMITONES_PER_OCTAVE
  const low = Math.max(base, midiMin)
  const high = Math.min(base + PIANO_KEYBOARD_TOP_OFFSET, midiMax)

  return { low, high, count: Math.max(0, high - low + 1) }
}

/*
 * The octave shifts worth offering for a range, ascending and always including
 * the unshifted layout. Together they reach every note of every preset in
 * VOICE_RANGES, including the full C2–C7.
 *
 * A shift is dropped when it reaches nothing an already-kept shift cannot — that
 * is what keeps narrow presets (Everyone, Kids, Comfy men) at a single position
 * instead of offering transposes that change the finger pattern for no gain.
 */
export function availableOctaveShifts(
  midiMin: number,
  midiMax: number,
): number[] {
  const requiredReach = Math.min(MIN_USEFUL_REACH, midiMax - midiMin + 1)

  /* Nearest to zero first: the printed layout is the baseline, so it is the one
   * that gets to make its neighbours redundant, never the other way round. */
  const candidates = [...CANDIDATE_OCTAVE_SHIFTS].sort(
    (a, b) => Math.abs(a) - Math.abs(b) || a - b,
  )

  const kept: (ReachableSpan & { shift: number })[] = []
  for (const shift of candidates) {
    const span = reachableSpan(shift, midiMin, midiMax)
    if (span.count < requiredReach) continue

    const isRedundant = kept.some(
      (entry) => span.low >= entry.low && span.high <= entry.high,
    )
    if (isRedundant) continue

    kept.push({ shift, ...span })
  }

  const shifts = kept.map((entry) => entry.shift).sort((a, b) => a - b)

  return shifts.length ? shifts : [0]
}

const PUNCTUATION_CHAR_BY_CODE: Record<string, string> = {
  Comma: ',',
  Period: '.',
  Semicolon: ';',
  Slash: '/',
}

/*
 * The glyph a QWERTY keyboard prints on a physical key. Used as the fallback
 * label where the browser won't tell us the real layout (see
 * usePianoKeyboardInput).
 */
export function qwertyCharForCode(code: string): string {
  if (code.startsWith('Key')) return code.slice('Key'.length)
  if (code.startsWith('Digit')) return code.slice('Digit'.length)

  return PUNCTUATION_CHAR_BY_CODE[code] ?? code
}
