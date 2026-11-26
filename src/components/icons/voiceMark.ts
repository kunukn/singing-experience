/*
 * Brand voice mark on a 40×40 grid: a singer's head and shoulders with two
 * sound waves leaving the mouth. Shared by BrandMarkIcon and the favicon
 * string; public/icons/voice.svg is a hand copy because a static file can't
 * import this.
 */
export const VOICE_HEAD = { cx: 15.5, cy: 14, r: 6.5 } as const

/*
 * Top of a radius-10.5 disc centred under the head at (15.5, 33.5), leaving a
 * 2.5 gap below the head. The disc is cut at y 32 and each Q rounds a bottom
 * corner by 1.5.
 */
export const VOICE_SHOULDERS_PATH =
  'M5.11 32A10.5 10.5 0 0 1 25.89 32Q25.89 33.5 24.39 33.5H6.61Q5.11 33.5 5.11 32Z'

/*
 * Both waves are arcs around the mouth at (21.5, 15.5) spanning ±40°: radius 7
 * and 12.5. The outer one fades, like the ringing waves on the tuning fork.
 */
export const VOICE_WAVES = [
  { d: 'M26.9 11a7 7 0 0 1 0 9', opacity: 1 },
  { d: 'M31.1 7.5a12.5 12.5 0 0 1 0 16', opacity: 0.6 },
] as const

export const VOICE_WAVE_STROKE_WIDTH = 2.5
