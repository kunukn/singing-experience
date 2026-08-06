import { describe, expect, it } from 'vitest'
import {
  FRET_ROW_HEIGHT,
  GUITAR_MAX_FRET,
  GUITAR_MIDI_MAX,
  GUITAR_MIDI_MIN,
  GUITAR_STANDARD_TUNING,
  buildGuitarLayout,
  guitarFretMidi,
  guitarFretY,
} from './guitarLayout'

/* String 6 is index 0 (leftmost), string 1 is index 5. */
const STRING_6 = 0
const STRING_5 = 1
const STRING_1 = 5

const C3_MIDI = 48

describe('tuning', () => {
  it('is standard EADGBE, low string first', () => {
    expect(GUITAR_STANDARD_TUNING).toEqual([40, 45, 50, 55, 59, 64])
  })

  it('derives the board range from the tuning and fret count', () => {
    expect(GUITAR_MIDI_MIN).toBe(40) // E2, open 6th string
    expect(GUITAR_MIDI_MAX).toBe(79) // G5, 15th fret of the 1st string
    expect(GUITAR_MIDI_MAX).toBe(
      Math.max(...GUITAR_STANDARD_TUNING) + GUITAR_MAX_FRET,
    )
  })
})

describe('guitarFretMidi', () => {
  it('returns the open string at fret 0', () => {
    expect(guitarFretMidi(STRING_6, 0)).toBe(40) // E2
    expect(guitarFretMidi(STRING_1, 0)).toBe(64) // E4
  })

  it('finds the same pitch on more than one string', () => {
    /* C3 sits at string 5 fret 3 and string 6 fret 8 — the case the live-pitch
     * overlay exists to show. */
    expect(guitarFretMidi(STRING_5, 3)).toBe(C3_MIDI)
    expect(guitarFretMidi(STRING_6, 8)).toBe(C3_MIDI)
  })
})

describe('buildGuitarLayout', () => {
  const layout = buildGuitarLayout(60)

  it('covers every string and fret', () => {
    expect(layout.cells).toHaveLength(6 * 16)
  })

  it('sizes the board from the string width and the fixed row height', () => {
    expect(layout.boardWidth).toBe(360)
    expect(layout.boardHeight).toBe(16 * FRET_ROW_HEIGHT)
  })

  it('places cells on a uniform grid', () => {
    const string6 = layout.cells.filter((cell) => cell.stringIndex === STRING_6)
    expect(string6[0].topPx).toBe(0)
    expect(string6[1].topPx - string6[0].topPx).toBe(FRET_ROW_HEIGHT)
    expect(string6[15].topPx - string6[14].topPx).toBe(FRET_ROW_HEIGHT)
  })
})

describe('guitarFretY', () => {
  it('puts a whole fret at the centre of its row', () => {
    expect(guitarFretY(0)).toBe(FRET_ROW_HEIGHT / 2)
    expect(guitarFretY(3)).toBe(3.5 * FRET_ROW_HEIGHT)
  })

  it('keeps every semitone step the same height', () => {
    /* The guarantee that makes the live-pitch segment travel at a constant
     * px-per-cent: a real neck's frets narrow as they climb, this board's
     * do not. */
    const steps = Array.from(
      { length: GUITAR_MAX_FRET },
      (_, fret) => guitarFretY(fret + 1) - guitarFretY(fret),
    )
    expect(new Set(steps)).toEqual(new Set([FRET_ROW_HEIGHT]))
  })

  it('lands a half step on the wire between two rows', () => {
    expect(guitarFretY(2.5)).toBe(3 * FRET_ROW_HEIGHT)
  })
})
