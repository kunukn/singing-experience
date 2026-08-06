import { GUITAR_TUNINGS } from '@/utils/guitarTunings'
import { describe, expect, it } from 'vitest'
import {
  FRET_ROW_HEIGHT,
  GUITAR_MAX_FRET,
  buildGuitarLayout,
  guitarFretMidi,
  guitarFretY,
  guitarMidiMax,
  guitarMidiMin,
} from './guitarLayout'

/* String 6 is index 0 (leftmost), string 1 is index 5. */
const STRING_6 = 0
const STRING_5 = 1
const STRING_1 = 5

const C3_MIDI = 48

const STANDARD = GUITAR_TUNINGS.standard.midi
const DROP_D = GUITAR_TUNINGS.dropD.midi

describe('board range', () => {
  it('derives from the tuning and fret count', () => {
    expect(guitarMidiMin(STANDARD)).toBe(40) // E2, open 6th string
    expect(guitarMidiMax(STANDARD)).toBe(79) // G5, 15th fret of the 1st string
    expect(guitarMidiMax(STANDARD)).toBe(
      Math.max(...STANDARD) + GUITAR_MAX_FRET,
    )
  })

  it('follows the tuning down when a string is dropped', () => {
    /* Drop D lowers string 6 only, so the floor moves but the ceiling does not —
     * the range the duet split and the preview use must track it. */
    expect(guitarMidiMin(DROP_D)).toBe(38) // D2
    expect(guitarMidiMax(DROP_D)).toBe(guitarMidiMax(STANDARD))
  })
})

describe('guitarFretMidi', () => {
  it('returns the open string at fret 0', () => {
    expect(guitarFretMidi(STANDARD, STRING_6, 0)).toBe(40) // E2
    expect(guitarFretMidi(STANDARD, STRING_1, 0)).toBe(64) // E4
  })

  it('finds the same pitch on more than one string', () => {
    /* C3 sits at string 5 fret 3 and string 6 fret 8 — the case the live-pitch
     * overlay exists to show. */
    expect(guitarFretMidi(STANDARD, STRING_5, 3)).toBe(C3_MIDI)
    expect(guitarFretMidi(STANDARD, STRING_6, 8)).toBe(C3_MIDI)
  })

  it('retunes the whole string, not just its open note', () => {
    /* Every fret on the dropped string sounds a semitone lower; the others are
     * untouched. */
    expect(guitarFretMidi(DROP_D, STRING_6, 0)).toBe(38) // D2
    expect(guitarFretMidi(DROP_D, STRING_6, 8)).toBe(C3_MIDI - 2)
    expect(guitarFretMidi(DROP_D, STRING_5, 3)).toBe(C3_MIDI)
  })
})

describe('buildGuitarLayout', () => {
  const layout = buildGuitarLayout(60, STANDARD)

  it('covers every string and fret', () => {
    expect(layout.cells).toHaveLength(6 * 16)
  })

  it('sizes the board from the string width and the fixed row height', () => {
    expect(layout.boardWidth).toBe(360)
    expect(layout.boardHeight).toBe(16 * FRET_ROW_HEIGHT)
  })

  it('takes every cell pitch from the tuning it was given', () => {
    const dropD = buildGuitarLayout(60, DROP_D)
    const openLowString = (built: typeof layout) =>
      built.cells.find(
        (cell) => cell.stringIndex === STRING_6 && cell.fret === 0,
      )?.midi

    expect(openLowString(layout)).toBe(40) // E2
    expect(openLowString(dropD)).toBe(38) // D2
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
