import { describe, expect, it } from 'vitest'
import { midiToFrequency, midiToNoteLabel } from '@/utils/noteUtils'
import type { NoteInfo } from '@/utils/noteUtils'
import { HISTORY_RETENTION_MS, PAUSE_GAP_MS } from './pitchConstants'
import { createPitchLaneRecorder, pitchLaneExtent } from './pitchLaneRecorder'

/* A clean detection frame at an exact semitone, the shape usePitchDetection
 * and useDuetPitchDetection both hand over. */
function noteAt(midi: number, cents = 0): NoteInfo {
  const info = midiToNoteLabel(midi)

  return {
    note: info.note,
    octave: info.octave,
    cents,
    midiNote: midi,
    /* Cents baked into the frequency, since that is what the recorder derives
     * its fractional MIDI from. 100 cents = one semitone. */
    frequency: midiToFrequency(midi + cents / 100),
  }
}

/* Long enough for the first sustained marker to land at the default threshold. */
const SUSTAIN_MS = 200

describe('createPitchLaneRecorder', () => {
  it('records one sample per pushed frame', () => {
    const lane = createPitchLaneRecorder()

    lane.push(noteAt(60), 1000)
    lane.push(noteAt(60), 1050)

    expect(lane.samples).toHaveLength(2)
    expect(lane.samples[0].timestamp).toBe(1000)
    expect(lane.samples[0].isClean).toBe(true)
  })

  it('stores fractional midi so the spline does not staircase', () => {
    const lane = createPitchLaneRecorder()

    lane.push(noteAt(60, 50), 1000)

    /* Half a semitone sharp of C4 — the buffer must keep the 0.5, not round. */
    expect(lane.samples[0].midiNote).toBeCloseTo(60.5, 3)
    expect(lane.samples[0].cents).toBe(50)
  })

  it('places a labelled marker once a note is held past the threshold', () => {
    const lane = createPitchLaneRecorder()

    lane.push(noteAt(60), 1000)
    expect(lane.noteMarkers).toHaveLength(0)

    lane.push(noteAt(60), 1000 + SUSTAIN_MS)

    expect(lane.noteMarkers).toHaveLength(1)
    expect(lane.noteMarkers[0].midiNote).toBe(60)
    expect(lane.noteMarkers[0].showLabel).toBe(true)
  })

  it('draws repeat markers on a held note without repeating the label', () => {
    const lane = createPitchLaneRecorder()

    lane.push(noteAt(60), 0)
    lane.push(noteAt(60), SUSTAIN_MS)
    lane.push(noteAt(60), SUSTAIN_MS * 2)

    expect(lane.noteMarkers).toHaveLength(2)
    expect(lane.noteMarkers[0].showLabel).toBe(true)
    expect(lane.noteMarkers[1].showLabel).toBe(false)
  })

  it('uses the shorter threshold after a quick transition', () => {
    const lane = createPitchLaneRecorder()

    /* A passing note, abandoned well before SUSTAINED_THRESHOLD_MS. */
    lane.push(noteAt(60), 0)
    lane.push(noteAt(62), 50)

    /* 150 ms of the new note is enough because the previous one was passing;
     * a standing start would still need 200 ms. */
    lane.push(noteAt(62), 50 + 150)

    expect(lane.noteMarkers).toHaveLength(1)
    expect(lane.noteMarkers[0].midiNote).toBe(62)
  })

  it('restarts the sustain window after a singing pause', () => {
    const lane = createPitchLaneRecorder()

    lane.push(noteAt(60), 0)
    lane.push(noteAt(60), SUSTAIN_MS)
    expect(lane.noteMarkers).toHaveLength(1)

    /* Same note, but after a gap — it is a new phrase, so the next marker has
     * to earn its own sustain rather than continuing the previous run. */
    const afterPause = SUSTAIN_MS + PAUSE_GAP_MS + 1
    lane.push(noteAt(60), afterPause)
    expect(lane.noteMarkers).toHaveLength(1)

    lane.push(noteAt(60), afterPause + SUSTAIN_MS)
    expect(lane.noteMarkers).toHaveLength(2)
  })

  it('prunes samples and markers past the retention window', () => {
    const lane = createPitchLaneRecorder()

    lane.push(noteAt(60), 0)
    lane.push(noteAt(60), SUSTAIN_MS)
    expect(lane.samples).toHaveLength(2)
    expect(lane.noteMarkers).toHaveLength(1)

    /* Far enough ahead that the cutoff (now - retention) passes both earlier
     * frames, so only the newest one is left. */
    const wellPastRetention = HISTORY_RETENTION_MS + SUSTAIN_MS * 2
    lane.push(noteAt(60), wellPastRetention)

    expect(lane.samples).toHaveLength(1)
    expect(lane.samples[0].timestamp).toBe(wellPastRetention)
    expect(lane.noteMarkers).toHaveLength(0)
  })

  it('clears every buffer and the sustain state on reset', () => {
    const lane = createPitchLaneRecorder()

    lane.push(noteAt(60), 0)
    lane.push(noteAt(60), SUSTAIN_MS)
    lane.reset()

    expect(lane.samples).toHaveLength(0)
    expect(lane.noteMarkers).toHaveLength(0)

    /* The sustain window restarted too, so one frame cannot revive a marker. */
    lane.push(noteAt(60), SUSTAIN_MS * 2)
    expect(lane.noteMarkers).toHaveLength(0)
  })
})

describe('pitchLaneExtent', () => {
  it('spans the union of both lanes', () => {
    const low = createPitchLaneRecorder()
    const high = createPitchLaneRecorder()

    low.push(noteAt(48), 100)
    low.push(noteAt(48), 400)
    high.push(noteAt(72), 250)
    high.push(noteAt(72), 900)

    expect(pitchLaneExtent([low, high])).toEqual({
      firstTimestamp: 100,
      lastTimestamp: 900,
    })
  })

  it('ignores lanes that recorded nothing', () => {
    const low = createPitchLaneRecorder()
    const high = createPitchLaneRecorder()

    low.push(noteAt(48), 100)
    low.push(noteAt(48), 400)

    expect(pitchLaneExtent([low, high])).toEqual({
      firstTimestamp: 100,
      lastTimestamp: 400,
    })
  })

  it('returns null when nothing was recorded', () => {
    expect(
      pitchLaneExtent([createPitchLaneRecorder(), createPitchLaneRecorder()]),
    ).toBeNull()
  })
})
