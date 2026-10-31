export type MidiRange = {
  midiMin: number
  midiMax: number
}

/* C2–C7: the span of the Full range, which every range-driven program
 * (charts, piano keyboard map, games) already handles. */
export const VOICE_RANGE_LOWEST_MIDI = 36
export const VOICE_RANGE_HIGHEST_MIDI = 96

/* One octave. Circle of Fifths needs a 12-semitone window to walk and the
 * piano map needs 11+ playable keys, so a narrower personal range would break
 * them. */
export const VOICE_RANGE_MIN_SPAN = 12

/* G3–G4, the same as Everyone — the range "My range" starts out with. */
export const DEFAULT_MY_VOICE_RANGE: MidiRange = { midiMin: 55, midiMax: 67 }

/**
 * Turns any pair of MIDI numbers into a range every program can use: whole
 * semitones, low before high, inside C2–C7 and at least an octave wide. A range
 * that is too narrow grows upward, since a singer's low note is the one they
 * told us about most firmly. Non-numbers fall back to the default.
 */
export function normalizeVoiceRange(
  midiMin: number,
  midiMax: number,
): MidiRange {
  if (!Number.isFinite(midiMin) || !Number.isFinite(midiMax))
    return { ...DEFAULT_MY_VOICE_RANGE }

  const clamp = (midi: number) =>
    Math.min(
      VOICE_RANGE_HIGHEST_MIDI,
      Math.max(VOICE_RANGE_LOWEST_MIDI, Math.round(midi)),
    )
  const low = clamp(Math.min(midiMin, midiMax))
  const high = clamp(Math.max(midiMin, midiMax))

  if (high - low >= VOICE_RANGE_MIN_SPAN) return { midiMin: low, midiMax: high }

  const widenedMax = Math.min(
    VOICE_RANGE_HIGHEST_MIDI,
    low + VOICE_RANGE_MIN_SPAN,
  )

  return { midiMin: widenedMax - VOICE_RANGE_MIN_SPAN, midiMax: widenedMax }
}
