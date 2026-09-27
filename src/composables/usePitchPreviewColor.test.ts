import { describe, expect, test } from 'vitest'
import { useDarkMode } from './useDarkMode'
import { usePitchPreviewColor } from './usePitchPreviewColor'

/* Pulls r, g, b and alpha out of an "rgba(r, g, b, a)" string. */
function parseRgba(color: string) {
  const [r, g, b, alpha] = color.match(/[\d.]+/g)!.map(Number)

  return { r, g, b, alpha }
}

describe('usePitchPreviewColor', () => {
  test('returns green for an in-tune pitch and red at 50 cents', () => {
    const { colorForCents } = usePitchPreviewColor()
    const inTune = parseRgba(colorForCents(0))
    const off = parseRgba(colorForCents(50))

    expect(inTune.g).toBeGreaterThan(inTune.r)
    expect(off.r).toBeGreaterThan(off.g)
  })

  test('applies the requested opacity, opaque by default', () => {
    const { colorForCents } = usePitchPreviewColor()

    expect(parseRgba(colorForCents(0, 0.25)).alpha).toBe(0.25)
    expect(parseRgba(colorForCents(0)).alpha).toBe(1)
  })

  test('switches shade with the theme', () => {
    const { colorForCents } = usePitchPreviewColor()
    const { toggleDark } = useDarkMode()

    const before = colorForCents(0)
    toggleDark()
    const after = colorForCents(0)
    toggleDark()

    expect(after).not.toBe(before)
  })
})
