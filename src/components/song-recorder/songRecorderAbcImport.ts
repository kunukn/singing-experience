import type { ClefKey } from '@/components/notes/notesConstants'
import { parseOnly, type AudioTrackNoteItem } from 'abcjs'
import type { NoteEvent } from './noteSegmenter'
import { ALLOWED_BPMS, type Grid } from './songRecorderConstants'

/* Things the import had to simplify; the editor shows each as a translated
 * notice next to a successful import. */
export type AbcImportNotice = 'chords' | 'voices' | 'tempo' | 'rhythm'

export type AbcImportError = 'invalid' | 'meter' | 'empty'

export type AbcImportResult =
  | {
      ok: true
      events: NoteEvent[]
      bpm: number
      clef: ClefKey
      grid: Grid
      notices: AbcImportNotice[]
    }
  | { ok: false; error: AbcImportError; detail?: string }

type ImportOptions = {
  /* Used when the ABC has no Q: tempo. */
  bpm: number
  /* Kept unless the rhythm needs a finer one. */
  grid: Grid
}

/* Floating-point slack when checking whether a time sits on a grid line —
 * abcjs reports triplets as 0.083333…, which must count as off-grid. */
const GRID_EPSILON = 1e-6

function isOnGrid(wholes: number, grid: number): boolean {
  const steps = wholes * grid

  return Math.abs(steps - Math.round(steps)) < GRID_EPSILON
}

/* abcjs warnings are HTML (the offending character is wrapped in a <span>). */
function stripHtml(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function nearestAllowedBpm(bpm: number): number {
  return ALLOWED_BPMS.reduce((best, candidate) =>
    Math.abs(candidate - bpm) < Math.abs(best - bpm) ? candidate : best,
  )
}

/*
 * Reads ABC notation into recorder notes using abcjs, which already resolves
 * key signatures, accidentals and ties into MIDI pitches with start/duration in
 * whole notes. abcjs never throws on bad input — it skips what it can't read
 * and records a warning — so any warning fails the import (strict mode);
 * otherwise plain text like "hello" would import as random notes.
 */
export function parseAbcImport(
  text: string,
  options: ImportOptions,
): AbcImportResult {
  const [tune] = parseOnly(text)
  if (!tune) return { ok: false, error: 'empty' }

  const warning = tune.warnings?.[0]
  if (warning)
    return { ok: false, error: 'invalid', detail: stripHtml(warning) }

  /* A missing or free meter reads as 4/4, which is what the recorder draws. */
  const meter = tune.getMeterFraction()
  if (meter.num !== 4 || meter.den !== 4) return { ok: false, error: 'meter' }

  const notices = new Set<AbcImportNotice>()

  const tracks = tune.setUpAudio({}).tracks
  if (tracks.length > 1) notices.add('voices')

  const trackNotes = (tracks[0] ?? []).filter(
    (item): item is AudioTrackNoteItem => item.cmd === 'note',
  )

  /* One line of melody: a chord keeps its highest note. */
  const byStart = new Map<number, AudioTrackNoteItem>()
  for (const note of trackNotes) {
    const existing = byStart.get(note.start)
    if (existing) notices.add('chords')
    if (!existing || note.pitch > existing.pitch) byStart.set(note.start, note)
  }
  const notes = [...byStart.values()].sort((a, b) => a.start - b.start)
  if (notes.length === 0) return { ok: false, error: 'empty' }

  /* Q: gives beats of any length (Q:1/2=60); the recorder counts quarters. */
  const tempo = tune.metaText.tempo
  const sourceBpm =
    tempo?.bpm && tempo.duration?.[0]
      ? tempo.bpm * tempo.duration[0] * 4
      : options.bpm
  const bpm = nearestAllowedBpm(sourceBpm)
  if (tempo?.bpm && bpm !== Math.round(sourceBpm)) notices.add('tempo')

  /* A pickup (anacrusis) is shorter than a bar; delay everything so it ends
   * on the first bar line, the way it's written. Times are in whole notes. */
  const pickup = tune.getPickupLength()
  const offset = pickup > 0 ? tune.getBarLength() - pickup : 0

  const times = notes.flatMap((note) => [
    note.start + offset,
    note.start + offset + note.duration,
  ])
  let grid = options.grid
  if (!times.every((time) => isOnGrid(time, grid))) grid = 16
  if (!times.every((time) => isOnGrid(time, 16))) notices.add('rhythm')

  /* Whole notes → ms: a whole note is four quarter-note beats. */
  const wholeMs = (4 * 60_000) / bpm
  const events = notes.map((note) => ({
    startMs: (note.start + offset) * wholeMs,
    endMs: (note.start + offset + note.duration) * wholeMs,
    midi: note.pitch,
  }))

  const clefType = tune.lines[0]?.staff?.[0]?.clef?.type
  const clef: ClefKey = clefType === 'bass' ? 'bass' : 'treble'

  return { ok: true, events, bpm, clef, grid, notices: [...notices] }
}
