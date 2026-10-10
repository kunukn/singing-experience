import type { NoteEvent } from './noteSegmenter'

type PianoNoteCaptureOptions = {
  /* A released note lasts at least this long, so a quick tap survives
   * quantizing instead of rounding away to nothing. */
  minNoteMs: number
  /* How far before beat 1 a press still counts (it starts at 0). */
  earlyPressToleranceMs?: number
}

type HeldNote = { midi: number; startMs: number }

/*
 * Turns piano key presses and releases (ms from beat 1 of bar 1) into
 * NoteEvents. The sheet is monophonic, so one note is held at a time: a new
 * press ends the held note, and releasing any other key is ignored.
 */
export function createPianoNoteCapture(options: PianoNoteCaptureOptions) {
  const { minNoteMs, earlyPressToleranceMs = 0 } = options
  const events: NoteEvent[] = []
  let held: HeldNote | null = null

  function close(endMs: number) {
    if (!held) return

    /* Two keys pressed in the same instant: the newer one wins. */
    if (endMs > held.startMs) {
      events.push({ startMs: held.startMs, endMs, midi: held.midi })
    }
    held = null
  }

  /* A tap stretched to minNoteMs can overlap the next press — cut it back. */
  function trimLastTo(startMs: number) {
    const last = events.at(-1)
    if (!last || last.endMs <= startMs) return

    if (startMs <= last.startMs) events.pop()
    else last.endMs = startMs
  }

  /* Returns true when `events` changed. */
  function press(midi: number, timeMs: number): boolean {
    if (timeMs < -earlyPressToleranceMs) return false

    const startMs = Math.max(0, timeMs)
    const countBefore = events.length
    const lastEndBefore = events.at(-1)?.endMs
    close(startMs)
    trimLastTo(startMs)
    held = { midi, startMs }

    return (
      events.length !== countBefore || events.at(-1)?.endMs !== lastEndBefore
    )
  }

  /* Returns true when `events` changed. */
  function release(midi: number, timeMs: number): boolean {
    if (!held || held.midi !== midi) return false

    close(Math.max(timeMs, held.startMs + minNoteMs))

    return true
  }

  /* Ends the held note when the take stops. */
  function flush(timeMs: number): NoteEvent[] {
    if (held) close(Math.max(timeMs, held.startMs + minNoteMs))

    return events
  }

  function heldMidi(): number | null {
    return held?.midi ?? null
  }

  function heldNote(): HeldNote | null {
    return held ? { ...held } : null
  }

  return {
    events: events as readonly NoteEvent[],
    press,
    release,
    flush,
    heldMidi,
    heldNote,
  }
}
