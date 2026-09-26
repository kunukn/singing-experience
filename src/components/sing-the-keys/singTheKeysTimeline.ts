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

/* ms — how long the hit line glows after a beat line crosses it. Well under
 * the shortest pulse (480ms at 1.25×), and the pulse itself stays under 3 Hz,
 * the photosensitivity flash limit. */
export const BEAT_FLASH_MS = 180

/* One felt pulse in the lane, falling with the blocks. */
export type BeatLine = {
  /* Ms from the song's start; negative for the lead-in count-in lines. */
  ms: number
  /* Position in the bar, 0 = downbeat. */
  pulseInBar: number
  isBarStart: boolean
}

/* Where the song is inside the current pulse. */
export type BeatPulse = {
  pulseInBar: number
  isBarStart: boolean
  /* Ms since the latest line crossed the hit line. */
  sinceMs: number
  /* 0 on the line, rising to 1 as the next line arrives; 1 after the last. */
  progress: number
}

export type BeatFlash = {
  /* 1 as the line crosses the hit line, fading to 0 over BEAT_FLASH_MS. */
  intensity: number
  isBarStart: boolean
}

export type Timeline = {
  notes: TimelineNote[]
  /* End of the last note (its trailing rest included). */
  totalMs: number
  /* One quarter-note beat at the chosen speed. */
  beatMs: number
  beatLines: BeatLine[]
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

  return {
    notes,
    totalMs: cursorMs,
    beatMs,
    beatLines: buildBeatLines(song, beatMs, cursorMs),
  }
}

/* One line per pulse from the start of the lead-in to the end of the song,
 * counted from the first downbeat so bar lines land on "1" even after a
 * pickup. Lines before the first note fall during the lead-in as a silent
 * visual count-in. */
function buildBeatLines(
  song: Song,
  beatMs: number,
  totalMs: number,
): BeatLine[] {
  const { pulseBeats, pulsesPerBar, pickupBeats } = song.meter
  const pulseMs = pulseBeats * beatMs
  const downbeatMs = pickupBeats * beatMs
  const firstPulse = Math.ceil((-LOOKAHEAD_MS - downbeatMs) / pulseMs)
  const lastPulse = Math.floor((totalMs - downbeatMs) / pulseMs)
  const lines: BeatLine[] = []

  for (let pulse = firstPulse; pulse <= lastPulse; pulse++) {
    /* Positive modulo: pulses before the first downbeat are negative. */
    const pulseInBar = ((pulse % pulsesPerBar) + pulsesPerBar) % pulsesPerBar
    lines.push({
      ms: downbeatMs + pulse * pulseMs,
      pulseInBar,
      isBarStart: pulseInBar === 0,
    })
  }

  return lines
}

/* The pulse the song is in: the latest line to cross the hit line and how far
 * along it is towards the next. Null before the first line. */
export function beatPulseAt(
  lines: BeatLine[],
  elapsedMs: number,
): BeatPulse | null {
  const index = lines.findLastIndex((candidate) => candidate.ms <= elapsedMs)
  if (index === -1) return null

  const line = lines[index]
  const next = lines[index + 1]
  const sinceMs = elapsedMs - line.ms
  const progress = next ? Math.min(1, sinceMs / (next.ms - line.ms)) : 1

  return {
    pulseInBar: line.pulseInBar,
    isBarStart: line.isBarStart,
    sinceMs,
    progress,
  }
}

/* The glow from the beat line that most recently crossed the hit line; null
 * once it has faded or before the first line. */
export function beatFlashAt(
  lines: BeatLine[],
  elapsedMs: number,
): BeatFlash | null {
  const pulse = beatPulseAt(lines, elapsedMs)
  if (!pulse) return null

  const intensity = 1 - pulse.sinceMs / BEAT_FLASH_MS
  if (intensity <= 0) return null

  return { intensity, isBarStart: pulse.isBarStart }
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

/* ms — how long the lane takes to ease back up to the ending view once the
 * last sound has stopped: long enough to read as a glide rather than a jump,
 * short enough not to hold up Play again. */
export const ENDING_GLIDE_MS = 600

type EndingPath = {
  /* When the last sound stops: the blocks fall with the clock until here. */
  fallEndMs: number
  /* Where the lane settles, showing the song's last stretch. */
  endingViewMs: number
}

/* Lane position after a natural finish, from the clock alone: it keeps
 * falling until the sound stops, then glides back to the ending view with a
 * cubic ease-out (fast start, soft landing). */
export function endingLaneMsAt(
  nowMs: number,
  { fallEndMs, endingViewMs }: EndingPath,
): { laneMs: number; isSettled: boolean } {
  if (nowMs < fallEndMs) return { laneMs: nowMs, isSettled: false }

  const progress = Math.min(1, (nowMs - fallEndMs) / ENDING_GLIDE_MS)
  const eased = 1 - (1 - progress) ** 3

  return {
    laneMs: fallEndMs + (endingViewMs - fallEndMs) * eased,
    isSettled: progress === 1,
  }
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
