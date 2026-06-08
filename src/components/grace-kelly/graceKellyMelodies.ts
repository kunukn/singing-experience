/* Grace Kelly harmony player — melody data for Voz 1–6.
 *
 * Pitches are stored as semitone offsets from C3 (MIDI 48).
 * Durations are in eighth-note units (6/8 time, 120 BPM dotted quarter).
 *
 * When the user selects a start tone other than C3, a transposition delta is
 * added to every midiOffset at playback time — no data changes needed.
 *
 * All six voices are real transcriptions from the Grace Kelly TikTok challenge
 * sheet: Voz 1 is the Mika lead vocal; Voz 4 is the one-tone C4 part; Voz 2–3
 * and Voz 5–6 are the harmony voices. */

export type VozNote = {
  /* Semitones from C3 (MIDI 48). 0 = C3, 4 = E3, 7 = G3, 12 = C4, etc. */
  midiOffset: number
  /* Duration in eighth-note units. 1 = ♪, 2 = ♩, 3 = ♩. (dotted quarter), 6 = 𝅗𝅥. */
  eighthNotes: number
  /* When true, this note is tied to the next note (same pitch, sustained —
   * no re-articulation). Used to hold a note across a barline. */
  tie?: boolean
}

export type VozMelody = {
  notes: VozNote[]
  /* Pickup length in eighth notes before the first full 6/8 bar (0 = none).
   * The first barline is drawn after this many eighths; the rest every 6. */
  anacrusisEighths?: number
  /* Notation clef. 'treble-8' (default) is the 8vb treble clef — notes sound an
   * octave below where drawn, keeping the low voices off ledger lines. 'treble'
   * is a plain treble clef for the high voices (Voz 1–3), which sit on the staff
   * at true pitch with no octave-down "8". Display only; does not affect sound. */
  clef?: 'treble' | 'treble-8'
}

/* Voz 4 — the "one-tone" harmony: a single pitch (C4) sung throughout, sharing
 * Voz 6's exact tempo and rhythm. Treble clef 8vb; opens with a 3-eighth pickup
 * (anacrusis) and ends on a plain C4 quarter. */
const VOZ_4: VozMelody = {
  anacrusisEighths: 3,
  notes: [
    /* pickup */
    { midiOffset: 12, eighthNotes: 1 }, // C4 ♪
    { midiOffset: 12, eighthNotes: 1 }, // C4 ♪
    { midiOffset: 12, eighthNotes: 1 }, // C4 ♪
    /* bar 1 */
    { midiOffset: 12, eighthNotes: 3 }, // C4 ♩.
    { midiOffset: 12, eighthNotes: 1 }, // C4 ♪
    { midiOffset: 12, eighthNotes: 1 }, // C4 ♪
    { midiOffset: 12, eighthNotes: 1 }, // C4 ♪
    /* bar 2 */
    { midiOffset: 12, eighthNotes: 3 }, // C4 ♩.
    { midiOffset: 12, eighthNotes: 1 }, // C4 ♪
    { midiOffset: 12, eighthNotes: 1 }, // C4 ♪
    { midiOffset: 12, eighthNotes: 1 }, // C4 ♪
    /* bar 3 — three quarters */
    { midiOffset: 12, eighthNotes: 2 }, // C4 ♩
    { midiOffset: 12, eighthNotes: 2 }, // C4 ♩
    { midiOffset: 12, eighthNotes: 2 }, // C4 ♩
    /* bar 4 */
    { midiOffset: 12, eighthNotes: 3 }, // C4 ♩.
    { midiOffset: 12, eighthNotes: 1 }, // C4 ♪
    { midiOffset: 12, eighthNotes: 1 }, // C4 ♪
    { midiOffset: 12, eighthNotes: 1 }, // C4 ♪
    /* bar 5 */
    { midiOffset: 12, eighthNotes: 2 }, // C4 ♩
    { midiOffset: 12, eighthNotes: 1 }, // C4 ♪
    { midiOffset: 12, eighthNotes: 1 }, // C4 ♪
    { midiOffset: 12, eighthNotes: 1 }, // C4 ♪
    { midiOffset: 12, eighthNotes: 1 }, // C4 ♪
    /* bar 6 */
    { midiOffset: 12, eighthNotes: 2 }, // C4 ♩
    { midiOffset: 12, eighthNotes: 1 }, // C4 ♪
    { midiOffset: 12, eighthNotes: 1 }, // C4 ♪
    { midiOffset: 12, eighthNotes: 1 }, // C4 ♪
    { midiOffset: 12, eighthNotes: 1 }, // C4 ♪
    /* bar 7 — C4 ×4 (was ×5), then ends on a C4 quarter */
    { midiOffset: 12, eighthNotes: 1 }, // C4 ♪
    { midiOffset: 12, eighthNotes: 1 }, // C4 ♪
    { midiOffset: 12, eighthNotes: 1 }, // C4 ♪
    { midiOffset: 12, eighthNotes: 1 }, // C4 ♪
    { midiOffset: 12, eighthNotes: 2 }, // C4 ♩ — final note
  ],
}

/* Voz 6 — real transcription. Treble clef 8vb, 6/8, low register (C3–G3).
 * Opens with a 3-eighth pickup (anacrusis); ends on a plain C3 quarter. */
const VOZ_6: VozMelody = {
  anacrusisEighths: 3,
  notes: [
    /* pickup */
    { midiOffset: 0, eighthNotes: 1 }, // C3 ♪
    { midiOffset: 0, eighthNotes: 1 }, // C3 ♪
    { midiOffset: 0, eighthNotes: 1 }, // C3 ♪
    /* bar 1 */
    { midiOffset: 0, eighthNotes: 3 }, // C3 ♩.
    { midiOffset: 0, eighthNotes: 1 }, // C3 ♪
    { midiOffset: 0, eighthNotes: 1 }, // C3 ♪
    { midiOffset: 0, eighthNotes: 1 }, // C3 ♪
    /* bar 2 */
    { midiOffset: 0, eighthNotes: 3 }, // C3 ♩.
    { midiOffset: 0, eighthNotes: 1 }, // C3 ♪
    { midiOffset: 0, eighthNotes: 1 }, // C3 ♪
    { midiOffset: 0, eighthNotes: 1 }, // C3 ♪
    /* bar 3 — rising C D E (quarters) */
    { midiOffset: 0, eighthNotes: 2 }, // C3 ♩
    { midiOffset: 2, eighthNotes: 2 }, // D3 ♩
    { midiOffset: 4, eighthNotes: 2 }, // E3 ♩
    /* bar 4 */
    { midiOffset: 5, eighthNotes: 3 }, // F3 ♩.
    { midiOffset: 5, eighthNotes: 1 }, // F3 ♪
    { midiOffset: 5, eighthNotes: 1 }, // F3 ♪
    { midiOffset: 5, eighthNotes: 1 }, // F3 ♪
    /* bar 5 */
    { midiOffset: 5, eighthNotes: 2 }, // F3 ♩
    { midiOffset: 5, eighthNotes: 1 }, // F3 ♪
    { midiOffset: 5, eighthNotes: 1 }, // F3 ♪
    { midiOffset: 5, eighthNotes: 1 }, // F3 ♪
    { midiOffset: 5, eighthNotes: 1 }, // F3 ♪
    /* bar 6 */
    { midiOffset: 7, eighthNotes: 2 }, // G3 ♩
    { midiOffset: 7, eighthNotes: 1 }, // G3 ♪
    { midiOffset: 7, eighthNotes: 1 }, // G3 ♪
    { midiOffset: 7, eighthNotes: 1 }, // G3 ♪
    { midiOffset: 7, eighthNotes: 1 }, // G3 ♪
    /* bar 7 — F3 ×3 (was ×4), G3, then ends on a C3 quarter */
    { midiOffset: 5, eighthNotes: 1 }, // F3 ♪
    { midiOffset: 5, eighthNotes: 1 }, // F3 ♪
    { midiOffset: 5, eighthNotes: 1 }, // F3 ♪
    { midiOffset: 7, eighthNotes: 1 }, // G3 ♪
    { midiOffset: 0, eighthNotes: 2 }, // C3 ♩ — final note
  ],
}

/* Voz 5 — real transcription. Treble clef 8vb, 6/8, low register (G3–B3).
 * Shares Voz 4's exact tempo and rhythm; opens with a 3-eighth pickup
 * (anacrusis). Long plateaus: G3 (×14) → A3 (×9) → B3 (×5) → A3 (×4) → B3,
 * then ends on a plain G3 quarter. */
const VOZ_5: VozMelody = {
  anacrusisEighths: 3,
  notes: [
    /* pickup */
    { midiOffset: 7, eighthNotes: 1 }, // G3 ♪
    { midiOffset: 7, eighthNotes: 1 }, // G3 ♪
    { midiOffset: 7, eighthNotes: 1 }, // G3 ♪
    /* bar 1 */
    { midiOffset: 7, eighthNotes: 3 }, // G3 ♩.
    { midiOffset: 7, eighthNotes: 1 }, // G3 ♪
    { midiOffset: 7, eighthNotes: 1 }, // G3 ♪
    { midiOffset: 7, eighthNotes: 1 }, // G3 ♪
    /* bar 2 */
    { midiOffset: 7, eighthNotes: 3 }, // G3 ♩.
    { midiOffset: 7, eighthNotes: 1 }, // G3 ♪
    { midiOffset: 7, eighthNotes: 1 }, // G3 ♪
    { midiOffset: 7, eighthNotes: 1 }, // G3 ♪
    /* bar 3 — three quarters */
    { midiOffset: 7, eighthNotes: 2 }, // G3 ♩
    { midiOffset: 7, eighthNotes: 2 }, // G3 ♩
    { midiOffset: 7, eighthNotes: 2 }, // G3 ♩
    /* bar 4 */
    { midiOffset: 9, eighthNotes: 3 }, // A3 ♩.
    { midiOffset: 9, eighthNotes: 1 }, // A3 ♪
    { midiOffset: 9, eighthNotes: 1 }, // A3 ♪
    { midiOffset: 9, eighthNotes: 1 }, // A3 ♪
    /* bar 5 */
    { midiOffset: 9, eighthNotes: 2 }, // A3 ♩
    { midiOffset: 9, eighthNotes: 1 }, // A3 ♪
    { midiOffset: 9, eighthNotes: 1 }, // A3 ♪
    { midiOffset: 9, eighthNotes: 1 }, // A3 ♪
    { midiOffset: 9, eighthNotes: 1 }, // A3 ♪
    /* bar 6 — B3 plateau */
    { midiOffset: 11, eighthNotes: 2 }, // B3 ♩
    { midiOffset: 11, eighthNotes: 1 }, // B3 ♪
    { midiOffset: 11, eighthNotes: 1 }, // B3 ♪
    { midiOffset: 11, eighthNotes: 1 }, // B3 ♪
    { midiOffset: 11, eighthNotes: 1 }, // B3 ♪
    /* bar 7 — A3 ×3 (was ×4), B3, then ends on a G3 quarter */
    { midiOffset: 9, eighthNotes: 1 }, // A3 ♪
    { midiOffset: 9, eighthNotes: 1 }, // A3 ♪
    { midiOffset: 9, eighthNotes: 1 }, // A3 ♪
    { midiOffset: 11, eighthNotes: 1 }, // B3 ♪
    { midiOffset: 7, eighthNotes: 2 }, // G3 ♩ — final note
  ],
}

/* Voz 3 — real transcription. The higher-voiced singer (Voz 6 is the lowest).
 * 6/8, range G4–F5 (within one octave, per the Grace Kelly challenge); starts on
 * C5, ends on E5. Opens with a 3-eighth pickup (anacrusis); ends on a plain
 * E5 quarter. Plain treble clef (high voice — no 8vb octave marking). */
const VOZ_3: VozMelody = {
  anacrusisEighths: 3,
  clef: 'treble',
  notes: [
    /* pickup */
    { midiOffset: 24, eighthNotes: 1 }, // C5 ♪
    { midiOffset: 24, eighthNotes: 1 }, // C5 ♪
    { midiOffset: 24, eighthNotes: 1 }, // C5 ♪
    /* bar 1 */
    { midiOffset: 24, eighthNotes: 3 }, // C5 ♩.
    { midiOffset: 24, eighthNotes: 1 }, // C5 ♪
    { midiOffset: 24, eighthNotes: 1 }, // C5 ♪
    { midiOffset: 24, eighthNotes: 1 }, // C5 ♪
    /* bar 2 */
    { midiOffset: 24, eighthNotes: 3 }, // C5 ♩.
    { midiOffset: 24, eighthNotes: 1 }, // C5 ♪
    { midiOffset: 24, eighthNotes: 1 }, // C5 ♪
    { midiOffset: 24, eighthNotes: 1 }, // C5 ♪
    /* bar 3 — descending C A G (quarters) */
    { midiOffset: 24, eighthNotes: 2 }, // C5 ♩
    { midiOffset: 21, eighthNotes: 2 }, // A4 ♩
    { midiOffset: 19, eighthNotes: 2 }, // G4 ♩
    /* bar 4 — A4 plateau */
    { midiOffset: 21, eighthNotes: 3 }, // A4 ♩.
    { midiOffset: 21, eighthNotes: 1 }, // A4 ♪
    { midiOffset: 21, eighthNotes: 1 }, // A4 ♪
    { midiOffset: 21, eighthNotes: 1 }, // A4 ♪
    /* bar 5 — C5 plateau */
    { midiOffset: 24, eighthNotes: 2 }, // C5 ♩
    { midiOffset: 24, eighthNotes: 1 }, // C5 ♪
    { midiOffset: 24, eighthNotes: 1 }, // C5 ♪
    { midiOffset: 24, eighthNotes: 1 }, // C5 ♪
    { midiOffset: 24, eighthNotes: 1 }, // C5 ♪
    /* bar 6 — D5 plateau */
    { midiOffset: 26, eighthNotes: 2 }, // D5 ♩
    { midiOffset: 26, eighthNotes: 1 }, // D5 ♪
    { midiOffset: 26, eighthNotes: 1 }, // D5 ♪
    { midiOffset: 26, eighthNotes: 1 }, // D5 ♪
    { midiOffset: 26, eighthNotes: 1 }, // D5 ♪
    /* bar 7 — D5 ×3 (was ×4), upper-neighbor F5, then ends on an E5 quarter */
    { midiOffset: 26, eighthNotes: 1 }, // D5 ♪
    { midiOffset: 26, eighthNotes: 1 }, // D5 ♪
    { midiOffset: 26, eighthNotes: 1 }, // D5 ♪
    { midiOffset: 29, eighthNotes: 1 }, // F5 ♪
    { midiOffset: 28, eighthNotes: 2 }, // E5 ♩ — final note
  ],
}

/* Voz 2 — real transcription. The highest voice in the challenge. 6/8, range
 * E5–C6 (within one octave); starts on E5, ends on G5. Opens with a 3-eighth
 * pickup (anacrusis); ends on a plain G5 quarter. Plain treble clef (high
 * voice — no 8vb octave marking). */
const VOZ_2: VozMelody = {
  anacrusisEighths: 3,
  clef: 'treble',
  notes: [
    /* pickup */
    { midiOffset: 28, eighthNotes: 1 }, // E5 ♪
    { midiOffset: 28, eighthNotes: 1 }, // E5 ♪
    { midiOffset: 28, eighthNotes: 1 }, // E5 ♪
    /* bar 1 */
    { midiOffset: 28, eighthNotes: 3 }, // E5 ♩.
    { midiOffset: 28, eighthNotes: 1 }, // E5 ♪
    { midiOffset: 28, eighthNotes: 1 }, // E5 ♪
    { midiOffset: 28, eighthNotes: 1 }, // E5 ♪
    /* bar 2 */
    { midiOffset: 28, eighthNotes: 3 }, // E5 ♩.
    { midiOffset: 28, eighthNotes: 1 }, // E5 ♪
    { midiOffset: 28, eighthNotes: 1 }, // E5 ♪
    { midiOffset: 28, eighthNotes: 1 }, // E5 ♪
    /* bar 3 — rising E F G (quarters) */
    { midiOffset: 28, eighthNotes: 2 }, // E5 ♩
    { midiOffset: 29, eighthNotes: 2 }, // F5 ♩
    { midiOffset: 31, eighthNotes: 2 }, // G5 ♩
    /* bar 4 — A5 plateau */
    { midiOffset: 33, eighthNotes: 3 }, // A5 ♩.
    { midiOffset: 33, eighthNotes: 1 }, // A5 ♪
    { midiOffset: 33, eighthNotes: 1 }, // A5 ♪
    { midiOffset: 33, eighthNotes: 1 }, // A5 ♪
    /* bar 5 — high C6 plateau */
    { midiOffset: 36, eighthNotes: 2 }, // C6 ♩
    { midiOffset: 36, eighthNotes: 1 }, // C6 ♪
    { midiOffset: 36, eighthNotes: 1 }, // C6 ♪
    { midiOffset: 36, eighthNotes: 1 }, // C6 ♪
    { midiOffset: 36, eighthNotes: 1 }, // C6 ♪
    /* bar 6 — B5 plateau */
    { midiOffset: 35, eighthNotes: 2 }, // B5 ♩
    { midiOffset: 35, eighthNotes: 1 }, // B5 ♪
    { midiOffset: 35, eighthNotes: 1 }, // B5 ♪
    { midiOffset: 35, eighthNotes: 1 }, // B5 ♪
    { midiOffset: 35, eighthNotes: 1 }, // B5 ♪
    /* bar 7 — A5 ×3 (was ×4), upper-neighbor B5, then ends on a G5 quarter */
    { midiOffset: 33, eighthNotes: 1 }, // A5 ♪
    { midiOffset: 33, eighthNotes: 1 }, // A5 ♪
    { midiOffset: 33, eighthNotes: 1 }, // A5 ♪
    { midiOffset: 35, eighthNotes: 1 }, // B5 ♪
    { midiOffset: 31, eighthNotes: 2 }, // G5 ♩ — final note
  ],
}

/* Voz 1 — real transcription. The Mika lead vocal; spans nearly two octaves
 * (range C4–A5, the only voice wider than an octave). 6/8, starts on C4 and
 * climbs through the registers to a peak A5, then settles to E5. Opens with a
 * 3-eighth pickup (anacrusis); ends on a plain E5 quarter. Plain treble clef
 * (high voice — no 8vb octave marking). */
const VOZ_1: VozMelody = {
  anacrusisEighths: 3,
  clef: 'treble',
  notes: [
    /* pickup */
    { midiOffset: 12, eighthNotes: 1 }, // C4 ♪ (DO)
    { midiOffset: 12, eighthNotes: 1 }, // C4 ♪ (DO)
    { midiOffset: 12, eighthNotes: 1 }, // C4 ♪ (DO)
    /* bar 1 — E4 plateau (MI) */
    { midiOffset: 16, eighthNotes: 3 }, // E4 ♩.
    { midiOffset: 16, eighthNotes: 1 }, // E4 ♪
    { midiOffset: 16, eighthNotes: 1 }, // E4 ♪
    { midiOffset: 16, eighthNotes: 1 }, // E4 ♪
    /* bar 2 — G4 plateau (SOL) */
    { midiOffset: 19, eighthNotes: 3 }, // G4 ♩.
    { midiOffset: 19, eighthNotes: 1 }, // G4 ♪
    { midiOffset: 19, eighthNotes: 1 }, // G4 ♪
    { midiOffset: 19, eighthNotes: 1 }, // G4 ♪
    /* bar 3 — E5 quarters (MI', up an octave) */
    { midiOffset: 28, eighthNotes: 2 }, // E5 ♩
    { midiOffset: 28, eighthNotes: 2 }, // E5 ♩
    { midiOffset: 28, eighthNotes: 2 }, // E5 ♩
    /* bar 4 — F5 plateau (FA') */
    { midiOffset: 29, eighthNotes: 3 }, // F5 ♩.
    { midiOffset: 29, eighthNotes: 1 }, // F5 ♪
    { midiOffset: 29, eighthNotes: 1 }, // F5 ♪
    { midiOffset: 29, eighthNotes: 1 }, // F5 ♪
    /* bar 5 — peak A5 plateau (LA') */
    { midiOffset: 33, eighthNotes: 2 }, // A5 ♩
    { midiOffset: 33, eighthNotes: 1 }, // A5 ♪
    { midiOffset: 33, eighthNotes: 1 }, // A5 ♪
    { midiOffset: 33, eighthNotes: 1 }, // A5 ♪
    { midiOffset: 33, eighthNotes: 1 }, // A5 ♪
    /* bar 6 — G5 plateau (SOL') */
    { midiOffset: 31, eighthNotes: 2 }, // G5 ♩
    { midiOffset: 31, eighthNotes: 1 }, // G5 ♪
    { midiOffset: 31, eighthNotes: 1 }, // G5 ♪
    { midiOffset: 31, eighthNotes: 1 }, // G5 ♪
    { midiOffset: 31, eighthNotes: 1 }, // G5 ♪
    /* bar 7 — F5 ×3 (was ×4, FA'), G5 (SOL'), ends on E5 (MI') quarter */
    { midiOffset: 29, eighthNotes: 1 }, // F5 ♪
    { midiOffset: 29, eighthNotes: 1 }, // F5 ♪
    { midiOffset: 29, eighthNotes: 1 }, // F5 ♪
    { midiOffset: 31, eighthNotes: 1 }, // G5 ♪
    { midiOffset: 28, eighthNotes: 2 }, // E5 ♩ — final note
  ],
}

export const VOZ_MELODIES: VozMelody[] = [
  VOZ_1, // Voz 1
  VOZ_2, // Voz 2
  VOZ_3, // Voz 3
  VOZ_4, // Voz 4
  VOZ_5, // Voz 5
  VOZ_6, // Voz 6
]
