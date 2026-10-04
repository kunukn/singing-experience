import {
  MIN_GAP_MS,
  MIN_NOTE_MS,
  ONSET_LATENCY_MS,
  PITCH_CHANGE_HOLD_MS,
  PITCH_TRIM_HEAD,
  PITCH_TRIM_TAIL,
  RELEASE_LATENCY_MS,
} from './songRecorderConstants'

/* One played or sung note in recording time (ms from beat 1 of bar 1). This is
 * the input seam: the voice segmenter produces these from pitch frames, and a
 * future keyboard / MIDI input can produce them directly. */
export type NoteEvent = {
  startMs: number
  endMs: number
  midi: number
}

type Frame = { timeMs: number; midi: number }

/* Times here are detection times; latency is only subtracted on emit. */
type OpenNote = {
  startMs: number
  /* Onset latency after silence, release latency after a pitch change. */
  startLatencyMs: number
  frames: Frame[]
  semitone: number
  lastVoicedMs: number
}

/* A different semitone seen inside the open note, waiting to prove it's held. */
type PendingChange = { semitone: number; sinceMs: number; frameIndex: number }

/* Median of the frames' fractional MIDI after trimming the scoop at the start
 * and the fall-off at the end, rounded to the nearest semitone — so a note
 * sung slightly off still maps to the closest clean tone. */
function notePitch(frames: Frame[], startMs: number, endMs: number): number {
  const span = endMs - startMs
  const from = startMs + span * PITCH_TRIM_HEAD
  const to = endMs - span * PITCH_TRIM_TAIL
  const core = frames.filter(
    (frame) => frame.timeMs >= from && frame.timeMs <= to,
  )
  const values = (core.length > 0 ? core : frames)
    .map((frame) => frame.midi)
    .sort((a, b) => a - b)
  const middle = Math.floor(values.length / 2)
  const median =
    values.length % 2 === 0
      ? (values[middle - 1] + values[middle]) / 2
      : values[middle]

  return Math.round(median)
}

/*
 * Turns a stream of per-frame pitch readings into discrete notes. Feed it one
 * reading per animation frame: fractional MIDI while a clean pitch is heard,
 * null for silence. A note closes when silence lasts MIN_GAP_MS or a new
 * semitone holds PITCH_CHANGE_HOLD_MS. Notes are only emitted once closed, so
 * the sheet trails the singer slightly — accuracy over immediacy.
 */
export function createNoteSegmenter() {
  const events: NoteEvent[] = []
  let open: OpenNote | null = null
  let pending: PendingChange | null = null
  let silenceSinceMs: number | null = null

  function emit(note: OpenNote, frames: Frame[], endMs: number) {
    if (endMs - note.startMs < MIN_NOTE_MS || frames.length === 0) return

    events.push({
      startMs: note.startMs - note.startLatencyMs,
      endMs: endMs - RELEASE_LATENCY_MS,
      midi: notePitch(frames, note.startMs, endMs),
    })
  }

  function openAt(
    timeMs: number,
    frames: Frame[],
    semitone: number,
    startLatencyMs: number,
  ) {
    open = {
      startMs: timeMs,
      startLatencyMs,
      frames,
      semitone,
      lastVoicedMs: frames[frames.length - 1]?.timeMs ?? timeMs,
    }
    pending = null
    silenceSinceMs = null
  }

  function closeOpen() {
    if (open) emit(open, open.frames, open.lastVoicedMs)

    open = null
    pending = null
    silenceSinceMs = null
  }

  function push(timeMs: number, midi: number | null) {
    if (midi === null) {
      if (!open) return

      silenceSinceMs ??= timeMs
      if (timeMs - silenceSinceMs >= MIN_GAP_MS) closeOpen()

      return
    }

    const semitone = Math.round(midi)
    const frame = { timeMs, midi }

    if (!open) {
      openAt(timeMs, [frame], semitone, ONSET_LATENCY_MS)

      return
    }

    /* Voice back after a short dropout: same pitch bridges the gap, a new
     * pitch starts a new note at the gap. */
    if (silenceSinceMs !== null) {
      silenceSinceMs = null
      if (semitone !== open.semitone) {
        closeOpen()
        openAt(timeMs, [frame], semitone, ONSET_LATENCY_MS)

        return
      }
    }

    open.frames.push(frame)
    open.lastVoicedMs = timeMs

    if (semitone === open.semitone) {
      pending = null

      return
    }

    if (!pending || pending.semitone !== semitone) {
      pending = {
        semitone,
        sinceMs: timeMs,
        frameIndex: open.frames.length - 1,
      }

      return
    }

    if (timeMs - pending.sinceMs < PITCH_CHANGE_HOLD_MS) return

    /* The new semitone held. If what came before is too short to be a note
     * (a scoop into the pitch), relabel the open note instead of splitting. */
    if (pending.sinceMs - open.startMs < MIN_NOTE_MS) {
      open.semitone = semitone
      pending = null

      return
    }

    const before = open.frames.slice(0, pending.frameIndex)
    const after = open.frames.slice(pending.frameIndex)
    emit(open, before, pending.sinceMs)
    openAt(pending.sinceMs, after, semitone, RELEASE_LATENCY_MS)
  }

  /* Closes any note still sounding (recording stopped) and returns all notes. */
  function flush(): NoteEvent[] {
    closeOpen()

    return events
  }

  return { events, push, flush }
}
