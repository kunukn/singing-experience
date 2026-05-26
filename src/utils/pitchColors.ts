const MIDI_MIN = 36 // C2
const MIDI_MAX = 96 // C7
const NOTE_MIDIS = [36, 48, 60, 72, 84, 96]

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
  [168, 50, 168], // C7 — soft magenta
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
  [232, 140, 232], // C7 — light magenta
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

/* Canvas palette — saturated tuples for spline and dots on dark chart bg */
const CLEAN_GREEN: [number, number, number] = [0, 255, 100] // neon green — on-pitch
const CLOSE_YELLOW: [number, number, number] = [250, 204, 21] // yellow-400 — slightly off
const OFF_RED: [number, number, number] = [239, 68, 68] // red-500 — clearly off

/* Text palette (dark mode) — brighter variants for legibility on dark surfaces */
const CLEAN_TEXT_GREEN_DARK: [number, number, number] = [57, 255, 130]
const CLOSE_TEXT_YELLOW_DARK: [number, number, number] = [253, 224, 71] // yellow-300
const OFF_TEXT_RED_DARK: [number, number, number] = [248, 113, 113] // red-400

/* Text palette (light mode) — darker shades legible on light surfaces */
const CLEAN_TEXT_GREEN_LIGHT: [number, number, number] = [16, 185, 129] // emerald-500
const CLOSE_TEXT_YELLOW_LIGHT: [number, number, number] = [202, 138, 4] // yellow-600
const OFF_TEXT_RED_LIGHT: [number, number, number] = [220, 38, 38] // red-600

/*
 * Three-tier feedback thresholds based on psychoacoustic research and
 * industry-standard vocal training tolerances:
 *   ≤10¢  — imperceptible to most listeners (green / "clean").
 *   ≤25¢  — noticeable to trained ears but acceptable (yellow / "close").
 *   ≥50¢  — halfway to the next semitone; clearly off-pitch (red, saturation cap).
 * Smoothly interpolated between tiers so the color motion stays continuous.
 */
export const CLEAN_CENTS = 10
export const CLOSE_CENTS = 25
export const OFF_CENTS = 50

type Rgb = [number, number, number]

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ]
}

function lerpThreeStop(
  stops: { clean: Rgb; close: Rgb; off: Rgb },
  cents: number,
): Rgb {
  const absCents = Math.abs(cents)
  if (absCents <= CLEAN_CENTS) return stops.clean
  if (absCents <= CLOSE_CENTS) {
    const t = (absCents - CLEAN_CENTS) / (CLOSE_CENTS - CLEAN_CENTS)

    return mix(stops.clean, stops.close, t)
  }
  const t = Math.min(1, (absCents - CLOSE_CENTS) / (OFF_CENTS - CLOSE_CENTS))

  return mix(stops.close, stops.off, t)
}

export function cleanColorRgb(cents: number): [number, number, number] {
  return lerpThreeStop(
    { clean: CLEAN_GREEN, close: CLOSE_YELLOW, off: OFF_RED },
    cents,
  )
}

export function cleanColor(cents: number, opacity = 1): string {
  const [r, g, b] = cleanColorRgb(cents)

  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

export function cleanTextColor(cents: number, isDark = true): string {
  const stops = isDark
    ? {
        clean: CLEAN_TEXT_GREEN_DARK,
        close: CLOSE_TEXT_YELLOW_DARK,
        off: OFF_TEXT_RED_DARK,
      }
    : {
        clean: CLEAN_TEXT_GREEN_LIGHT,
        close: CLOSE_TEXT_YELLOW_LIGHT,
        off: OFF_TEXT_RED_LIGHT,
      }
  const [r, g, b] = lerpThreeStop(stops, cents)

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
