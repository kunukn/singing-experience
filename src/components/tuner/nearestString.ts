import {
  frequencyToCents,
  noteToFrequency,
  type NoteName,
} from '@/utils/noteUtils'

/* Half an octave. Further than this from every string, the sound is a voice or
 * noise, not a string being tuned, so no string is pointed at. */
export const NEAREST_STRING_MAX_CENTS = 600

export type NearestString<T> = { string: T; cents: number }

/**
 * The open string a pitch is closest to, and how far off it is in cents
 * (positive = sharp). Lets the tuner point at a string even when the pitch is
 * several semitones away from it, e.g. E3 → D3 at +200¢.
 */
export function findNearestString<T extends { note: NoteName; octave: number }>(
  strings: readonly T[],
  frequency: number,
  referenceA4: number,
): NearestString<T> | null {
  if (frequency <= 0 || !isFinite(frequency)) return null

  let nearest: NearestString<T> | null = null
  for (const string of strings) {
    const cents = frequencyToCents(
      frequency,
      noteToFrequency(string.note, string.octave, referenceA4),
    )
    if (!nearest || Math.abs(cents) < Math.abs(nearest.cents)) {
      nearest = { string, cents }
    }
  }

  if (!nearest || Math.abs(nearest.cents) > NEAREST_STRING_MAX_CENTS)
    return null

  return nearest
}

/* Whole semitones between the pitch and its string; 0 under half a semitone */
export function nearestStringSemitones(cents: number): number {
  return Math.round(Math.abs(cents) / 100)
}

/* ▲ = sharp, matching the deviation bar's "Sharp" at the top: "▲2" is two
 * semitones above the string, a lone arrow is less than half a semitone off. */
export function nearestStringBadge(cents: number): string {
  const arrow = cents > 0 ? '▲' : '▼'
  const semitones = nearestStringSemitones(cents)

  return semitones > 0 ? `${arrow}${semitones}` : arrow
}
