/*
 * The fretboard span, fixed rather than picked from a voice range: a guitar is
 * a physical instrument with the same notes for every singer, and offering a
 * range selector here would suggest the fretboard changes with it.
 *
 * Standard tuning, six strings, 22 frets — from the open low E string up to the
 * 22nd fret of the high E string.
 */
export const GUITAR_MIDI_MIN = 40 // E2, open 6th string
export const GUITAR_MIDI_MAX = 86 // D6, 22nd fret of the 1st string
