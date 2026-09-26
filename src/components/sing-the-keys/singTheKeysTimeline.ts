import { isNaturalMidi } from '@/components/notes/notesScales'
import type { Song } from './singTheKeysSongs'

/* How long a block takes to fall from the top of the lane to the hit line, and
 * therefore how far ahead the singer sees. Also the lead-in before note 0. */
export const LOOKAHEAD_MS = 3000

export type TimelineNote = {
  /* Index into the song's `notes` — the score composable keys on it. */
  index: number
  /* Sounding MIDI note (tonic + offset). */
  midi: number
  /* Ms from the song's start at which the note begins. */
  startMs: number
  durationMs: number
}

export type Timeline = {
  notes: TimelineNote[]
  /* End of the last note (its trailing rest included). */
  totalMs: number
  /* One quarter-note beat at the chosen speed. */
  beatMs: number
}

/* Lays the song out in ms at a tonic and speed. Rests advance the cursor
 * without adding a note, so `index` stays aligned with the song data. */
export function buildTimeline(
  song: Song,
  tonicMidi: number,
  speed: number,
): Timeline {
  const beatMs = 60000 / (song.bpm * speed)
  const notes: TimelineNote[] = []
  let cursorMs = 0

  song.notes.forEach((note, index) => {
    const durationMs = note.beats * beatMs
    notes.push({
      index,
      midi: tonicMidi + note.midiOffset,
      startMs: cursorMs,
      durationMs,
    })
    cursorMs += durationMs + (note.restAfterBeats ?? 0) * beatMs
  })

  return { notes, totalMs: cursorMs, beatMs }
}

/* The note sounding at `elapsedMs`: start inclusive, end exclusive. Null
 * before the song, inside a rest, and after the last note. */
export function activeNoteIndexAt(
  notes: TimelineNote[],
  elapsedMs: number,
): number | null {
  if (elapsedMs < 0) return null

  for (const note of notes) {
    if (elapsedMs < note.startMs) return null
    if (elapsedMs < note.startMs + note.durationMs) return note.index
  }

  return null
}

/* Keyboard span for a transposed song: one semitone of margin on each side so
 * the end notes have a neighbouring hint line, then widened outward to a
 * natural note so the keyboard starts and ends on a white key. */
export function songMidiRange(
  song: Song,
  tonicMidi: number,
): { midiMin: number; midiMax: number } {
  const offsets = song.notes.map((note) => note.midiOffset)
  let midiMin = tonicMidi + Math.min(...offsets) - 1
  let midiMax = tonicMidi + Math.max(...offsets) + 1

  while (!isNaturalMidi(midiMin)) midiMin--
  while (!isNaturalMidi(midiMax)) midiMax++

  return { midiMin, midiMax }
}
