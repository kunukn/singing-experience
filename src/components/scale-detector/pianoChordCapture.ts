import type { NoteEvent } from '@/components/song-recorder/noteSegmenter'

type PianoChordCaptureOptions = {
  /* A released note lasts at least this long, so a quick tap still carries
   * weight. */
  minNoteMs: number
}

/*
 * Turns piano key presses and releases into NoteEvents, any number of keys
 * at once — a chord played as a chord counts every key. Unlike Song
 * Recorder's monophonic pianoNoteCapture, a new press never ends a held one.
 */
export function createPianoChordCapture({
  minNoteMs,
}: PianoChordCaptureOptions) {
  const events: NoteEvent[] = []
  /* midi → startMs of each key still held down. */
  const held = new Map<number, number>()

  function close(midi: number, timeMs: number) {
    const startMs = held.get(midi)
    if (startMs === undefined) return

    events.push({ startMs, endMs: Math.max(timeMs, startMs + minNoteMs), midi })
    held.delete(midi)
  }

  function press(midi: number, timeMs: number) {
    /* Key repeat or a second input for the same key: keep the first start. */
    if (held.has(midi)) return

    held.set(midi, Math.max(0, timeMs))
  }

  /* Returns true when `events` changed. */
  function release(midi: number, timeMs: number): boolean {
    if (!held.has(midi)) return false

    close(midi, timeMs)

    return true
  }

  /* Ends every held note when listening stops. */
  function flush(timeMs: number) {
    for (const midi of held.keys()) close(midi, timeMs)
  }

  /* Finished notes plus the keys still down, each counted at its minimum
   * length so a held chord shows before it is let go. */
  function snapshot(): NoteEvent[] {
    return [
      ...events,
      ...[...held].map(([midi, startMs]) => ({
        startMs,
        endMs: startMs + minNoteMs,
        midi,
      })),
    ]
  }

  function isAnyHeld(): boolean {
    return held.size > 0
  }

  return { press, release, flush, snapshot, isAnyHeld }
}
