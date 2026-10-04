import { midiToAbcToken } from '@/components/notes/notesAbc'
import type { ClefKey } from '@/components/notes/notesConstants'
import { unitsPerBar, type QuantizedNote } from './quantizeNotes'

/* One drawn notehead or rest, in reading order. A recorded note that crosses a
 * bar line or has an unwritable length (5 eighths) is drawn as several tied
 * heads, so this list is what maps playback time to a sheet element. */
export type SheetPiece = {
  /* Index into the QuantizedNote list this piece belongs to. */
  noteIndex: number
  startUnit: number
  units: number
  isRest: boolean
}

export type RecordingAbcOptions = {
  bpm: number
  grid: number
  beatsPerBar: number
  clef: ClefKey
}

/* Lengths (in grid steps) a single head can show: plain values from one step
 * up to a whole note, plus their dotted forms (×1.5). At grid 8 that's
 * 8, 6, 4, 3, 2, 1 — whole, dotted half, half, dotted quarter, quarter, eighth. */
export function writableLengths(grid: number): number[] {
  const lengths = new Set<number>()
  for (let length = 1; length <= grid; length *= 2) {
    lengths.add(length)
    const dotted = length * 1.5
    if (Number.isInteger(dotted) && dotted <= grid) lengths.add(dotted)
  }

  return [...lengths].sort((a, b) => b - a)
}

/* Breaks a run of grid steps into writable lengths, longest first (5 → 4 + 1). */
function splitIntoWritable(units: number, lengths: number[]): number[] {
  const parts: number[] = []
  let remaining = units
  while (remaining > 0) {
    const part = lengths.find((length) => length <= remaining) ?? 1
    parts.push(part)
    remaining -= part
  }

  return parts
}

/* Treble when the melody's median pitch is middle C or above, else bass. */
export function chooseClef(midis: readonly number[]): ClefKey {
  if (midis.length === 0) return 'treble'

  const sorted = [...midis].sort((a, b) => a - b)
  const MIDDLE_C = 60

  return sorted[Math.floor(sorted.length / 2)] >= MIDDLE_C ? 'treble' : 'bass'
}

/*
 * Builds an ABC tune from quantized notes: L:1/<grid> so a grid step is the
 * unit length, notes split at bar lines and into writable lengths (tied with
 * "-"), rests as "z". Short notes in the same beat are beamed (written without
 * a space). Returns the ABC text plus one SheetPiece per drawn head/rest.
 */
export function buildRecordingAbc(
  notes: readonly QuantizedNote[],
  options: RecordingAbcOptions,
): { abc: string; pieces: SheetPiece[] } {
  const { bpm, grid, beatsPerBar, clef } = options
  const barUnits = unitsPerBar(grid, beatsPerBar)
  const beatUnits = grid / 4
  const lengths = writableLengths(grid)

  const pieces: SheetPiece[] = []
  const bars: string[] = []
  let bar = ''
  let barIndex = -1
  let previousBeamBeat: number | null = null
  /* ABC accidentals last until the bar line, so a natural after a sharp of the
   * same letter in one bar must be written with "=". Holds sharpened pitches
   * (by their natural token) in the current bar. */
  let sharpened = new Set<string>()

  /* Input is contiguous (quantizeNotes fills every gap with a rest), so the
   * bar index only ever advances by one. */
  function startBarIfNeeded(unit: number) {
    const index = Math.floor(unit / barUnits)
    if (index === barIndex) return

    if (barIndex >= 0) bars.push(bar.trim())
    bar = ''
    barIndex = index
    previousBeamBeat = null
    sharpened = new Set()
  }

  function pitchToken(midi: number): string {
    const token = midiToAbcToken(midi)
    if (token.startsWith('^')) {
      sharpened.add(token.slice(1))

      return token
    }

    if (sharpened.has(token)) {
      sharpened.delete(token)

      return `=${token}`
    }

    return token
  }

  notes.forEach((note, noteIndex) => {
    let unit = note.startUnit
    let remaining = note.units

    while (remaining > 0) {
      startBarIfNeeded(unit)
      const barEnd = (barIndex + 1) * barUnits
      const inBar = Math.min(remaining, barEnd - unit)

      for (const part of splitIntoWritable(inBar, lengths)) {
        const isLastPiece = part === remaining
        const isRest = note.midi === null
        /* Shorter than a beat → drawn with a flag, which beams to a neighbour
         * in the same beat when written without a space. */
        const beat = Math.floor((unit % barUnits) / beatUnits)
        const isBeamable = !isRest && part < beatUnits
        const joinsBeam = isBeamable && previousBeamBeat === beat
        const length = part === 1 ? '' : String(part)

        const token = isRest
          ? `z${length}`
          : `${pitchToken(note.midi as number)}${length}${isLastPiece ? '' : '-'}`

        bar += (joinsBeam ? '' : ' ') + token
        previousBeamBeat = isBeamable ? beat : null
        pieces.push({ noteIndex, startUnit: unit, units: part, isRest })

        unit += part
        remaining -= part
      }
    }
  })

  if (barIndex >= 0) bars.push(bar.trim())

  const header = [
    'X:1',
    `M:${beatsPerBar}/4`,
    `L:1/${grid}`,
    `Q:1/4=${bpm}`,
    `K:C clef=${clef}`,
  ]
  const body = bars.length > 0 ? `${bars.join(' | ')} |]` : `z${barUnits} |]`

  return { abc: [...header, body].join('\n'), pieces }
}
