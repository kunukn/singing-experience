import { describe, expect, test } from 'vitest'
import { chordVoicing } from './chordVoicing'

const C3 = 48
const C = 0
const E_FLAT = 3
const A_FLAT = 8
const A = 9

describe('chordVoicing', () => {
  test('stacks a chord in root position from the lowest root in range', () => {
    expect(chordVoicing(C, 'major', null, C3)).toEqual([48, 52, 55])
    expect(chordVoicing(A, 'minor7', null, C3)).toEqual([57, 60, 64, 67])
  })

  test('puts a slash chord’s bass note under the chord', () => {
    // A♭7/E♭ = E♭3 · A♭3 C4 E♭4 G♭4
    expect(chordVoicing(A_FLAT, 'dominant7', E_FLAT, C3)).toEqual([
      51, 56, 60, 63, 66,
    ])
  })

  test('adds no extra note when the bass is the root', () => {
    expect(chordVoicing(A_FLAT, 'dominant7', A_FLAT, C3)).toEqual([
      56, 60, 63, 66,
    ])
  })

  test('keeps the 9th above the octave', () => {
    expect(chordVoicing(C, 'add9', null, C3)).toEqual([48, 52, 55, 62])
  })
})
