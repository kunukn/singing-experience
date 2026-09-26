import { frequencyToCents } from '@/utils/noteUtils'
import { CLOSE_CENTS } from '@/utils/pitchColors'

/**
 * Signed cents between a sung frequency and the target frequency.
 * Positive = sung pitch is higher than the target.
 */
export function centsBetween(sungHz: number, targetHz: number): number {
  return frequencyToCents(sungHz, targetHz)
}

/**
 * True when the sung pitch is within `toleranceCents` of the target pitch.
 * Octave-sensitive (cents grow ±1200 per octave), so an octave away never
 * counts as on-pitch. Defaults to the app's "close" threshold (25¢).
 */
export function isOnPitch(
  sungHz: number,
  targetHz: number,
  toleranceCents: number = CLOSE_CENTS,
): boolean {
  return Math.abs(centsBetween(sungHz, targetHz)) <= toleranceCents
}
