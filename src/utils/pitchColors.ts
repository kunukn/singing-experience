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
 *   ≤20¢  — within a trained singer's typical accuracy; untrained voices
 *           average about 25¢ (yellow / "close").
 *   ≥50¢  — halfway to the next semitone; clearly off-pitch (red, saturation cap).
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

/* Flat-side canvas stops, the neon palette's blue twins */
const CLOSE_FLAT: Rgb = [56, 189, 248] // sky-400
const OFF_FLAT: Rgb = [59, 130, 246] // blue-500

/* cleanColorRgb with a direction: flat in blues, sharp unchanged. For trails
 * measured from a fixed target; see directionalTextColor for why. */
export function directionalCleanColorRgb(cents: number): Rgb {
  if (cents >= 0) return cleanColorRgb(cents)

  return lerpThreeStop(
    { clean: CLEAN_GREEN, close: CLOSE_FLAT, off: OFF_FLAT },
    cents,
  )
}

export function directionalCleanColor(cents: number, opacity = 1): string {
  const [r, g, b] = directionalCleanColorRgb(cents)

  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

/* Flat-side text stops: light blue at CLOSE_CENTS deepening to blue at OFF_CENTS */
const CLOSE_TEXT_FLAT_DARK: Rgb = [125, 211, 252] // sky-300
const OFF_TEXT_FLAT_DARK: Rgb = [96, 165, 250] // blue-400
const CLOSE_TEXT_FLAT_LIGHT: Rgb = [2, 132, 199] // sky-600
const OFF_TEXT_FLAT_LIGHT: Rgb = [29, 78, 216] // blue-700

/*
 * cleanTextColor with a direction: sharp keeps its green → yellow → red ramp,
 * flat mirrors it in blues. The size of the miss still shows, and now so does
 * its direction, without reading the sign. Blue low, warm high is the
 * language Do-Re-Mi's too low / too high already speaks (directionalColor);
 * blue against orange is also the pair red-green colour-blind singers tell
 * apart best. Within CLEAN_CENTS both sides are the same green.
 */
export function directionalTextColor(cents: number, isDark = true): string {
  if (cents >= 0) return cleanTextColor(cents, isDark)

  const stops = isDark
    ? {
        clean: CLEAN_TEXT_GREEN_DARK,
        close: CLOSE_TEXT_FLAT_DARK,
        off: OFF_TEXT_FLAT_DARK,
      }
    : {
        clean: CLEAN_TEXT_GREEN_LIGHT,
        close: CLOSE_TEXT_FLAT_LIGHT,
        off: OFF_TEXT_FLAT_LIGHT,
      }
  const [r, g, b] = lerpThreeStop(stops, cents)

  return `rgb(${r}, ${g}, ${b})`
}

/* Clean-side text stops for neutralDirectionalTextColor: the theme's muted
 * text grey (Aura's --p-text-muted-color) */
const CLEAN_TEXT_GREY_DARK: Rgb = [161, 161, 170] // zinc-400
const CLEAN_TEXT_GREY_LIGHT: Rgb = [100, 116, 139] // slate-500

/*
 * directionalTextColor with grey for clean, so both ramps start from grey:
 * grey → light blue → blue when flat, grey → yellow → red when sharp. The
 * green read too close to the flat blues: a clean +1¢ looked flat. For pages
 * that show direction only, such as the Voice Range Finder; tuning pages keep
 * the green as their "in tune" reward.
 */
export function neutralDirectionalTextColor(
  cents: number,
  isDark = true,
): string {
  const clean = isDark ? CLEAN_TEXT_GREY_DARK : CLEAN_TEXT_GREY_LIGHT
  const isFlat = cents < 0
  const stops = isDark
    ? {
        clean,
        close: isFlat ? CLOSE_TEXT_FLAT_DARK : CLOSE_TEXT_YELLOW_DARK,
        off: isFlat ? OFF_TEXT_FLAT_DARK : OFF_TEXT_RED_DARK,
      }
    : {
        clean,
        close: isFlat ? CLOSE_TEXT_FLAT_LIGHT : CLOSE_TEXT_YELLOW_LIGHT,
        off: isFlat ? OFF_TEXT_FLAT_LIGHT : OFF_TEXT_RED_LIGHT,
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
