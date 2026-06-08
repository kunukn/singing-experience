/* Grace Kelly harmony player — melody data for Voz 1–6.
 *
 * Pitches are stored as semitone offsets from C3 (MIDI 48).
 * Durations are in eighth-note units (6/8 time, 120 BPM dotted quarter).
 *
 * When the user selects a start tone other than C3, a transposition delta is
 * added to every midiOffset at playback time — no data changes needed.
 *
 * All six voices are real transcriptions from the Grace Kelly TikTok challenge
 * sheet: Voz 1 is the MIKA lead vocal; Voz 4 is the one-tone C4 part; Voz 2–3
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
 * 6/8, range G3–F4 (within one octave, per the Grace Kelly challenge); starts on
 * C4, ends on E4. Opens with a 3-eighth pickup (anacrusis); ends on a plain
 * E4 quarter. */
const VOZ_3: VozMelody = {
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
    /* bar 3 — descending C A G (quarters) */
    { midiOffset: 12, eighthNotes: 2 }, // C4 ♩
    { midiOffset: 9, eighthNotes: 2 }, // A3 ♩
    { midiOffset: 7, eighthNotes: 2 }, // G3 ♩
    /* bar 4 — A3 plateau */
    { midiOffset: 9, eighthNotes: 3 }, // A3 ♩.
    { midiOffset: 9, eighthNotes: 1 }, // A3 ♪
    { midiOffset: 9, eighthNotes: 1 }, // A3 ♪
    { midiOffset: 9, eighthNotes: 1 }, // A3 ♪
    /* bar 5 — C4 plateau */
    { midiOffset: 12, eighthNotes: 2 }, // C4 ♩
    { midiOffset: 12, eighthNotes: 1 }, // C4 ♪
    { midiOffset: 12, eighthNotes: 1 }, // C4 ♪
    { midiOffset: 12, eighthNotes: 1 }, // C4 ♪
    { midiOffset: 12, eighthNotes: 1 }, // C4 ♪
    /* bar 6 — D4 plateau */
    { midiOffset: 14, eighthNotes: 2 }, // D4 ♩
    { midiOffset: 14, eighthNotes: 1 }, // D4 ♪
    { midiOffset: 14, eighthNotes: 1 }, // D4 ♪
    { midiOffset: 14, eighthNotes: 1 }, // D4 ♪
    { midiOffset: 14, eighthNotes: 1 }, // D4 ♪
    /* bar 7 — D4 ×3 (was ×4), upper-neighbor F4, then ends on an E4 quarter */
    { midiOffset: 14, eighthNotes: 1 }, // D4 ♪
    { midiOffset: 14, eighthNotes: 1 }, // D4 ♪
    { midiOffset: 14, eighthNotes: 1 }, // D4 ♪
    { midiOffset: 17, eighthNotes: 1 }, // F4 ♪
    { midiOffset: 16, eighthNotes: 2 }, // E4 ♩ — final note
  ],
}

/* Voz 2 — real transcription. The highest voice in the challenge. 6/8, range
 * E4–C5 (within one octave); starts on E4, ends on G4. Opens with a 3-eighth
 * pickup (anacrusis); ends on a plain G4 quarter. */
const VOZ_2: VozMelody = {
  anacrusisEighths: 3,
  notes: [
    /* pickup */
    { midiOffset: 16, eighthNotes: 1 }, // E4 ♪
    { midiOffset: 16, eighthNotes: 1 }, // E4 ♪
    { midiOffset: 16, eighthNotes: 1 }, // E4 ♪
    /* bar 1 */
    { midiOffset: 16, eighthNotes: 3 }, // E4 ♩.
    { midiOffset: 16, eighthNotes: 1 }, // E4 ♪
    { midiOffset: 16, eighthNotes: 1 }, // E4 ♪
    { midiOffset: 16, eighthNotes: 1 }, // E4 ♪
    /* bar 2 */
    { midiOffset: 16, eighthNotes: 3 }, // E4 ♩.
    { midiOffset: 16, eighthNotes: 1 }, // E4 ♪
    { midiOffset: 16, eighthNotes: 1 }, // E4 ♪
    { midiOffset: 16, eighthNotes: 1 }, // E4 ♪
    /* bar 3 — rising E F G (quarters) */
    { midiOffset: 16, eighthNotes: 2 }, // E4 ♩
    { midiOffset: 17, eighthNotes: 2 }, // F4 ♩
    { midiOffset: 19, eighthNotes: 2 }, // G4 ♩
    /* bar 4 — A4 plateau */
    { midiOffset: 21, eighthNotes: 3 }, // A4 ♩.
    { midiOffset: 21, eighthNotes: 1 }, // A4 ♪
    { midiOffset: 21, eighthNotes: 1 }, // A4 ♪
    { midiOffset: 21, eighthNotes: 1 }, // A4 ♪
    /* bar 5 — high C5 plateau */
    { midiOffset: 24, eighthNotes: 2 }, // C5 ♩
    { midiOffset: 24, eighthNotes: 1 }, // C5 ♪
    { midiOffset: 24, eighthNotes: 1 }, // C5 ♪
    { midiOffset: 24, eighthNotes: 1 }, // C5 ♪
    { midiOffset: 24, eighthNotes: 1 }, // C5 ♪
    /* bar 6 — B4 plateau */
    { midiOffset: 23, eighthNotes: 2 }, // B4 ♩
    { midiOffset: 23, eighthNotes: 1 }, // B4 ♪
    { midiOffset: 23, eighthNotes: 1 }, // B4 ♪
    { midiOffset: 23, eighthNotes: 1 }, // B4 ♪
    { midiOffset: 23, eighthNotes: 1 }, // B4 ♪
    /* bar 7 — A4 ×3 (was ×4), upper-neighbor B4, then ends on a G4 quarter */
    { midiOffset: 21, eighthNotes: 1 }, // A4 ♪
    { midiOffset: 21, eighthNotes: 1 }, // A4 ♪
    { midiOffset: 21, eighthNotes: 1 }, // A4 ♪
    { midiOffset: 23, eighthNotes: 1 }, // B4 ♪
    { midiOffset: 19, eighthNotes: 2 }, // G4 ♩ — final note
  ],
}

/* Voz 1 — real transcription. The MIKA lead vocal; spans nearly two octaves
 * (range C3–A4, the only voice wider than an octave). 6/8, starts on C3 and
 * climbs through the registers to a peak A4, then settles to E4. Opens with a
 * 3-eighth pickup (anacrusis); ends on a plain E4 quarter. */
const VOZ_1: VozMelody = {
  anacrusisEighths: 3,
  notes: [
    /* pickup */
    { midiOffset: 0, eighthNotes: 1 }, // C3 ♪ (DO)
    { midiOffset: 0, eighthNotes: 1 }, // C3 ♪ (DO)
    { midiOffset: 0, eighthNotes: 1 }, // C3 ♪ (DO)
    /* bar 1 — E3 plateau (MI) */
    { midiOffset: 4, eighthNotes: 3 }, // E3 ♩.
    { midiOffset: 4, eighthNotes: 1 }, // E3 ♪
    { midiOffset: 4, eighthNotes: 1 }, // E3 ♪
    { midiOffset: 4, eighthNotes: 1 }, // E3 ♪
    /* bar 2 — G3 plateau (SOL) */
    { midiOffset: 7, eighthNotes: 3 }, // G3 ♩.
    { midiOffset: 7, eighthNotes: 1 }, // G3 ♪
    { midiOffset: 7, eighthNotes: 1 }, // G3 ♪
    { midiOffset: 7, eighthNotes: 1 }, // G3 ♪
    /* bar 3 — E4 quarters (MI', up an octave) */
    { midiOffset: 16, eighthNotes: 2 }, // E4 ♩
    { midiOffset: 16, eighthNotes: 2 }, // E4 ♩
    { midiOffset: 16, eighthNotes: 2 }, // E4 ♩
    /* bar 4 — F4 plateau (FA') */
    { midiOffset: 17, eighthNotes: 3 }, // F4 ♩.
    { midiOffset: 17, eighthNotes: 1 }, // F4 ♪
    { midiOffset: 17, eighthNotes: 1 }, // F4 ♪
    { midiOffset: 17, eighthNotes: 1 }, // F4 ♪
    /* bar 5 — peak A4 plateau (LA') */
    { midiOffset: 21, eighthNotes: 2 }, // A4 ♩
    { midiOffset: 21, eighthNotes: 1 }, // A4 ♪
    { midiOffset: 21, eighthNotes: 1 }, // A4 ♪
    { midiOffset: 21, eighthNotes: 1 }, // A4 ♪
    { midiOffset: 21, eighthNotes: 1 }, // A4 ♪
    /* bar 6 — G4 plateau (SOL') */
    { midiOffset: 19, eighthNotes: 2 }, // G4 ♩
    { midiOffset: 19, eighthNotes: 1 }, // G4 ♪
    { midiOffset: 19, eighthNotes: 1 }, // G4 ♪
    { midiOffset: 19, eighthNotes: 1 }, // G4 ♪
    { midiOffset: 19, eighthNotes: 1 }, // G4 ♪
    /* bar 7 — F4 ×3 (was ×4, FA'), G4 (SOL'), ends on E4 (MI') quarter */
    { midiOffset: 17, eighthNotes: 1 }, // F4 ♪
    { midiOffset: 17, eighthNotes: 1 }, // F4 ♪
    { midiOffset: 17, eighthNotes: 1 }, // F4 ♪
    { midiOffset: 19, eighthNotes: 1 }, // G4 ♪
    { midiOffset: 16, eighthNotes: 2 }, // E4 ♩ — final note
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
