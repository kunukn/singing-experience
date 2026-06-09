import { frequencyToCents } from '@/utils/noteUtils'
import { CLOSE_CENTS } from '@/utils/pitchColors'

/* A rendered notehead's pitch paired with its vertical pixel position on the
 * staff. Collected from the sheet's SVG to calibrate the pitch→Y mapping. */
export type PitchSample = {
  /* Absolute MIDI note (startTone + the note's midiOffset). */
  midi: number
  /* Notehead center-Y in the sheet wrapper's coordinate space. */
  y: number
}

/*
 * Fallback vertical spacing when the melody can't supply two distinct pitches
 * to fit a slope (e.g. the Voz 4 "one tone" part). Measured from the rendered
 * staff at abcjs's default scale: ~3.9px per diatonic step, and a diatonic step
 * averages 12/7 ≈ 1.71 semitones, so ~3.9 / 1.71 ≈ 2.1px per semitone. Negative
 * because higher pitch = smaller Y (further up the page). Scale-invariant since
 * the sheet renders abcjs at its default scale (no `scale` option).
 */
const FALLBACK_PIXELS_PER_SEMITONE = -2.1

/**
 * Build a linear MIDI→Y mapping from the rendered noteheads via least-squares
 * regression. The musical staff is diatonic (not linear in semitones), so this
 * is an approximation — good enough to show whether the singer is above or
 * below the target note. Falls back to a constant slope anchored on the single
 * available sample when fewer than two distinct pitches are present.
 */
export function buildPitchToY(
  samples: PitchSample[],
): (midi: number) => number {
  if (samples.length === 0) return () => 0

  const distinctMidis = new Set(samples.map((sample) => sample.midi))
  if (distinctMidis.size < 2) {
    const anchor = samples[0]

    return (midi) =>
      anchor.y + (midi - anchor.midi) * FALLBACK_PIXELS_PER_SEMITONE
  }

  const count = samples.length
  let sumMidi = 0
  let sumY = 0
  let sumMidiY = 0
  let sumMidiSquared = 0
  for (const { midi, y } of samples) {
    sumMidi += midi
    sumY += y
    sumMidiY += midi * y
    sumMidiSquared += midi * midi
  }

  const denominator = count * sumMidiSquared - sumMidi * sumMidi
  /* denominator is 0 only when all midis are equal, already handled above. */
  const slope = (count * sumMidiY - sumMidi * sumY) / denominator
  const intercept = (sumY - slope * sumMidi) / count

  return (midi) => slope * midi + intercept
}

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
