const MIDI_MIN = 36 // C2
const MIDI_MAX = 84 // C6
const NOTE_MIDIS = [36, 48, 60, 72, 84]

/*
 * "Ember to Sky" theme — warm earthy bass rising to cool ethereal soprano.
 * Used for canvas rendering (chart spline and dots).
 */
export const OCTAVE_COLORS: [number, number, number][] = [
  [127, 29, 29], // C2 — deep burgundy
  [146, 64, 14], // C3 — burnt amber
  [20, 83, 45], // C4 — moss green
  [14, 116, 144], // C5 — ocean teal
  [79, 70, 229], // C6 — soft lavender
]

/*
 * Brighter variants of the same hue progression, suitable for text on dark backgrounds.
 */
const OCTAVE_TEXT_COLORS: [number, number, number][] = [
  [248, 113, 113], // C2 — light red
  [251, 146, 60], // C3 — light amber
  [74, 222, 128], // C4 — light green
  [34, 211, 238], // C5 — light cyan
  [167, 139, 250], // C6 — light lavender
]

function interpolateColor(
  colors: [number, number, number][],
  midi: number,
): [number, number, number] {
  const clamped = Math.max(MIDI_MIN, Math.min(MIDI_MAX, midi))
  const octaveRange = (MIDI_MAX - MIDI_MIN) / (NOTE_MIDIS.length - 1)
  const index = (clamped - MIDI_MIN) / octaveRange
  const lower = Math.floor(index)
  const upper = Math.min(lower + 1, colors.length - 1)
  const t = index - lower

  const [r1, g1, b1] = colors[lower]
  const [r2, g2, b2] = colors[upper]

  return [
    Math.round(r1 + (r2 - r1) * t),
    Math.round(g1 + (g2 - g1) * t),
    Math.round(b1 + (b2 - b1) * t),
  ]
}

export function colorRgbAtMidi(midi: number): [number, number, number] {
  return interpolateColor(OCTAVE_COLORS, midi)
}

export function colorAtMidi(midi: number, opacity: number): string {
  const [r, g, b] = colorRgbAtMidi(midi)

  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

export function textColorAtMidi(midi: number): string {
  const [r, g, b] = interpolateColor(OCTAVE_TEXT_COLORS, midi)

  return `rgb(${r}, ${g}, ${b})`
}

const CLEAN_GREEN: [number, number, number] = [0, 255, 100] // neon green
const UNCLEAN_ORANGE: [number, number, number] = [251, 146, 60] // #fb923c
const CLEAN_TEXT_GREEN: [number, number, number] = [57, 255, 130] // neon green for text
const CLEAN_TEXT_ORANGE: [number, number, number] = [253, 186, 116] // #fdba74

/*
 * Visual feedback thresholds based on psychoacoustic research:
 * ≤20 cents — most listeners cannot detect the deviation (green / "clean").
 * ≥50 cents — approaches the semitone boundary; clearly off-pitch (orange).
 * These align with industry-standard vocal training app tolerances.
 */
const CLEAN_CENTS_MIN = 20
const CLEAN_CENTS_MAX = 50

function lerpCleanColor(
  colors: {
    clean: [number, number, number]
    unclean: [number, number, number]
  },
  cents: number,
): [number, number, number] {
  const absCents = Math.abs(cents)
  const t = Math.min(
    1,
    Math.max(
      0,
      (absCents - CLEAN_CENTS_MIN) / (CLEAN_CENTS_MAX - CLEAN_CENTS_MIN),
    ),
  )
  const [r1, g1, b1] = colors.clean
  const [r2, g2, b2] = colors.unclean

  return [
    Math.round(r1 + (r2 - r1) * t),
    Math.round(g1 + (g2 - g1) * t),
    Math.round(b1 + (b2 - b1) * t),
  ]
}

export function cleanColorRgb(cents: number): [number, number, number] {
  return lerpCleanColor({ clean: CLEAN_GREEN, unclean: UNCLEAN_ORANGE }, cents)
}

export function cleanColor(cents: number, opacity = 1): string {
  const [r, g, b] = cleanColorRgb(cents)

  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

export function cleanTextColor(cents: number): string {
  const [r, g, b] = lerpCleanColor(
    { clean: CLEAN_TEXT_GREEN, unclean: CLEAN_TEXT_ORANGE },
    cents,
  )

  return `rgb(${r}, ${g}, ${b})`
}

const DIRECTIONAL_ORANGE = '#fb923c' // too high
const DIRECTIONAL_BLUE = '#60a5fa' // too low
const DIRECTIONAL_GREEN = '#4ade80' // in tune

/*
 * Returns a directional color based on cents deviation:
 * green when within threshold, orange when too high, blue when too low.
 */
export function directionalColor(cents: number, threshold = 50): string {
  if (Math.abs(cents) <= threshold) return DIRECTIONAL_GREEN
  return cents > 0 ? DIRECTIONAL_ORANGE : DIRECTIONAL_BLUE
}
