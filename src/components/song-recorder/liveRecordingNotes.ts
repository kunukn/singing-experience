import type { QuantizedNote } from './quantizeNotes'
import type { SheetPiece } from './songRecorderAbc'

/* captured: already on the sheet (closed notes, silence that has passed).
 * ghost: the note still sounding, drawn up to the current slot.
 * template: an empty slot ahead of the singer. */
export type LiveNoteKind = 'captured' | 'ghost' | 'template'

export type LiveNote = QuantizedNote & { kind: LiveNoteKind }

/* The note being sung or held right now, in recording time. */
export type OpenNote = { startMs: number; midi: number }

type LiveRecordingInput = {
  /* Closed notes, quantized without padding the last bar. */
  captured: readonly QuantizedNote[]
  openNote: OpenNote | null
  /* Grid step the playhead is in; negative during the count-in. */
  nowUnit: number
  unitMs: number
  barUnits: number
  /* Length of the whole take in grid steps — the template never goes past it. */
  totalUnits: number
}

/* Bars of template from the playhead's bar onwards: this one and the next. */
const LOOKAHEAD_BARS = 2

/*
 * The sheet shown while recording: captured notes, then the open note as a
 * ghost growing up to the current slot, then one template rest per grid slot
 * to the end of the next bar. One rest per slot gives every slot its own drawn
 * element, so the playhead can light it up.
 */
export function buildLiveRecordingNotes(input: LiveRecordingInput): LiveNote[] {
  const { captured, openNote, nowUnit, unitMs, barUnits, totalUnits } = input
  const notes: LiveNote[] = captured.map((note) => ({
    ...note,
    kind: 'captured',
  }))
  const last = captured.at(-1)
  let cursor = last ? last.startUnit + last.units : 0

  function pushRestUntil(unit: number) {
    if (unit <= cursor) return

    notes.push({
      midi: null,
      startUnit: cursor,
      units: unit - cursor,
      kind: 'captured',
    })
    cursor = unit
  }

  if (openNote) {
    const start = Math.max(cursor, Math.round(openNote.startMs / unitMs))
    const end = Math.max(start + 1, nowUnit + 1)
    pushRestUntil(start)
    notes.push({
      midi: openNote.midi,
      startUnit: start,
      units: end - start,
      kind: 'ghost',
    })
    cursor = end
  }

  pushRestUntil(nowUnit)

  const playheadBar = Math.floor(Math.max(nowUnit, 0) / barUnits)
  const templateEnd = Math.min(
    totalUnits,
    Math.max(
      (playheadBar + LOOKAHEAD_BARS) * barUnits,
      /* A note rounded past the lookahead still gets a full bar. */
      Math.ceil(cursor / barUnits) * barUnits,
    ),
  )

  for (let unit = cursor; unit < templateEnd; unit++) {
    notes.push({ midi: null, startUnit: unit, units: 1, kind: 'template' })
  }

  return notes
}

/* Index of the drawn piece covering a grid step, or null. */
export function findPieceAtUnit(
  pieces: readonly SheetPiece[],
  unit: number,
): number | null {
  if (unit < 0) return null

  const index = pieces.findIndex(
    (piece) => piece.startUnit <= unit && unit < piece.startUnit + piece.units,
  )

  return index === -1 ? null : index
}
