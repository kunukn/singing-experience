import { GUITAR_TUNINGS } from '@/utils/guitarTunings'
import { describe, expect, it } from 'vitest'
import {
  BOARD_VERTICAL_CHROME,
  DOUBLE_INLAY_FRET,
  FRET_RING_SHADOW_WIDTH,
  FRET_ROW_HEIGHT,
  FRET_WIRE_HEIGHT,
  GUITAR_FRET_ROW_COUNT,
  GUITAR_MAX_FRET,
  GUITAR_STRING_COUNT,
  MAX_FRET_ROW_HEIGHT,
  NUT_OVERHANG,
  SINGLE_INLAY_FRETS,
  buildGuitarBoardScale,
  buildGuitarLayout,
  guitarBoardAvailableHeight,
  guitarDuetMidiMax,
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
    expect(guitarMidiMax(STANDARD)).toBe(86) // D6, 22nd fret of the 1st string
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

  it('keeps the duet split off the frets added above it', () => {
    /*
     * The crossover is the midpoint of the range it is handed, so a board that
     * grew seven frets taller must not drag the boundary between the two
     * singers' lanes up with it. This is the whole reason the two ceilings are
     * separate functions — and this number staying put across the 19 → 22
     * change is the evidence they are still separate.
     */
    expect(guitarDuetMidiMax(STANDARD)).toBe(79) // G5, unchanged at 15 frets
    expect(guitarMidiMax(STANDARD)).toBeGreaterThan(guitarDuetMidiMax(STANDARD))
  })

  it('still lets the tuning move the duet split', () => {
    /* Pinned to a fret, not to a pitch: retuning changes what the low voice can
     * reach, and the split has to follow that. */
    expect(guitarDuetMidiMax(DROP_D)).toBe(guitarDuetMidiMax(STANDARD))
    expect(guitarMidiMin(DROP_D)).toBeLessThan(guitarMidiMin(STANDARD))
  })
})

describe('inlays', () => {
  it('marks only frets the board actually has', () => {
    for (const fret of [...SINGLE_INLAY_FRETS, DOUBLE_INLAY_FRET]) {
      expect(fret).toBeLessThanOrEqual(GUITAR_MAX_FRET)
    }
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

  it('covers every string and fret exactly once', () => {
    /* Stronger than a length check, and it never needs renumbering: a duplicated
     * or missing cell fails here whatever the board's dimensions are. */
    const positions = new Set(
      layout.cells.map((cell) => `${cell.stringIndex}-${cell.fret}`),
    )

    expect(positions.size).toBe(GUITAR_STRING_COUNT * GUITAR_FRET_ROW_COUNT)
    expect(layout.cells).toHaveLength(positions.size)
  })

  it('sizes the board from the string width and the fixed row height', () => {
    expect(layout.boardWidth).toBe(360)
    expect(layout.boardHeight).toBe(GUITAR_FRET_ROW_COUNT * FRET_ROW_HEIGHT)
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
    const steps = string6
      .slice(1)
      .map((cell, index) => cell.topPx - string6[index].topPx)

    expect(string6[0].topPx).toBe(0)
    expect(new Set(steps)).toEqual(new Set([FRET_ROW_HEIGHT]))
    /* Anchored to the last row, so the check keeps reaching the bottom of the
     * board rather than stopping wherever the neck happened to end when this
     * was written — it has moved from 15 to 19 to 22 already. */
    expect(string6.at(-1)?.topPx).toBe(GUITAR_MAX_FRET * FRET_ROW_HEIGHT)
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
    expect(tall.boardHeight).toBe(GUITAR_FRET_ROW_COUNT * TALL_ROW)
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

  it('never shrinks a row as the window grows', () => {
    /*
     * Swept rather than sampled: the failure this guards is a clamp that
     * inverts somewhere between two screen sizes, and four sample points cannot
     * see it. Not strictly increasing — the floor and the ceiling both flatten
     * whole stretches of the range, which is the point of having them.
     */
    let previous = 0

    for (
      let viewportHeight = 400;
      viewportHeight <= 1600;
      viewportHeight += 10
    ) {
      const { rowHeight } = buildGuitarBoardScale(viewportHeight, false)

      expect(rowHeight).toBeGreaterThanOrEqual(previous)
      previous = rowHeight
    }
  })

  it('does grow the rows between a short window and a tall one', () => {
    /* Paired with the sweep above, which a constant would otherwise satisfy. */
    expect(buildGuitarBoardScale(DESKTOP, false).rowHeight).toBeGreaterThan(
      buildGuitarBoardScale(LAPTOP, false).rowHeight,
    )
  })

  it('stops growing at the ceiling, however tall the window', () => {
    expect(buildGuitarBoardScale(4000, false).rowHeight).toBe(
      MAX_FRET_ROW_HEIGHT,
    )
  })

  it('reaches the ceiling as soon as the board fits at full height', () => {
    /* Keeps the 4000px test above honest about WHERE the ceiling starts biting,
     * rather than only that it exists somewhere. */
    const tallestBoard = GUITAR_FRET_ROW_COUNT * MAX_FRET_ROW_HEIGHT
    const justEnough = ALL_HEIGHTS.concat([1325, 1600]).find(
      (height) => guitarBoardAvailableHeight(height, false) >= tallestBoard,
    )

    expect(justEnough).toBeDefined()
    expect(buildGuitarBoardScale(justEnough!, false).rowHeight).toBe(
      MAX_FRET_ROW_HEIGHT,
    )
  })

  it('never drops below the base row, however short the window', () => {
    expect(buildGuitarBoardScale(0, false).rowHeight).toBe(FRET_ROW_HEIGHT)
  })

  /*
   * On touch the board lives in its own 70svh scroll box, so the rows may grow
   * only as far as that box can still show the whole neck at once — a tablet
   * gets a readable row, a phone is held to the base one and scrolls.
   */
  describe('on touch', () => {
    const TABLET = 1180 // iPad Air
    const PHONE = 844 // iPhone 14
    const SHORT_PHONE = 667 // iPhone SE

    it('keeps a tablet well clear of the phone base row', () => {
      expect(buildGuitarBoardScale(TABLET, true).rowHeight).toBeGreaterThan(
        FRET_ROW_HEIGHT,
      )
      /*
       * The user-visible half of it: the names are bigger than a phone's.
       *
       * Bigger, not maximal. At 20 rows a tablet did reach the 14px cap; at 23
       * it lands on 13, because the ceiling now wants ~1358px of window and a
       * tablet's 70% box offers ~826px. Growing over the base row is what the
       * extra height was for — reaching the cap never was.
       */
      expect(buildGuitarBoardScale(TABLET, true).labelFontSize).toBeGreaterThan(
        buildGuitarBoardScale(SHORT_PHONE, true).labelFontSize,
      )
    })

    it('keeps a short phone on the base row, where the board scrolls anyway', () => {
      expect(buildGuitarBoardScale(SHORT_PHONE, true).rowHeight).toBe(
        FRET_ROW_HEIGHT,
      )
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

  it('keeps the board inside the height it was given, on either pointer', () => {
    /*
     * One check for both branches, against the real bound rather than the raw
     * viewport: the chrome above and below the board is not the board's to use,
     * and on touch the 70svh box is tighter still.
     */
    for (const viewportHeight of [...ALL_HEIGHTS, 667, 844, 1180, 4000]) {
      for (const isCoarsePointer of [false, true]) {
        const { rowHeight } = buildGuitarBoardScale(
          viewportHeight,
          isCoarsePointer,
        )
        /* The base row is the floor, so a board that overflows at 30px still
         * overflows — that case scrolls by design and is not what this guards. */
        if (rowHeight === FRET_ROW_HEIGHT) continue

        expect(GUITAR_FRET_ROW_COUNT * rowHeight).toBeLessThanOrEqual(
          guitarBoardAvailableHeight(viewportHeight, isCoarsePointer),
        )
      }
    }
  })

  it('gives a page with more chrome above it a shorter board', () => {
    /*
     * /guitar-test stacks a simulated-singer panel above the board, so it has
     * roughly 130px less to work with than /guitar at the same window height.
     * Sizing both from one constant is what used to hang the harness's last
     * frets off the bottom of the screen.
     */
    const HARNESS_CHROME = 375

    const page = buildGuitarBoardScale(DESKTOP, false)
    const harness = buildGuitarBoardScale(DESKTOP, false, HARNESS_CHROME)

    expect(harness.rowHeight).toBeLessThan(page.rowHeight)
    expect(GUITAR_FRET_ROW_COUNT * harness.rowHeight).toBeLessThanOrEqual(
      guitarBoardAvailableHeight(DESKTOP, false, HARNESS_CHROME),
    )
  })

  it('falls back to the built-in chrome when none is measured yet', () => {
    expect(buildGuitarBoardScale(DESKTOP, false)).toEqual(
      buildGuitarBoardScale(DESKTOP, false, BOARD_VERTICAL_CHROME),
    )
  })

  it('uses as much of that height as whole rows allow', () => {
    /* The defining property of the floor division: one more pixel per row would
     * not fit. Skipped at the clamps, which are bounds of their own. */
    for (const viewportHeight of [...ALL_HEIGHTS, 667, 844, 1180]) {
      for (const isCoarsePointer of [false, true]) {
        const { rowHeight } = buildGuitarBoardScale(
          viewportHeight,
          isCoarsePointer,
        )
        if (
          rowHeight === FRET_ROW_HEIGHT ||
          rowHeight === MAX_FRET_ROW_HEIGHT
        ) {
          continue
        }

        expect(GUITAR_FRET_ROW_COUNT * (rowHeight + 1)).toBeGreaterThan(
          guitarBoardAvailableHeight(viewportHeight, isCoarsePointer),
        )
      }
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
    /*
     * Derived rather than pinned to a named viewport. The window needed to
     * reach MAX_FRET_ROW_HEIGHT moves with the fret count — 23 rows want
     * ~1325px where 20 wanted ~1187px — so the old DESKTOP (1080) pin stopped
     * being a window that saturates at all, and would have gone on asserting
     * something it no longer set up.
     */
    const ceilingHeight =
      GUITAR_FRET_ROW_COUNT * MAX_FRET_ROW_HEIGHT + BOARD_VERTICAL_CHROME
    expect(buildGuitarBoardScale(ceilingHeight, false).rowHeight).toBe(
      MAX_FRET_ROW_HEIGHT,
    )

    expect(buildGuitarBoardScale(4000, false).labelFontSize).toBe(
      buildGuitarBoardScale(ceilingHeight, false).labelFontSize,
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
