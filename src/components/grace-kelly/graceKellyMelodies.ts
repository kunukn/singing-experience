/* Grace Kelly harmony player — melody data for Voz 1–6.
 *
 * Pitches are stored as semitone offsets from C3 (MIDI 48).
 * Durations are in eighth-note units (6/8 time, 120 BPM dotted quarter).
 *
 * When the user selects a start tone other than C3, a transposition delta is
 * added to every midiOffset at playback time — no data changes needed.
 *
 * Voz 3, Voz 4 (the one-tone C4 part), Voz 5 and Voz 6 are real transcriptions
 * from the Grace Kelly TikTok challenge sheet.
 * ⚠ PLACEHOLDER: Voz 1–2 currently duplicate Voz 4 until their real melodies are
 *    transcribed. */

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
 * (anacrusis) and ends on a C4 tied across the barline into a final dotted
 * quarter (which balances the pickup). */
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
    /* bar 7 */
    { midiOffset: 12, eighthNotes: 1 }, // C4 ♪
    { midiOffset: 12, eighthNotes: 1 }, // C4 ♪
    { midiOffset: 12, eighthNotes: 1 }, // C4 ♪
    { midiOffset: 12, eighthNotes: 1 }, // C4 ♪
    { midiOffset: 12, eighthNotes: 1 }, // C4 ♪
    { midiOffset: 12, eighthNotes: 1, tie: true }, // C4 ♪ — tied into final note
    /* final bar — held C4 (balances the pickup) */
    { midiOffset: 12, eighthNotes: 3 }, // C4 ♩.
  ],
}

/* Voz 6 — real transcription. Treble clef 8vb, 6/8, low register (C3–G3).
 * Opens with a 3-eighth pickup (anacrusis); ends on a C3 tied across the
 * barline into a final dotted-quarter C3 (which balances the pickup). */
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
    /* bar 7 */
    { midiOffset: 5, eighthNotes: 1 }, // F3 ♪
    { midiOffset: 5, eighthNotes: 1 }, // F3 ♪
    { midiOffset: 5, eighthNotes: 1 }, // F3 ♪
    { midiOffset: 5, eighthNotes: 1 }, // F3 ♪
    { midiOffset: 7, eighthNotes: 1 }, // G3 ♪
    { midiOffset: 0, eighthNotes: 1, tie: true }, // C3 ♪ — tied into final note
    /* final bar — held C3 (balances the pickup) */
    { midiOffset: 0, eighthNotes: 3 }, // C3 ♩.
  ],
}

/* Voz 5 — real transcription. Treble clef 8vb, 6/8, low register (G3–B3).
 * Shares Voz 4's exact tempo and rhythm; opens with a 3-eighth pickup
 * (anacrusis). Long plateaus: G3 (×14) → A3 (×9) → B3 (×5) → A3 (×4) → B3,
 * then ends on a G3 tied across the barline into a final dotted-quarter G3
 * (which balances the pickup). */
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
    /* bar 7 — A3 ×4, B3, then G3 tied into final */
    { midiOffset: 9, eighthNotes: 1 }, // A3 ♪
    { midiOffset: 9, eighthNotes: 1 }, // A3 ♪
    { midiOffset: 9, eighthNotes: 1 }, // A3 ♪
    { midiOffset: 9, eighthNotes: 1 }, // A3 ♪
    { midiOffset: 11, eighthNotes: 1 }, // B3 ♪
    { midiOffset: 7, eighthNotes: 1, tie: true }, // G3 ♪ — tied into final note
    /* final bar — held G3 (balances the pickup) */
    { midiOffset: 7, eighthNotes: 3 }, // G3 ♩.
  ],
}

/* Voz 3 — real transcription. The higher-voiced singer (Voz 6 is the lowest).
 * 6/8, range G3–F4 (within one octave, per the Grace Kelly challenge); starts on
 * C4, ends on E4. Opens with a 3-eighth pickup (anacrusis); ends on an E4 tied
 * across the barline into a final dotted-quarter E4 (which balances the pickup). */
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
    /* bar 7 — D4 ×4, upper-neighbor F4, then E4 tied into final */
    { midiOffset: 14, eighthNotes: 1 }, // D4 ♪
    { midiOffset: 14, eighthNotes: 1 }, // D4 ♪
    { midiOffset: 14, eighthNotes: 1 }, // D4 ♪
    { midiOffset: 14, eighthNotes: 1 }, // D4 ♪
    { midiOffset: 17, eighthNotes: 1 }, // F4 ♪
    { midiOffset: 16, eighthNotes: 1, tie: true }, // E4 ♪ — tied into final note
    /* final bar — held E4 (balances the pickup) */
    { midiOffset: 16, eighthNotes: 3 }, // E4 ♩.
  ],
}

/* Voz 1–2 are placeholders that duplicate Voz 4 until their real melodies are
 * transcribed. Sharing one object is safe — melody data is never mutated. */
export const VOZ_MELODIES: VozMelody[] = [
  VOZ_4, // Voz 1 (placeholder)
  VOZ_4, // Voz 2 (placeholder)
  VOZ_3, // Voz 3
  VOZ_4, // Voz 4
  VOZ_5, // Voz 5
  VOZ_6, // Voz 6
]
