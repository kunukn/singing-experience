const MIDI_MIN = 36 // C2
const MIDI_MAX = 96 // C7
const NOTE_MIDIS = [36, 48, 60, 72, 84, 96]

/*
 * A rainbow, red → violet, low pitch to high — like light, where red is the
 * lowest frequency and violet the highest. One palette for the whole app: the
 * pitch axis interpolates between these stops (one per C, C2 → C7), and the
 * six voice types take one stop each (Bass → Soprano), so a voice's bar and
 * the notes it covers share a colour family everywhere.
 *
 * An open arc, not the full colour wheel: no pink or magenta on top, which
 * would wrap round to Bass's red and make the two furthest voices look alike.
 * Tuned for the voice types, the hardest use: six bars side by side, also at
 * 25% opacity, need neighbours told apart and the two ends far apart. Light
 * stops are drawn as 12px text on white, so each keeps ≥ 4.5:1 contrast.
 */
export const OCTAVE_COLORS: [number, number, number][] = [
  [153, 27, 27], // C2 / Bass — red-800
  [180, 83, 9], // C3 / Baritone — amber-700
  [21, 128, 61], // C4 / Tenor — green-700
  [14, 116, 144], // C5 / Alto — cyan-700
  [37, 99, 235], // C6 / Mezzo-soprano — blue-600
  [109, 40, 217], // C7 / Soprano — violet-700
]

/*
 * Dark mode: brighter variants of the same arc (Tailwind 400s), for text and
 * bars on dark surfaces. Lime and teal rather than green and cyan, and sky
 * rather than blue: on a dark surface those neighbours otherwise blur, and
 * blue next to violet is near-identical for red-green colour-blind singers.
 */
const OCTAVE_TEXT_COLORS: [number, number, number][] = [
  [248, 113, 113], // C2 / Bass — red-400
  [251, 146, 60], // C3 / Baritone — orange-400
  [163, 230, 53], // C4 / Tenor — lime-400
  [45, 212, 191], // C5 / Alto — teal-400
  [56, 189, 248], // C6 / Mezzo-soprano — sky-400
  [147, 106, 254], // C7 / Soprano — between violet-400 and -500: 400 put Bass ↔ Soprano closer than Baritone ↔ Tenor, 500 is under 4.5:1 as text
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

/*
 * Defaults to the dark-background ramp, which is where this started life. Pass
 * isDark to let it pick the deeper stops instead — the bright variants wash
 * out on a light surface.
 */
export function textColorAtMidi(midi: number, isDark = true): string {
  const [r, g, b] = interpolateColor(
    isDark ? OCTAVE_TEXT_COLORS : OCTAVE_COLORS,
    midi,
  )

  return `rgb(${r}, ${g}, ${b})`
}

/*
 * A voice type's colour: the palette stop at its index in VOICE_TYPES
 * (0 = Bass, 5 = Soprano). Indexed, not picked by MIDI: every voice type's
 * midpoint sits between MIDI 52 and 72, barely a third of the ramp, so
 * interpolation would hand back six near-identical colours.
 */
export function voiceTypeColor(
  voiceIndex: number,
  isDark: boolean,
  opacity = 1,
): string {
  const colors = isDark ? OCTAVE_TEXT_COLORS : OCTAVE_COLORS
  const index = Math.max(0, Math.min(colors.length - 1, voiceIndex))
  const [r, g, b] = colors[index]

  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

/*
 * Three-tier feedback thresholds based on psychoacoustic research and
 * industry-standard vocal training tolerances:
 *   ≤10¢  — imperceptible to most listeners (green / "clean").
 *   ≤20¢  — within a trained singer's typical accuracy; untrained voices
 *           average about 25¢ (yellow or blue / "close").
 *   ≥50¢  — halfway to the next semitone; clearly off-pitch (red or deep blue,
 *           saturation cap).
 * Smoothly interpolated between tiers so the color motion stays continuous.
 */
export const CLEAN_CENTS = 10
export const CLOSE_CENTS = 20
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

    /* Eased out, so blue or yellow takes over quickly: an even mix of the
     * green and the blue is teal at the band's middle, neither green nor
     * blue on a thin line. Still continuous, so jitter across CLEAN_CENTS
     * doesn't flip the colour. */
    return mix(stops.clean, stops.close, 1 - (1 - t) ** 2)
  }
  const t = Math.min(1, (absCents - CLOSE_CENTS) / (OFF_CENTS - CLOSE_CENTS))

  return mix(stops.close, stops.off, t)
}

/*
 * The pitch colour rule (design-rules.md "Pitch Colours"): green when clean,
 * yellow → orange → red when sharp, blue when flat. Thin lines and small
 * marks are told apart by brightness more than by hue, so the flat blues are
 * deep and pure — never sky or cyan, which are as bright as the green — and
 * every flat step is clearly darker than the clean green. Guarded by
 * pitchColors.test.ts.
 */

/* Dark mode — brighter shades for dark surfaces */
const CLEAN_GREEN_DARK: Rgb = [74, 222, 128] // green-400
const CLOSE_YELLOW_DARK: Rgb = [253, 224, 71] // yellow-300
const OFF_RED_DARK: Rgb = [248, 113, 113] // red-400
const CLOSE_FLAT_DARK: Rgb = [96, 165, 250] // blue-400
const OFF_FLAT_DARK: Rgb = [59, 130, 246] // blue-500

/* Light mode — darker shades for light surfaces */
const CLEAN_GREEN_LIGHT: Rgb = [22, 163, 74] // green-600
const CLOSE_YELLOW_LIGHT: Rgb = [202, 138, 4] // yellow-600
const OFF_RED_LIGHT: Rgb = [220, 38, 38] // red-600
const CLOSE_FLAT_LIGHT: Rgb = [37, 99, 235] // blue-600
const OFF_FLAT_LIGHT: Rgb = [30, 64, 175] // blue-800

/*
 * One palette per theme for everything that shows cents: text, thin lines,
 * trails, dots and bars. The note beside a chart and the trail on it are then
 * the same green, in light mode as in dark.
 */
function pitchRgb(cents: number, isDark: boolean): Rgb {
  const isFlat = cents < 0
  const stops = isDark
    ? {
        clean: CLEAN_GREEN_DARK,
        close: isFlat ? CLOSE_FLAT_DARK : CLOSE_YELLOW_DARK,
        off: isFlat ? OFF_FLAT_DARK : OFF_RED_DARK,
      }
    : {
        clean: CLEAN_GREEN_LIGHT,
        close: isFlat ? CLOSE_FLAT_LIGHT : CLOSE_YELLOW_LIGHT,
        off: isFlat ? OFF_FLAT_LIGHT : OFF_RED_LIGHT,
      }

  return lerpThreeStop(stops, cents)
}

/* Trail colour: green when clean, green → yellow → red when sharp, green →
 * blue → deep blue when flat. See directionalTextColor for why. The theme is
 * required, so a caller cannot fall back to the wrong theme's shades. */
export function directionalCleanColorRgb(cents: number, isDark: boolean): Rgb {
  return pitchRgb(cents, isDark)
}

export function directionalCleanColor(
  cents: number,
  isDark: boolean,
  opacity = 1,
): string {
  const [r, g, b] = pitchRgb(cents, isDark)

  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

/* The clean green on its own, for canvas marks that mean "on pitch" or "you
 * hit it": a highlighted grid line, a hit target, a correct-note line */
export function cleanPitchColor(isDark: boolean, opacity = 1): string {
  return directionalCleanColor(0, isDark, opacity)
}

/*
 * The cents colour for text and thin lines: green when clean, green → yellow
 * → red when sharp, green → blue → deep blue when flat. The size of the miss
 * shows, and so does its direction, without reading the sign. Blue low, warm
 * high is the language Do-Re-Mi's too low / too high already speaks
 * (directionalColor); blue against orange is also the pair red-green
 * colour-blind singers tell apart best.
 */
export function directionalTextColor(cents: number, isDark = true): string {
  const [r, g, b] = pitchRgb(cents, isDark)

  return `rgb(${r}, ${g}, ${b})`
}

/* The fixed pitch colours, themed in style.css: usable in a style binding or
 * a class (`text-(--pitch-clean)`), not on a canvas */
export const PITCH_CLEAN_COLOR = 'var(--pitch-clean)'
export const PITCH_LOW_COLOR = 'var(--pitch-low)'
export const PITCH_HIGH_COLOR = 'var(--pitch-high)'

/*
 * Returns a directional color based on cents deviation: green when within
 * threshold, orange when too high, blue when too low. For game targets, where
 * green means "accepted" (a success colour, not a cents colour).
 */
export function directionalColor(cents: number, threshold = OFF_CENTS): string {
  if (Math.abs(cents) <= threshold) return PITCH_CLEAN_COLOR

  return cents > 0 ? PITCH_HIGH_COLOR : PITCH_LOW_COLOR
}
