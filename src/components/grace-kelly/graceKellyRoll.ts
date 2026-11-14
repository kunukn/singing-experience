/* Grace Kelly piano roll — pure geometry and data for the "Harmony chart" tab.
 *
 * Turns the Voz melodies into blocks on a pitch-vs-time chart: time in
 * eighth-note units along x, MIDI pitch along y. The canvas, the lyric strip
 * and the playhead all read their positions from here, so they cannot drift
 * apart. */

import { VOZ_MELODIES } from './graceKellyMelodies'

/* One timeline step — every voice shares the rhythm, so a column is the same
 * note index in all six voices. */
export type RollColumn = {
  noteIndex: number
  startEighth: number
  /* Sounding length; a trailing rest (restAfterEighths) is not included. */
  eighths: number
}

export type RollBlock = {
  vozIndex: number
  midi: number
  startEighth: number
  eighths: number
  /* Timeline note indices the block covers — more than one when tied notes
   * merge into a single sustained tone. */
  firstNoteIndex: number
  lastNoteIndex: number
  /* Voices singing the same pitch at the same time share the row: each gets
   * one of `stripeCount` horizontal stripes, so none hides another. */
  stripeIndex: number
  stripeCount: number
}

/* Eighths in a full 6/8 bar. */
const BAR_EIGHTHS = 6

/* Semitones of headroom above and below the sung range, so the top and bottom
 * blocks are not cut by the chart edge. */
const RANGE_PADDING_SEMITONES = 1

/* px kept free at both ends of the time axis, so the first block and the last
 * bar line do not touch the chart edge. */
export const ROLL_PADDING_X = 8

function buildRollColumns(): RollColumn[] {
  /* All voices share one rhythm — the first melody is the timeline reference,
   * as in useGraceKellyHarmony. */
  const timeline = VOZ_MELODIES[0].notes
  const columns: RollColumn[] = []
  let cursor = 0

  timeline.forEach((note, noteIndex) => {
    columns.push({ noteIndex, startEighth: cursor, eighths: note.eighthNotes })
    cursor += note.eighthNotes + (note.restAfterEighths ?? 0)
  })

  return columns
}

export const ROLL_COLUMNS: readonly RollColumn[] = buildRollColumns()

/* Length of the played song in eighths (notation-only trailing rests are not
 * played, so they are not charted either). */
export const ROLL_TOTAL_EIGHTHS: number = ROLL_COLUMNS.reduce(
  (end, column) => Math.max(end, column.startEighth + column.eighths),
  0,
)

/* Bar lines: one after the pickup, then every full bar. */
export const ROLL_BAR_LINE_EIGHTHS: readonly number[] = (() => {
  const lines: number[] = []
  const pickup = VOZ_MELODIES[0].anacrusisEighths ?? 0

  for (
    let eighth = pickup > 0 ? pickup : BAR_EIGHTHS;
    eighth < ROLL_TOTAL_EIGHTHS;
    eighth += BAR_EIGHTHS
  ) {
    lines.push(eighth)
  }

  return lines
})()

/*
 * Blocks for the given voices. A tied run of notes becomes one block, the same
 * rule the audio uses (see scheduleFrom in useGraceKellyHarmony), so what is
 * drawn as one block is heard as one tone.
 */
export function buildRollBlocks(
  vozIndices: readonly number[],
  startToneMidi: number,
): RollBlock[] {
  const blocks: RollBlock[] = []

  for (const vozIndex of vozIndices) {
    const notes = VOZ_MELODIES[vozIndex]?.notes
    if (!notes) continue

    let index = 0
    while (index < notes.length) {
      let last = index
      while (notes[last].tie && last + 1 < notes.length) last++

      const startEighth = ROLL_COLUMNS[index].startEighth
      const endEighth = ROLL_COLUMNS[last].startEighth + notes[last].eighthNotes

      blocks.push({
        vozIndex,
        midi: startToneMidi + notes[index].midiOffset,
        startEighth,
        eighths: endEighth - startEighth,
        firstNoteIndex: index,
        lastNoteIndex: last,
        stripeIndex: 0,
        stripeCount: 1,
      })
      index = last + 1
    }
  }

  assignUnisonStripes(blocks)

  return blocks
}

export type RollToneLabel = {
  vozIndex: number
  midi: number
  startEighth: number
}

/*
 * Blocks that get a tone name: a part's first block, and every block where its
 * tone changes. A run of the same tone is named once, so a part that repeats
 * one tone is not buried in labels. When several parts start the same tone at
 * the same moment (a unison), only the first of them is named.
 */
export function buildRollToneLabels(
  blocks: readonly RollBlock[],
): RollToneLabel[] {
  const labels: RollToneLabel[] = []
  const previousMidiByVoz = new Map<number, number>()
  const named = new Set<string>()

  const inOrder = blocks.toSorted(
    (a, b) => a.vozIndex - b.vozIndex || a.startEighth - b.startEighth,
  )

  for (const block of inOrder) {
    const isNewTone = previousMidiByVoz.get(block.vozIndex) !== block.midi
    previousMidiByVoz.set(block.vozIndex, block.midi)
    if (!isNewTone) continue

    const key = `${block.midi}@${block.startEighth}`
    if (named.has(key)) continue

    named.add(key)
    labels.push({
      vozIndex: block.vozIndex,
      midi: block.midi,
      startEighth: block.startEighth,
    })
  }

  return labels
}

/* Blocks on the same pitch that overlap in time split the row between them,
 * ordered by voice index so a voice keeps its place from note to note. */
function assignUnisonStripes(blocks: RollBlock[]) {
  for (const block of blocks) {
    const sharing = blocks
      .filter(
        (other) =>
          other.midi === block.midi &&
          other.startEighth < block.startEighth + block.eighths &&
          block.startEighth < other.startEighth + other.eighths,
      )
      .map((other) => other.vozIndex)
    const voices = [...new Set(sharing)].sort((a, b) => a - b)

    block.stripeCount = voices.length
    block.stripeIndex = voices.indexOf(block.vozIndex)
  }
}

/*
 * Pitch range of the chart: every voice, selected or not, so the axis stays
 * put while parts are toggled on and off.
 */
export function rollMidiRange(startToneMidi: number): {
  midiMin: number
  midiMax: number
} {
  const offsets = VOZ_MELODIES.flatMap((melody) =>
    melody.notes.map((note) => note.midiOffset),
  )

  return {
    midiMin: startToneMidi + Math.min(...offsets) - RANGE_PADDING_SEMITONES,
    midiMax: startToneMidi + Math.max(...offsets) + RANGE_PADDING_SEMITONES,
  }
}

/* x in px of a moment on the time axis, for a plot `width` px wide. */
export function eighthToRollX(eighth: number, width: number): number {
  const usableWidth = Math.max(0, width - ROLL_PADDING_X * 2)

  return ROLL_PADDING_X + (eighth / ROLL_TOTAL_EIGHTHS) * usableWidth
}

/*
 * Palette stop (for voiceTypeColor) of a voice. Voices are listed Melody (0)
 * to Low (5) while the palette runs low to high, so the order flips: Low gets
 * the lowest stop and the colours climb with the ladder.
 */
export function vozColorIndex(vozIndex: number): number {
  return VOZ_MELODIES.length - 1 - vozIndex
}

/*
 * Row for each lyric syllable, given where it starts (x) and how wide it is.
 * A syllable stays on the first row unless it would run into the one before
 * it there; then it drops to the next row that has room. With no room on any
 * row it takes the one that frees up first, so the overlap is the smallest.
 */
export function assignLyricRows(
  syllables: readonly { x: number; width: number }[],
  rowCount: number,
): number[] {
  const rowEnds: number[] = Array.from({ length: rowCount }, () => -Infinity)

  return syllables.map(({ x, width }) => {
    let row = rowEnds.findIndex((end) => end <= x)
    if (row === -1) row = rowEnds.indexOf(Math.min(...rowEnds))

    rowEnds[row] = x + width

    return row
  })
}
