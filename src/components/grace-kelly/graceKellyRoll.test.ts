import { describe, expect, test } from 'vitest'
import { VOZ_MELODIES } from './graceKellyMelodies'
import {
  assignLyricRows,
  buildRollBlocks,
  buildRollToneLabels,
  clipRangeToRoll,
  eighthToRollX,
  findRollBlockAt,
  ROLL_BAR_LINE_EIGHTHS,
  ROLL_COLUMNS,
  ROLL_PADDING_X,
  ROLL_TOTAL_EIGHTHS,
  rollMidiRange,
  vozColorIndex,
} from './graceKellyRoll'

/* G2 — the page's default start tone. */
const START_TONE_MIDI = 43
const ALL_VOICES = VOZ_MELODIES.map((_, index) => index)
/* Voz indices: the lead melody and the one-tone part open on the same pitch. */
const MELODY = 0
const ONE_TONE = 3

describe('graceKellyRoll', () => {
  test('the timeline has one column per note and spans the whole song', () => {
    expect(ROLL_COLUMNS).toHaveLength(34)
    expect(ROLL_COLUMNS[0].startEighth).toBe(0)
    expect(ROLL_TOTAL_EIGHTHS).toBe(46)
  })

  test('columns follow each other without gaps or overlaps', () => {
    for (let index = 1; index < ROLL_COLUMNS.length; index++) {
      const previous = ROLL_COLUMNS[index - 1]

      expect(ROLL_COLUMNS[index].startEighth).toBe(
        previous.startEighth + previous.eighths,
      )
    }
  })

  test('bar lines fall after the pickup and then every six eighths', () => {
    expect(ROLL_BAR_LINE_EIGHTHS).toEqual([3, 9, 15, 21, 27, 33, 39, 45])
  })

  test('a tied run becomes one block', () => {
    const blocks = buildRollBlocks([ONE_TONE], START_TONE_MIDI)
    const lastBlock = blocks[blocks.length - 1]

    /* 34 notes, the last two tied. */
    expect(blocks).toHaveLength(33)
    expect(lastBlock.firstNoteIndex).toBe(32)
    expect(lastBlock.lastNoteIndex).toBe(33)
    expect(lastBlock.startEighth + lastBlock.eighths).toBe(ROLL_TOTAL_EIGHTHS)
  })

  test('blocks are transposed by the start tone', () => {
    const [low] = buildRollBlocks([5], START_TONE_MIDI)
    const [higher] = buildRollBlocks([5], START_TONE_MIDI + 2)

    expect(higher.midi).toBe(low.midi + 2)
  })

  test('voices in unison share the row as stripes', () => {
    const blocks = buildRollBlocks([MELODY, ONE_TONE], START_TONE_MIDI)
    const melodyFirst = blocks.find(
      (block) => block.vozIndex === MELODY && block.firstNoteIndex === 0,
    )
    const oneToneFirst = blocks.find(
      (block) => block.vozIndex === ONE_TONE && block.firstNoteIndex === 0,
    )

    expect(melodyFirst?.midi).toBe(oneToneFirst?.midi)
    expect(melodyFirst).toMatchObject({ stripeIndex: 0, stripeCount: 2 })
    expect(oneToneFirst).toMatchObject({ stripeIndex: 1, stripeCount: 2 })
  })

  test('a voice alone on its pitch keeps the full row', () => {
    const blocks = buildRollBlocks([ONE_TONE], START_TONE_MIDI)

    expect(blocks.every((block) => block.stripeCount === 1)).toBe(true)
  })

  test('the pitch range covers every voice plus a semitone of headroom', () => {
    /* Offsets run 0–36, so G2 (43) gives 43–79 before padding. */
    expect(rollMidiRange(START_TONE_MIDI)).toEqual({ midiMin: 42, midiMax: 80 })
  })

  test('every block of every voice sits inside the pitch range', () => {
    const { midiMin, midiMax } = rollMidiRange(START_TONE_MIDI)
    const blocks = buildRollBlocks(ALL_VOICES, START_TONE_MIDI)

    expect(blocks.every((block) => block.midi > midiMin)).toBe(true)
    expect(blocks.every((block) => block.midi < midiMax)).toBe(true)
  })

  test('the time axis maps the song between the two edge paddings', () => {
    const width = 500

    expect(eighthToRollX(0, width)).toBe(ROLL_PADDING_X)
    expect(eighthToRollX(ROLL_TOTAL_EIGHTHS, width)).toBe(
      width - ROLL_PADDING_X,
    )
  })

  test('colours climb with the ladder: Low lowest, Melody highest', () => {
    expect(vozColorIndex(5)).toBe(0)
    expect(vozColorIndex(MELODY)).toBe(5)
  })

  test('lyrics stay on one row while they fit', () => {
    const syllables = [
      { x: 0, width: 10 },
      { x: 20, width: 10 },
      { x: 40, width: 10 },
    ]

    expect(assignLyricRows(syllables, 2)).toEqual([0, 0, 0])
  })

  test('a syllable that would run into the previous one drops a row', () => {
    const syllables = [
      { x: 0, width: 10 },
      { x: 20, width: 30 },
      { x: 40, width: 10 },
      { x: 60, width: 10 },
    ]

    expect(assignLyricRows(syllables, 2)).toEqual([0, 0, 1, 0])
  })

  test('a part that keeps one tone is named once', () => {
    const labels = buildRollToneLabels(
      buildRollBlocks([ONE_TONE], START_TONE_MIDI),
    )

    expect(labels).toHaveLength(1)
    expect(labels[0].startEighth).toBe(0)
  })

  test('a part is named again each time its tone changes', () => {
    const blocks = buildRollBlocks([MELODY], START_TONE_MIDI)
    const labels = buildRollToneLabels(blocks)
    const toneChanges = blocks.filter(
      (block, index) => index === 0 || block.midi !== blocks[index - 1].midi,
    )

    expect(labels.length).toBeLessThan(blocks.length)
    expect(labels.map((label) => label.startEighth)).toEqual(
      toneChanges.map((block) => block.startEighth),
    )
  })

  test('parts starting the same tone together share one name', () => {
    const labels = buildRollToneLabels(
      buildRollBlocks([MELODY, ONE_TONE], START_TONE_MIDI),
    )
    const atStart = labels.filter((label) => label.startEighth === 0)

    expect(atStart).toHaveLength(1)
    expect(atStart[0].vozIndex).toBe(MELODY)
  })

  describe('findRollBlockAt', () => {
    const WIDTH = 1000
    const ROW_HEIGHT = 10
    /* 10px per semitone, higher tones further up. */
    const midiToY = (midi: number) => (100 - midi) * 10
    const layout = { width: WIDTH, rowHeight: ROW_HEIGHT, midiToY }
    const blocks = buildRollBlocks([MELODY], START_TONE_MIDI)
    const first = blocks[0]
    const centerOf = (block: (typeof blocks)[number]) => ({
      x: eighthToRollX(block.startEighth + block.eighths / 2, WIDTH),
      y: midiToY(block.midi),
    })

    test('returns the block under the point', () => {
      expect(findRollBlockAt(blocks, centerOf(first), layout)).toBe(first)
    })

    test('returns the block sounding at that moment, not an earlier one', () => {
      const later = blocks.find((block) => block.midi !== first.midi)!

      expect(findRollBlockAt(blocks, centerOf(later), layout)?.midi).toBe(
        later.midi,
      )
    })

    test('returns null above and below the row', () => {
      const { x, y } = centerOf(first)

      expect(findRollBlockAt(blocks, { x, y: y - 6 }, layout)).toBeNull()
      expect(findRollBlockAt(blocks, { x, y: y + 6 }, layout)).toBeNull()
    })

    test('returns null before the first block starts', () => {
      const { y } = centerOf(first)

      expect(findRollBlockAt(blocks, { x: 0, y }, layout)).toBeNull()
    })

    test('reaches past the row by the slop', () => {
      const { x, y } = centerOf(first)

      expect(
        findRollBlockAt(blocks, { x, y: y - 8 }, { ...layout, slopY: 4 }),
      ).toBe(first)
    })

    test('picks the nearer row where two widened rows overlap', () => {
      const unison = buildRollBlocks(ALL_VOICES, START_TONE_MIDI)
      const start = unison.filter((block) => block.startEighth === 0)
      const midis = [...new Set(start.map((block) => block.midi))].sort(
        (a, b) => a - b,
      )
      const x = eighthToRollX(0.5, WIDTH)

      for (const midi of midis) {
        const hit = findRollBlockAt(
          unison,
          { x, y: midiToY(midi) + 1 },
          { ...layout, slopY: 30 },
        )

        expect(hit?.midi).toBe(midi)
      }
    })
  })

  describe('clipRangeToRoll', () => {
    /* F2–A5, the chart at the default start tone, roughly. */
    const chart = { midiMin: 41, midiMax: 81 }

    test('a range inside the chart is kept whole', () => {
      expect(clipRangeToRoll({ midiMin: 45, midiMax: 69 }, chart)).toEqual({
        midiMin: 45,
        midiMax: 69,
        isCutLow: false,
        isCutHigh: false,
      })
    })

    test('a range ending on the chart edges is not cut', () => {
      expect(clipRangeToRoll({ midiMin: 41, midiMax: 81 }, chart)).toEqual({
        midiMin: 41,
        midiMax: 81,
        isCutLow: false,
        isCutHigh: false,
      })
    })

    test('a range reaching below the chart is cut at the bottom', () => {
      expect(clipRangeToRoll({ midiMin: 36, midiMax: 69 }, chart)).toEqual({
        midiMin: 41,
        midiMax: 69,
        isCutLow: true,
        isCutHigh: false,
      })
    })

    test('a range reaching above the chart is cut at the top', () => {
      expect(clipRangeToRoll({ midiMin: 60, midiMax: 84 }, chart)).toEqual({
        midiMin: 60,
        midiMax: 81,
        isCutLow: false,
        isCutHigh: true,
      })
    })

    test('a range wider than the chart is cut at both ends', () => {
      expect(clipRangeToRoll({ midiMin: 36, midiMax: 84 }, chart)).toEqual({
        midiMin: 41,
        midiMax: 81,
        isCutLow: true,
        isCutHigh: true,
      })
    })

    test('a range that misses the chart gives nothing to draw', () => {
      expect(
        clipRangeToRoll(
          { midiMin: 36, midiMax: 48 },
          { midiMin: 60, midiMax: 84 },
        ),
      ).toBeNull()
      expect(
        clipRangeToRoll(
          { midiMin: 72, midiMax: 84 },
          { midiMin: 40, midiMax: 60 },
        ),
      ).toBeNull()
    })
  })
})
