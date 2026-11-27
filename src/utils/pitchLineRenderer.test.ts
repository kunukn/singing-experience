import { describe, expect, test, vi } from 'vitest'
import {
  clampPitchY,
  drawPitchLine,
  pitchLineColors,
  resolveEffectiveMidi,
} from './pitchLineRenderer'
import { cleanPitchColor, OFF_CENTS } from './pitchColors'
import { OUT_OF_RANGE_OVERFLOW_PX } from '@/constants/chartStyles'

/* On target the line is the theme's clean green, whatever shade that is. The
 * alphas are the renderer's own: line 0.3, dot 0.8, label 0.9. */
const onTargetColors = (isDark: boolean) => ({
  line: cleanPitchColor(isDark, 0.3),
  dot: cleanPitchColor(isDark, 0.8),
  label: cleanPitchColor(isDark, 0.9),
})

/* The fixed palettes, each pinned once in 'pitchLineColors' below. Every other
 * test only asks which palette won. */
const OUT_OF_RANGE_COLORS = pitchLineColors({ isOutOfRange: true })
const IN_RANGE_COLORS = pitchLineColors({ isOutOfRange: false })
const HIGH_LANE_COLORS = pitchLineColors({
  isOutOfRange: false,
  isHighLane: true,
})

describe('resolveEffectiveMidi', () => {
  test('returns fractional MIDI from a valid frequency (A4 = 440 Hz → 69)', () => {
    expect(resolveEffectiveMidi(50, 440)).toBeCloseTo(69, 10)
  })

  test('falls back to the integer MIDI when frequency is null', () => {
    expect(resolveEffectiveMidi(57, null)).toBe(57)
  })

  test('falls back when frequency is missing or non-positive', () => {
    expect(resolveEffectiveMidi(57)).toBe(57)
    expect(resolveEffectiveMidi(57, 0)).toBe(57)
    expect(resolveEffectiveMidi(57, -10)).toBe(57)
  })
})

describe('clampPitchY', () => {
  /* The renderer pads 16 px top and bottom unless told otherwise, so at this
   * height the padded band is [16, 84]. An off-chart line stops
   * OUT_OF_RANGE_OVERFLOW_PX past either edge of it. */
  const HEIGHT = 100
  const DEFAULT_PADDING = 16

  test('in-range Y passes through unchanged', () => {
    const result = clampPitchY(50, HEIGHT)
    expect(result.isOutOfRange).toBe(false)
    expect(result.clampedY).toBe(50)
  })

  test('above the top padding is out of range and clamped to the overflow edge', () => {
    const result = clampPitchY(-100, HEIGHT)
    expect(result.isOutOfRange).toBe(true)
    expect(result.clampedY).toBe(DEFAULT_PADDING - OUT_OF_RANGE_OVERFLOW_PX)
  })

  test('below the bottom padding is out of range and clamped to the overflow edge', () => {
    const result = clampPitchY(500, HEIGHT)
    expect(result.isOutOfRange).toBe(true)
    expect(result.clampedY).toBe(
      HEIGHT - DEFAULT_PADDING + OUT_OF_RANGE_OVERFLOW_PX,
    )
  })

  test('honors custom paddings', () => {
    const result = clampPitchY(5, HEIGHT, 0, 0)
    expect(result.isOutOfRange).toBe(false)
    expect(result.clampedY).toBe(5)
  })
})

describe('pitchLineColors', () => {
  test('correct (on target) wins over out-of-range → green', () => {
    /* No theme given: the dark theme's green */
    const colors = pitchLineColors({ isOutOfRange: true, isCorrect: true })
    expect(colors).toEqual(onTargetColors(true))
  })

  test("correct uses the light theme's green in light mode", () => {
    const colors = pitchLineColors({
      isOutOfRange: false,
      isCorrect: true,
      isDark: false,
    })
    expect(colors).toEqual(onTargetColors(false))
    expect(colors).not.toEqual(onTargetColors(true))
  })

  test('out-of-range (not correct) → red', () => {
    const colors = pitchLineColors({ isOutOfRange: true })
    expect(colors).toEqual({
      line: 'rgba(239, 68, 68, 0.25)',
      dot: 'rgba(239, 68, 68, 0.7)',
      label: 'rgba(239, 68, 68, 0.8)',
    })
  })

  test('in range and not correct → orange', () => {
    const colors = pitchLineColors({ isOutOfRange: false })
    expect(colors).toEqual({
      line: 'rgba(251, 146, 60, 0.25)',
      dot: 'rgba(251, 146, 60, 0.7)',
      label: 'rgba(251, 146, 60, 0.8)',
    })
  })

  test('duet high lane in range → violet', () => {
    const colors = pitchLineColors({ isOutOfRange: false, isHighLane: true })
    expect(colors).toEqual({
      line: 'rgba(167, 139, 250, 0.25)',
      dot: 'rgba(167, 139, 250, 0.7)',
      label: 'rgba(167, 139, 250, 0.8)',
    })
  })

  test('out-of-range beats the high lane hue → red', () => {
    const colors = pitchLineColors({ isOutOfRange: true, isHighLane: true })
    expect(colors).toEqual(OUT_OF_RANGE_COLORS)
  })

  test('on target beats the high lane hue → green', () => {
    const colors = pitchLineColors({
      isOutOfRange: false,
      isCorrect: true,
      isHighLane: true,
    })
    expect(colors).toEqual(onTargetColors(true))
  })
})

describe('drawPitchLine - cents colour', () => {
  /* A4 sung 30¢ sharp — 1200 cents per octave. */
  const A4_30_CENTS_SHARP = 440 * 2 ** (30 / 1200)

  /* Records the colour in effect when the line, dot and label are painted. */
  function createColorRecordingContext() {
    const recorded = {
      line: null as string | null,
      dot: null as string | null,
      label: null as string | null,
    }
    const ctx = {
      strokeStyle: '',
      fillStyle: '',
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      setLineDash: vi.fn(),
      arc: vi.fn(),
      stroke: vi.fn(() => {
        recorded.line = ctx.strokeStyle
      }),
      fill: vi.fn(() => {
        recorded.dot = ctx.fillStyle
      }),
      fillText: vi.fn(() => {
        recorded.label = ctx.fillStyle
      }),
    }

    return { ctx: ctx as unknown as CanvasRenderingContext2D, recorded }
  }

  /* Height 100 keeps y 50 inside the padded band and y -100 outside it. */
  function drawColors(options: {
    isOutOfRange?: boolean
    isHighLane?: boolean
    colorForCents?: (cents: number, opacity: number) => string
  }) {
    const { ctx, recorded } = createColorRecordingContext()
    drawPitchLine(ctx, {
      midi: 69,
      frequency: A4_30_CENTS_SHARP,
      height: 100,
      midiToY: () => (options.isOutOfRange ? -100 : 50),
      lineX0: 0,
      lineX1: 100,
      dotX: 50,
      isDark: true,
      isHighLane: options.isHighLane,
      colorForCents: options.colorForCents,
    })

    return recorded
  }

  test('colours an in-range line, dot and label by its cents offset', () => {
    const colorForCents = vi.fn(
      (cents: number, opacity: number) => `cents ${cents} @ ${opacity}`,
    )

    expect(drawColors({ colorForCents })).toEqual({
      line: 'cents 30 @ 0.25',
      dot: 'cents 30 @ 0.7',
      label: 'cents 30 @ 1',
    })
  })

  /* Height 100 with 16px paddings: y -100 is above the chart, y 300 below */
  test.each([
    { side: 'above', y: -100, cents: OFF_CENTS },
    { side: 'below', y: 300, cents: -OFF_CENTS },
  ])(
    'colours an off-chart line $side by direction when asked',
    ({ y, cents }) => {
      const { ctx, recorded } = createColorRecordingContext()
      drawPitchLine(ctx, {
        midi: 69,
        frequency: A4_30_CENTS_SHARP,
        height: 100,
        midiToY: () => y,
        lineX0: 0,
        lineX1: 100,
        dotX: 50,
        isDark: true,
        colorForCents: (c, opacity) => `cents ${c} @ ${opacity}`,
        colorOffChartByDirection: true,
      })

      expect(recorded.dot).toBe(`cents ${cents} @ 0.7`)
    },
  )

  test('keeps the orange palette without a measured frequency', () => {
    const { ctx, recorded } = createColorRecordingContext()
    const colorForCents = vi.fn(() => 'cents-colour')
    drawPitchLine(ctx, {
      midi: 69,
      frequency: null,
      height: 100,
      midiToY: () => 50,
      lineX0: 0,
      lineX1: 100,
      dotX: 50,
      isDark: true,
      colorForCents,
    })

    expect(recorded.dot).toBe(IN_RANGE_COLORS.dot)
    expect(colorForCents).not.toHaveBeenCalled()
  })

  test('keeps the orange palette without a cents colourer', () => {
    expect(drawColors({})).toEqual(IN_RANGE_COLORS)
  })

  test('keeps the high lane violet', () => {
    const colorForCents = vi.fn(() => 'cents-colour')

    expect(drawColors({ isHighLane: true, colorForCents })).toEqual(
      HIGH_LANE_COLORS,
    )
    expect(colorForCents).not.toHaveBeenCalled()
  })

  test('keeps an out-of-range line red', () => {
    const colorForCents = vi.fn(() => 'cents-colour')

    expect(drawColors({ isOutOfRange: true, colorForCents })).toEqual(
      OUT_OF_RANGE_COLORS,
    )
    expect(colorForCents).not.toHaveBeenCalled()
  })
})

describe('pitchLineColors - cents colour', () => {
  const colorForCents = (cents: number, opacity: number) =>
    `cents ${cents} @ ${opacity}`

  test('uses the cents colour for a plain in-range line', () => {
    expect(
      pitchLineColors({ isOutOfRange: false, cents: -12, colorForCents }),
    ).toEqual({
      line: 'cents -12 @ 0.25',
      dot: 'cents -12 @ 0.7',
      label: 'cents -12 @ 1',
    })
  })

  test.each([
    { state: { isCorrect: true }, expected: onTargetColors(true) },
    { state: { isOutOfRange: true }, expected: OUT_OF_RANGE_COLORS },
    { state: { isHighLane: true }, expected: HIGH_LANE_COLORS },
  ])('ranks below $state', ({ state, expected }) => {
    const colors = pitchLineColors({
      isOutOfRange: false,
      ...state,
      cents: 0,
      colorForCents,
    })

    expect(colors).toEqual(expected)
  })

  test('colours off-chart by offChartCents, still below on-target', () => {
    expect(
      pitchLineColors({
        isOutOfRange: true,
        offChartCents: -OFF_CENTS,
        colorForCents,
      }).dot,
    ).toBe(`cents ${-OFF_CENTS} @ 0.7`)
    expect(
      pitchLineColors({
        isOutOfRange: true,
        isCorrect: true,
        offChartCents: -OFF_CENTS,
        colorForCents,
      }).dot,
    ).toBe(onTargetColors(true).dot)
  })

  test('falls back to orange without cents', () => {
    expect(pitchLineColors({ isOutOfRange: false, colorForCents })).toEqual(
      IN_RANGE_COLORS,
    )
  })
})
