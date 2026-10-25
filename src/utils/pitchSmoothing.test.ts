import { describe, expect, test } from 'vitest'
import { centsBetween } from './pitchMatch'
import { createJumpGate, smoothPitch } from './pitchSmoothing'

const C3 = 130.81

function centsAbove(hz: number, cents: number) {
  return hz * 2 ** (cents / 1200)
}

describe('pitchSmoothing', () => {
  test('adopts the first pitch after silence as it is', () => {
    expect(smoothPitch(null, C3)).toBe(C3)
  })

  test('moves 30% of the way toward a nearby pitch', () => {
    const next = centsAbove(C3, 40)

    expect(smoothPitch(C3, next)).toBeCloseTo(C3 + 0.3 * (next - C3), 5)
  })

  test.each([
    { name: 'a whole tone up', cents: 200 },
    { name: 'a fifth up', cents: 700 },
    { name: 'a fifth down', cents: -700 },
  ])('adopts $name at once', ({ cents }) => {
    const next = centsAbove(C3, cents)

    expect(smoothPitch(C3, next)).toBe(next)
  })

  test('still averages a step of exactly a semitone', () => {
    const next = centsAbove(C3, 100)

    expect(smoothPitch(C3, next)).toBeLessThan(next)
  })

  test('never trails the sung pitch by more than a semitone on a slow slide', () => {
    /* 60 cents a frame, slower than the reset on any single frame. */
    let smoothed: number | null = null
    let worstCents = 0
    for (let frame = 0; frame <= 12; frame++) {
      const sung = centsAbove(C3, frame * 60)
      smoothed = smoothPitch(smoothed, sung)
      worstCents = Math.max(worstCents, Math.abs(centsBetween(sung, smoothed)))
    }

    expect(worstCents).toBeLessThanOrEqual(100)
  })
})

describe('pitchSmoothing - createJumpGate', () => {
  /* One frame at 60 fps */
  const FRAME_MS = 16

  test('accepts the first pitch after a reset', () => {
    const gate = createJumpGate({ confirmMs: 80 })

    expect(gate.push(C3, 0)).toBe(C3)
  })

  test('accepts vibrato within a semitone at once', () => {
    const gate = createJumpGate({ confirmMs: 80 })
    gate.push(C3, 0)
    const sharp = centsAbove(C3, 60)

    expect(gate.push(sharp, FRAME_MS)).toBe(sharp)
  })

  test('holds through a two-frame octave-down spike and resumes the note', () => {
    const gate = createJumpGate({ confirmMs: 80 })
    const spike = centsAbove(C3, -1200)
    gate.push(C3, 0)

    expect(gate.push(spike, FRAME_MS)).toBeNull()
    expect(gate.push(spike, 2 * FRAME_MS)).toBeNull()
    expect(gate.push(C3, 3 * FRAME_MS)).toBe(C3)
  })

  test('accepts a real jump once it has held for confirmMs', () => {
    const gate = createJumpGate({ confirmMs: 80 })
    const fifthUp = centsAbove(C3, 700)
    gate.push(C3, 0)

    expect(gate.push(fifthUp, 100)).toBeNull()
    expect(gate.push(fifthUp, 160)).toBeNull()
    expect(gate.push(fifthUp, 180)).toBe(fifthUp)
  })

  test('never confirms noise that keeps jumping', () => {
    const gate = createJumpGate({ confirmMs: 80 })
    gate.push(C3, 0)
    const results: (number | null)[] = []
    for (let frame = 1; frame <= 20; frame++) {
      /* Alternates an octave down and a fifth up, each far from the other */
      const cents = frame % 2 === 0 ? -1200 : 700
      results.push(gate.push(centsAbove(C3, cents), frame * FRAME_MS))
    }

    expect(results.every((result) => result === null)).toBe(true)
  })

  test('accepts any pitch at once after reset', () => {
    const gate = createJumpGate({ confirmMs: 80 })
    const fifthUp = centsAbove(C3, 700)
    gate.push(C3, 0)
    gate.reset()

    expect(gate.push(fifthUp, FRAME_MS)).toBe(fifthUp)
  })
})
