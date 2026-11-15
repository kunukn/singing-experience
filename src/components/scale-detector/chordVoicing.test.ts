import { describe, expect, test } from 'vitest'
import { chordVoicing } from './chordVoicing'

const C3 = 48
const C = 0
const D = 2
const E_FLAT = 3
const A_FLAT = 8
const A = 9

describe('chordVoicing', () => {
  test('stacks a chord upwards from the lowest root in range', () => {
    expect(chordVoicing(C, 'major', null, C3)).toEqual([48, 52, 55])
    // Dm7 = D3 F3 A3 C4: only the C above the root, not C3 below it
    expect(chordVoicing(D, 'minor7', null, C3)).toEqual([50, 53, 57, 60])
  })

  test('puts a slash chord’s bass note at the bottom, within an octave', () => {
    // A♭7/E♭ = E♭3 G♭3 A♭3 C4
    expect(chordVoicing(A_FLAT, 'dominant7', E_FLAT, C3)).toEqual([
      51, 54, 56, 60,
    ])
  })

  test('treats a bass equal to the root as no slash', () => {
    expect(chordVoicing(A_FLAT, 'dominant7', A_FLAT, C3)).toEqual(
      chordVoicing(A_FLAT, 'dominant7', null, C3),
    )
  })

  test('keeps every note within an octave of the bass', () => {
    // Am9 = A3 B3 C4 E4 G4
    const voicing = chordVoicing(A, 'minor9', null, C3)

    expect(voicing).toEqual([57, 59, 60, 64, 67])
    expect(Math.max(...voicing) - voicing[0]).toBeLessThan(12)
  })
})
