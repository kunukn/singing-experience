import { describe, expect, test, vi } from 'vitest'
import {
  clampPitchY,
  drawPitchLine,
  pitchLineColors,
  resolveEffectiveMidi,
} from './pitchLineRenderer'

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
  const HEIGHT = 100 // padded band is [16, 84]; overflow ±6 → clamp [10, 90]

  test('in-range Y passes through unchanged', () => {
    const result = clampPitchY(50, HEIGHT)
    expect(result.isOutOfRange).toBe(false)
    expect(result.clampedY).toBe(50)
  })

  test('above the top padding is out of range and clamped to the overflow edge', () => {
    const result = clampPitchY(-100, HEIGHT)
    expect(result.isOutOfRange).toBe(true)
    expect(result.clampedY).toBe(10)
  })

  test('below the bottom padding is out of range and clamped to the overflow edge', () => {
    const result = clampPitchY(500, HEIGHT)
    expect(result.isOutOfRange).toBe(true)
    expect(result.clampedY).toBe(90)
  })

  test('honors custom paddings', () => {
    const result = clampPitchY(5, HEIGHT, 0, 0)
    expect(result.isOutOfRange).toBe(false)
    expect(result.clampedY).toBe(5)
  })
})

describe('pitchLineColors', () => {
  test('correct (on target) wins over out-of-range → green', () => {
    const colors = pitchLineColors({ isOutOfRange: true, isCorrect: true })
    expect(colors).toEqual({
      line: 'rgba(74, 222, 128, 0.3)',
      dot: 'rgba(74, 222, 128, 0.8)',
      label: 'rgba(74, 222, 128, 0.9)',
    })
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

  test('duet high lane in range → blue', () => {
    const colors = pitchLineColors({ isOutOfRange: false, isHighLane: true })
    expect(colors).toEqual({
      line: 'rgba(96, 165, 250, 0.25)',
      dot: 'rgba(96, 165, 250, 0.7)',
      label: 'rgba(96, 165, 250, 0.8)',
    })
  })

  test('out-of-range beats the high lane hue → red', () => {
    const colors = pitchLineColors({ isOutOfRange: true, isHighLane: true })
    expect(colors.dot).toBe('rgba(239, 68, 68, 0.7)')
  })

  test('on target beats the high lane hue → green', () => {
    const colors = pitchLineColors({
      isOutOfRange: false,
      isCorrect: true,
      isHighLane: true,
    })
    expect(colors.dot).toBe('rgba(74, 222, 128, 0.8)')
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
      colorForCents,
    })

    expect(recorded.dot).toBe('rgba(251, 146, 60, 0.7)')
    expect(colorForCents).not.toHaveBeenCalled()
  })

  test('keeps the orange palette without a cents colourer', () => {
    expect(drawColors({})).toEqual({
      line: 'rgba(251, 146, 60, 0.25)',
      dot: 'rgba(251, 146, 60, 0.7)',
      label: 'rgba(251, 146, 60, 0.8)',
    })
  })

  test('keeps the high lane blue', () => {
    const colorForCents = vi.fn(() => 'cents-colour')

    expect(drawColors({ isHighLane: true, colorForCents }).dot).toBe(
      'rgba(96, 165, 250, 0.7)',
    )
    expect(colorForCents).not.toHaveBeenCalled()
  })

  test('keeps an out-of-range line red', () => {
    const colorForCents = vi.fn(() => 'cents-colour')

    expect(drawColors({ isOutOfRange: true, colorForCents }).dot).toBe(
      'rgba(239, 68, 68, 0.7)',
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
    { state: { isCorrect: true }, dot: 'rgba(74, 222, 128, 0.8)' },
    { state: { isOutOfRange: true }, dot: 'rgba(239, 68, 68, 0.7)' },
    { state: { isHighLane: true }, dot: 'rgba(96, 165, 250, 0.7)' },
  ])('ranks below $state', ({ state, dot }) => {
    const colors = pitchLineColors({
      isOutOfRange: false,
      ...state,
      cents: 0,
      colorForCents,
    })

    expect(colors.dot).toBe(dot)
  })

  test('falls back to orange without cents', () => {
    expect(pitchLineColors({ isOutOfRange: false, colorForCents }).dot).toBe(
      'rgba(251, 146, 60, 0.7)',
    )
  })
})
