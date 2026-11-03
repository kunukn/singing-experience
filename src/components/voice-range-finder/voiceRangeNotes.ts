import {
  type MidiRange,
  normalizeVoiceRange,
  VOICE_RANGE_HIGHEST_MIDI,
  VOICE_RANGE_LOWEST_MIDI,
  VOICE_RANGE_MIN_SPAN,
} from '@/utils/normalizeVoiceRange'
import { midiToNoteLabel } from '@/utils/noteUtils'

export const formatNote = (midi: number) => midiToNoteLabel(midi).label

export const formatRange = (midiMin: number, midiMax: number) =>
  `${formatNote(midiMin)}–${formatNote(midiMax)}`

/* C6 down to C2, high to low like every pitch list in the app */
export const VOICE_RANGE_NOTE_OPTIONS = Array.from(
  { length: VOICE_RANGE_HIGHEST_MIDI - VOICE_RANGE_LOWEST_MIDI + 1 },
  (_, offset) => {
    const midi = VOICE_RANGE_HIGHEST_MIDI - offset

    return { label: formatNote(midi), value: midi }
  },
)

/*
 * Picking one end pushes the other away when the two get closer than an
 * octave, rather than refusing the pick: someone setting F2 as a goal note
 * wants F2, not a select that silently snaps back.
 */
export function withLowest(range: MidiRange, midi: number): MidiRange {
  return normalizeVoiceRange(
    midi,
    Math.max(range.midiMax, midi + VOICE_RANGE_MIN_SPAN),
  )
}

export function withHighest(range: MidiRange, midi: number): MidiRange {
  return normalizeVoiceRange(
    Math.min(range.midiMin, midi - VOICE_RANGE_MIN_SPAN),
    midi,
  )
}
