import { describe, expect, it } from 'vitest'
import {
  INLAY_DOT_SIZE,
  buildGuitarInlays,
  buildGuitarStringLines,
  guitarFretWireTop,
  guitarLabelTone,
  guitarLabelToneClass,
  guitarScaleDotClass,
  guitarScaleLabelClass,
  isGuitarAccidentalMidi,
} from './guitarBoardDecorations'
import {
  DOUBLE_INLAY_FRET,
  FRET_ROW_HEIGHT,
  FRET_WIRE_HEIGHT,
  GUITAR_FRET_ROW_COUNT,
  GUITAR_STRING_COUNT,
  SINGLE_INLAY_FRETS,
} from './guitarLayout'

/* A wire is centred on its fret boundary, so it rides this far above it. */
const WIRE_RISE = Math.floor(FRET_WIRE_HEIGHT / 2)

/* px — a round string width keeps the expected positions readable. */
const STRING_WIDTH = 40
const BOARD_HEIGHT = GUITAR_FRET_ROW_COUNT * FRET_ROW_HEIGHT // 600
/* The boundary between strings 4 and 3 — where every inlay is centred. */
const BOARD_CENTER = (GUITAR_STRING_COUNT / 2) * STRING_WIDTH // 120

describe('buildGuitarInlays', () => {
  it('marks every single-dot fret plus the 12th fret pair', () => {
    expect(buildGuitarInlays(STRING_WIDTH)).toHaveLength(
      SINGLE_INLAY_FRETS.length + 2,
    )
  })

  it('gives every dot a unique key', () => {
    const keys = buildGuitarInlays(STRING_WIDTH).map((dot) => dot.key)

    expect(new Set(keys).size).toBe(keys.length)
  })

  it('centres the single dots on the board centre line', () => {
    const singles = buildGuitarInlays(STRING_WIDTH).slice(
      0,
      SINGLE_INLAY_FRETS.length,
    )

    for (const dot of singles) {
      expect(dot.left).toBe(BOARD_CENTER)
    }
  })

  it('spreads the 12th fret pair evenly either side of centre', () => {
    const pair = buildGuitarInlays(STRING_WIDTH).slice(
      SINGLE_INLAY_FRETS.length,
    )

    expect(pair).toHaveLength(2)
    expect(pair[0].top).toBe(pair[1].top)
    /* Equal and opposite offsets, so the pair reads as one centred marker. */
    expect(pair[0].left - BOARD_CENTER).toBe(BOARD_CENTER - pair[1].left)
    expect(pair[0].left).toBeLessThan(BOARD_CENTER)
  })

  it('lands the 12th fret pair on the string 5/4 and 3/2 boundaries', () => {
    const pair = buildGuitarInlays(STRING_WIDTH).slice(
      SINGLE_INLAY_FRETS.length,
    )

    /* One whole column either side of centre, as on a real neck. */
    expect(pair[0].left).toBe(BOARD_CENTER - STRING_WIDTH)
    expect(pair[1].left).toBe(BOARD_CENTER + STRING_WIDTH)
  })

  it('widens the 12th fret pair with the string width', () => {
    const pair = buildGuitarInlays(STRING_WIDTH * 2).slice(
      SINGLE_INLAY_FRETS.length,
    )

    /* The spread is a share of the board, not a px constant, so the pair keeps
     * its proportions on a wider board rather than bunching up. */
    expect(pair[0].left).toBe(BOARD_CENTER * 2 - STRING_WIDTH * 2)
    expect(pair[1].left).toBe(BOARD_CENTER * 2 + STRING_WIDTH * 2)
  })

  it('centres each dot vertically in its fret row', () => {
    const [firstSingle] = buildGuitarInlays(STRING_WIDTH)
    const [firstInlayFret] = SINGLE_INLAY_FRETS

    expect(firstSingle.top + INLAY_DOT_SIZE / 2).toBe(
      firstInlayFret * FRET_ROW_HEIGHT + FRET_ROW_HEIGHT / 2,
    )
  })

  it('scales with the string width', () => {
    const [wide] = buildGuitarInlays(STRING_WIDTH * 2)

    expect(wide.left).toBe(BOARD_CENTER * 2)
    /* Rows are a fixed semitone unit, so the pitch axis must not move. */
    expect(wide.top).toBe(buildGuitarInlays(STRING_WIDTH)[0].top)
  })

  it('places the 12th fret pair on the octave row', () => {
    const pair = buildGuitarInlays(STRING_WIDTH).slice(
      SINGLE_INLAY_FRETS.length,
    )

    expect(pair[0].top).toBe(
      DOUBLE_INLAY_FRET * FRET_ROW_HEIGHT +
        FRET_ROW_HEIGHT / 2 -
        INLAY_DOT_SIZE / 2,
    )
  })
})

describe('buildGuitarStringLines', () => {
  it('draws one line per string', () => {
    expect(buildGuitarStringLines(STRING_WIDTH)).toHaveLength(
      GUITAR_STRING_COUNT,
    )
  })

  it('runs each line down the centre of its column, where the names sit', () => {
    const lines = buildGuitarStringLines(STRING_WIDTH)

    expect(lines.map((line) => line.left)).toEqual([20, 60, 100, 140, 180, 220])
  })

  it('tapers from the wound low E down to the thin high E', () => {
    const widths = buildGuitarStringLines(STRING_WIDTH).map(
      (line) => line.width,
    )

    expect(widths[0]).toBeCloseTo(2.5)
    expect(widths[GUITAR_STRING_COUNT - 1]).toBeCloseTo(1)

    for (let index = 1; index < widths.length; index++) {
      expect(widths[index]).toBeLessThan(widths[index - 1])
    }
  })

  it('gives every line a unique key', () => {
    const keys = buildGuitarStringLines(STRING_WIDTH).map((line) => line.key)

    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('guitarFretWireTop', () => {
  it('sits the wire at the bottom of its fret row', () => {
    expect(guitarFretWireTop(0, BOARD_HEIGHT)).toBe(FRET_ROW_HEIGHT - WIRE_RISE)
    expect(guitarFretWireTop(3, BOARD_HEIGHT)).toBe(
      4 * FRET_ROW_HEIGHT - WIRE_RISE,
    )
  })

  it('tucks the last wire inside the board', () => {
    const lastFret = GUITAR_FRET_ROW_COUNT - 1

    /* Unclamped it would land at exactly boardHeight and push its own height
     * past the box — a permanent scrollbar on a board that fits. */
    expect(guitarFretWireTop(lastFret, BOARD_HEIGHT)).toBe(
      BOARD_HEIGHT - FRET_WIRE_HEIGHT,
    )
  })

  it('never returns a position past the board height', () => {
    for (let fret = 0; fret < GUITAR_FRET_ROW_COUNT; fret++) {
      expect(guitarFretWireTop(fret, BOARD_HEIGHT)).toBeLessThan(BOARD_HEIGHT)
    }
  })
})

describe('at a resized row height', () => {
  const TALL_ROW = 38
  const TALL_BOARD = GUITAR_FRET_ROW_COUNT * TALL_ROW

  it('keeps the inlays centred in their taller rows', () => {
    const [firstSingle] = buildGuitarInlays(STRING_WIDTH, TALL_ROW)
    const [firstInlayFret] = SINGLE_INLAY_FRETS

    expect(firstSingle.top + INLAY_DOT_SIZE / 2).toBe(
      firstInlayFret * TALL_ROW + TALL_ROW / 2,
    )
  })

  it('keeps the wires on the taller row boundaries, last one still tucked in', () => {
    expect(guitarFretWireTop(0, TALL_BOARD, TALL_ROW)).toBe(
      TALL_ROW - WIRE_RISE,
    )
    expect(guitarFretWireTop(3, TALL_BOARD, TALL_ROW)).toBe(
      4 * TALL_ROW - WIRE_RISE,
    )
    expect(
      guitarFretWireTop(GUITAR_FRET_ROW_COUNT - 1, TALL_BOARD, TALL_ROW),
    ).toBe(TALL_BOARD - FRET_WIRE_HEIGHT)
  })

  it('falls back to the base row when none is given', () => {
    expect(buildGuitarInlays(STRING_WIDTH)).toEqual(
      buildGuitarInlays(STRING_WIDTH, FRET_ROW_HEIGHT),
    )
  })
})

describe('scale highlight classes', () => {
  it('gives the root a deeper dot than the other scale tones', () => {
    expect(guitarScaleDotClass('root')).toBe('bg-(--p-blue-500)')
    expect(guitarScaleDotClass('scale')).toBe('bg-(--p-blue-300)')
  })

  it('leaves an unhighlighted cell bare', () => {
    expect(guitarScaleDotClass(null)).toBeNull()
    expect(guitarScaleLabelClass(null)).toBeNull()
  })

  it('recolours the name so it survives the dot fill', () => {
    expect(guitarScaleLabelClass('root')).toBe('text-(--p-surface-0)')
    expect(guitarScaleLabelClass('scale')).toBe('text-(--p-surface-900)')
  })

  it('leaves an emphasized name to the fret button own style', () => {
    expect(guitarLabelToneClass('emphasized')).toBeNull()
  })

  it('draws the two stepped-back readings in the theme text tokens', () => {
    expect(guitarLabelToneClass('natural')).toBe(
      'font-normal text-(--p-text-color)',
    )
    expect(guitarLabelToneClass('muted')).toBe(
      'font-normal text-(--p-text-muted-color)',
    )
  })
})

describe('guitarLabelTone', () => {
  it('leaves a name in the scale emphasized, accidental or not', () => {
    expect(guitarLabelTone('emphasized', true, false)).toBe('emphasized')
    expect(guitarLabelTone('emphasized', true, true)).toBe('emphasized')
  })

  it('recedes every name outside the selected scale equally', () => {
    /* Promoting the out-of-scale naturals here would argue with the highlight
     * the singer just asked for — membership is the only figure worth reading
     * while a scale is on. */
    expect(guitarLabelTone('diminished', true, false)).toBe('muted')
    expect(guitarLabelTone('diminished', true, true)).toBe('muted')
  })

  it('splits naturals from accidentals once no scale is competing', () => {
    expect(guitarLabelTone('diminished', false, false)).toBe('natural')
    expect(guitarLabelTone('diminished', false, true)).toBe('muted')
  })
})

describe('isGuitarAccidentalMidi', () => {
  it('marks the five sharp/flat pitch classes and no others', () => {
    /* C4 = 60, so the octave from it covers every pitch class once. */
    const accidentals = Array.from({ length: 12 }, (_, index) => 60 + index)
      .filter(isGuitarAccidentalMidi)
      .map((midi) => midi - 60)

    expect(accidentals).toEqual([1, 3, 6, 8, 10])
  })

  it('reads the same in every octave, including below middle C', () => {
    /* E2 (40) is the low open string, F♯2 (42) the first accidental above it. */
    expect(isGuitarAccidentalMidi(40)).toBe(false)
    expect(isGuitarAccidentalMidi(41)).toBe(false) // F2 — a natural
    expect(isGuitarAccidentalMidi(42)).toBe(true)
    expect(isGuitarAccidentalMidi(0)).toBe(false)
  })
})
