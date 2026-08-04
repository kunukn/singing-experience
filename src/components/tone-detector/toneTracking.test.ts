import { describe, expect, it } from 'vitest'
import { frequencyToNote, noteToFrequency } from '@/utils/noteUtils'
import { updateToneTracks, type ToneTrack } from './toneTracking'

const C4 = noteToFrequency('C', 4)
const E4 = noteToFrequency('E', 4)
const G4 = noteToFrequency('G', 4)

/* 60 fps, matching the requestAnimationFrame loop the detector runs on. */
const FRAME_MS = 1000 / 60

const centsAbove = (baseHz: number, cents: number) =>
  baseHz * Math.pow(2, cents / 1200)

/*
 * Run a sequence of frames through the tracker and name each frame the way
 * useMultiToneDetection does — from the smoothed frequency, with the track's own
 * previous note as the hysteresis reference.
 */
function runFrames(frames: number[][]): {
  labels: string[][]
  tracks: ToneTrack[]
} {
  let tracks: ToneTrack[] = []
  const labels: string[][] = []

  frames.forEach((observed, index) => {
    tracks = updateToneTracks(tracks, observed, index * FRAME_MS)

    const frameLabels: string[] = []
    for (const track of tracks) {
      const info = frequencyToNote(track.smoothedFrequency, track.previousMidi)
      if (!info) continue

      track.previousMidi = info.midiNote
      frameLabels.push(`${info.note}${info.octave}`)
    }
    labels.push(frameLabels)
  })

  return { labels, tracks }
}

/* A vibrato sweep around a centre pitch, at ~5.5 Hz. */
function vibratoFrames(
  centreHz: number,
  depthCents: number,
  frameCount: number,
): number[][] {
  const frames: number[][] = []
  for (let frame = 0; frame < frameCount; frame++) {
    const phase = (2 * Math.PI * 5.5 * frame * FRAME_MS) / 1000
    frames.push([centsAbove(centreHz, depthCents * Math.sin(phase))])
  }

  return frames
}

describe('updateToneTracks', () => {
  it('starts a track at the observed pitch, unsmoothed', () => {
    const tracks = updateToneTracks([], [C4], 0)

    expect(tracks).toHaveLength(1)
    expect(tracks[0].smoothedFrequency).toBeCloseTo(C4, 6)
    expect(tracks[0].firstSeenAt).toBe(0)
    expect(tracks[0].previousMidi).toBeUndefined()
  })

  it('keeps one track when a tone drifts slightly', () => {
    let tracks = updateToneTracks([], [C4], 0)
    tracks = updateToneTracks(tracks, [centsAbove(C4, 30)], FRAME_MS)

    expect(tracks).toHaveLength(1)
    expect(tracks[0].firstSeenAt).toBe(0)
  })

  it('starts a new track when a tone jumps beyond the match window', () => {
    let tracks = updateToneTracks([], [C4], 0)
    /* A major third away is far outside the 120 cent window. */
    tracks = updateToneTracks(tracks, [E4], FRAME_MS)

    expect(tracks).toHaveLength(2)
  })

  it('retains an unheard track so the caller can apply its own release window', () => {
    let tracks = updateToneTracks([], [C4], 0)
    tracks = updateToneTracks(tracks, [], FRAME_MS)

    expect(tracks).toHaveLength(1)
    expect(tracks[0].lastSeenAt).toBe(0)
  })

  it('carries the previous note forward across frames', () => {
    let tracks = updateToneTracks([], [C4], 0)
    tracks[0].previousMidi = 60
    tracks = updateToneTracks(tracks, [C4], FRAME_MS)

    expect(tracks[0].previousMidi).toBe(60)
  })

  it('keeps separate chord voices on separate tracks', () => {
    const { tracks } = runFrames(Array.from({ length: 10 }, () => [C4, E4, G4]))

    expect(tracks).toHaveLength(3)
  })
})

describe('vibrato stability', () => {
  /*
   * The measured failure this module exists for. Naming each frame from the raw
   * instantaneous pitch, a ±60 cent vibrato reported C4 73% of frames, C♯4 15%
   * and B3 13% — one sustained note flickering across three cards.
   */
  const settledLabels = (frames: number[][]) => {
    const { labels } = runFrames(frames)

    /* Skip the first 15 frames — the EMA is still converging from its seed. */
    return new Set(labels.slice(15).flat())
  }

  it('holds one note through a ±60 cent vibrato', () => {
    expect([...settledLabels(vibratoFrames(C4, 60, 60))]).toEqual(['C4'])
  })

  it('holds one note through a ±100 cent vibrato', () => {
    /* Deep operatic vibrato; the raw instantaneous pitch spends a third of its
     * time inside each neighbouring semitone. */
    expect([...settledLabels(vibratoFrames(C4, 100, 60))]).toEqual(['C4'])
  })

  it('holds every voice of a chord sung with vibrato', () => {
    const frames: number[][] = []
    for (let frame = 0; frame < 60; frame++) {
      const phase = (2 * Math.PI * 5.5 * frame * FRAME_MS) / 1000
      const offset = 60 * Math.sin(phase)
      frames.push([
        centsAbove(C4, offset),
        centsAbove(E4, offset),
        centsAbove(G4, offset),
      ])
    }

    expect([...settledLabels(frames)].sort()).toEqual(['C4', 'E4', 'G4'])
  })

  it('still follows a deliberate note change', () => {
    /* Smoothing must not be so heavy that a real melody lags behind. Half a
     * second on the new note is far longer than the EMA needs to settle. */
    const frames = [
      ...Array.from({ length: 30 }, () => [C4]),
      ...Array.from({ length: 30 }, () => [E4]),
    ]
    const { labels } = runFrames(frames)

    expect(labels[29]).toEqual(['C4'])
    expect(labels[labels.length - 1]).toContain('E4')
  })
})
