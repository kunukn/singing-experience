import { GUITAR_TUNINGS } from '@/utils/guitarTunings'
import { describe, expect, it } from 'vitest'
import {
  FRET_RING_SHADOW_WIDTH,
  FRET_ROW_HEIGHT,
  FRET_WIRE_HEIGHT,
  GUITAR_FRET_ROW_COUNT,
  GUITAR_MAX_FRET,
  MAX_FRET_ROW_HEIGHT,
  NUT_OVERHANG,
  buildGuitarBoardScale,
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

  it('follows a resized row', () => {
    const TALL_ROW = 38

    expect(guitarFretY(0, TALL_ROW)).toBe(TALL_ROW / 2)
    expect(guitarFretY(3, TALL_ROW)).toBe(3.5 * TALL_ROW)
  })
})

describe('buildGuitarLayout at a resized row height', () => {
  const TALL_ROW = 38
  const tall = buildGuitarLayout(72, STANDARD, TALL_ROW)

  it('reports the row height it was built with', () => {
    expect(tall.rowHeight).toBe(TALL_ROW)
    expect(buildGuitarLayout(72, STANDARD).rowHeight).toBe(FRET_ROW_HEIGHT)
  })

  it('grows the board by the row height, not the string width', () => {
    expect(tall.boardHeight).toBe(16 * TALL_ROW)
    expect(tall.boardWidth).toBe(6 * 72)
  })

  it('keeps the grid uniform at the new height', () => {
    const string6 = tall.cells.filter((cell) => cell.stringIndex === STRING_6)
    const steps = string6
      .slice(1)
      .map((cell, index) => cell.topPx - string6[index].topPx)

    expect(new Set(steps)).toEqual(new Set([TALL_ROW]))
  })

  it('leaves the pitches alone', () => {
    expect(tall.cells.map((cell) => cell.midi)).toEqual(
      buildGuitarLayout(60, STANDARD).cells.map((cell) => cell.midi),
    )
  })
})

describe('buildGuitarBoardScale', () => {
  /* Viewport heights of the screens this actually has to land on. */
  const LAPTOP = 800
  const LARGE_LAPTOP = 900
  const DESKTOP = 1080

  const SHORT = 600
  const ALL_HEIGHTS = [SHORT, LAPTOP, LARGE_LAPTOP, DESKTOP]

  it('gives a taller window taller rows', () => {
    const rowHeights = ALL_HEIGHTS.map(
      (height) => buildGuitarBoardScale(height, false).rowHeight,
    )

    for (let index = 1; index < rowHeights.length; index++) {
      expect(rowHeights[index]).toBeGreaterThan(rowHeights[index - 1])
    }
  })

  it('stops growing at the ceiling, however tall the window', () => {
    expect(buildGuitarBoardScale(4000, false).rowHeight).toBe(
      MAX_FRET_ROW_HEIGHT,
    )
  })

  it('never drops below the base row, however short the window', () => {
    expect(buildGuitarBoardScale(0, false).rowHeight).toBe(FRET_ROW_HEIGHT)
  })

  /*
   * On touch the board lives in its own 70svh scroll box, so the rows may grow
   * only as far as that box can still show all sixteen at once — a tablet has
   * room for the full desktop board, a phone does not.
   */
  describe('on touch', () => {
    const TABLET = 1180 // iPad Air
    const PHONE = 844 // iPhone 14
    const SHORT_PHONE = 667 // iPhone SE

    it('gives a tablet the same rows a desktop gets', () => {
      expect(buildGuitarBoardScale(TABLET, true).rowHeight).toBe(
        MAX_FRET_ROW_HEIGHT,
      )
    })

    it('keeps a short phone on the base row, where the board scrolls anyway', () => {
      expect(buildGuitarBoardScale(SHORT_PHONE, true).rowHeight).toBe(
        FRET_ROW_HEIGHT,
      )
    })

    it('never grows the board past the box it scrolls in', () => {
      for (const viewportHeight of [SHORT_PHONE, PHONE, TABLET, 4000]) {
        const { rowHeight } = buildGuitarBoardScale(viewportHeight, true)
        /* The base row is the floor, so a board that overflows at 30px still
         * overflows — that case scrolls by design and is not what this guards. */
        if (rowHeight === FRET_ROW_HEIGHT) continue

        expect(GUITAR_FRET_ROW_COUNT * rowHeight).toBeLessThanOrEqual(
          viewportHeight * 0.7,
        )
      }
    })

    it('never grows a row past what the pointer branch would give', () => {
      for (const viewportHeight of [SHORT_PHONE, PHONE, TABLET]) {
        expect(
          buildGuitarBoardScale(viewportHeight, true).rowHeight,
        ).toBeLessThanOrEqual(
          buildGuitarBoardScale(viewportHeight, false).rowHeight,
        )
      }
    })
  })

  it('keeps the board fitting the window it was sized for', () => {
    for (const viewportHeight of ALL_HEIGHTS) {
      const { rowHeight } = buildGuitarBoardScale(viewportHeight, false)

      expect(GUITAR_FRET_ROW_COUNT * rowHeight).toBeLessThan(viewportHeight)
    }
  })

  it('keeps the hover ring clear of the wire above it, nut included', () => {
    /*
     * Two regressions this guards. The ring is painted as a box-shadow spread,
     * which renders OUTSIDE the element's own box — sizing it against the row
     * without allowing for that put the ring on top of the wire. And row 1 has
     * the nut above it, not a hairline, so clearing FRET_WIRE_HEIGHT is not
     * enough.
     */
    for (const viewportHeight of ALL_HEIGHTS) {
      const scale = buildGuitarBoardScale(viewportHeight, false)
      const visibleRing = scale.fretRingSize + 2 * FRET_RING_SHADOW_WIDTH
      /* The ring is centred, so each side gets half of what is left over. */
      const gapAboveRing = (scale.rowHeight - visibleRing) / 2

      expect(gapAboveRing).toBeGreaterThan(NUT_OVERHANG)
      expect(NUT_OVERHANG).toBeGreaterThanOrEqual(FRET_WIRE_HEIGHT)
    }
  })

  it('keeps the dot inside the ring, so a tinted cell still shows its ring', () => {
    for (const viewportHeight of ALL_HEIGHTS) {
      const scale = buildGuitarBoardScale(viewportHeight, false)

      expect(scale.scaleDotSize).toBeLessThan(scale.fretRingSize)
    }
  })

  it('stops growing the label once the rows stop growing', () => {
    expect(buildGuitarBoardScale(4000, false).labelFontSize).toBe(
      buildGuitarBoardScale(DESKTOP, false).labelFontSize,
    )
  })

  it('scales the type with the rows', () => {
    const scales = ALL_HEIGHTS.map((height) =>
      buildGuitarBoardScale(height, false),
    )

    for (let index = 1; index < scales.length; index++) {
      expect(scales[index].labelFontSize).toBeGreaterThanOrEqual(
        scales[index - 1].labelFontSize,
      )
      expect(scales[index].gutterFontSize).toBeGreaterThanOrEqual(
        scales[index - 1].gutterFontSize,
      )
    }
  })

  it('keeps the fret numbers smaller than the note names', () => {
    for (const viewportHeight of [600, LAPTOP, LARGE_LAPTOP, DESKTOP]) {
      const scale = buildGuitarBoardScale(viewportHeight, false)

      expect(scale.gutterFontSize).toBeLessThan(scale.labelFontSize)
    }
  })
})
