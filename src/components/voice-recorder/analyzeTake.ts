import { createNoteSegmenter } from '@/components/song-recorder/noteSegmenter'
import { frequencyToMidi } from '@/utils/noteUtils'
import {
  detectScales,
  MIN_DISTINCT_PITCH_CLASSES,
  type ScaleCandidate,
  type SungNote,
} from '@/utils/scaleDetection'
import { buildScalePitchClasses, pitchClassOf } from '@/utils/scaleHighlight'

import {
  createFrameTracker,
  createPitchTrack,
  frameIndexAt,
  frameTimeMs,
  type PitchTrack,
  type TakeSource,
} from './pitchTrack'
import { findSoundGateDb } from './soundGate'
import { familiarTwins } from './takeKeyScale'
import { buildTakeNotes, type TakeNote } from './takeNotes'
import { buildTakeProfile, type TakeProfile } from './takeProfile'
import { buildTakeRating, type TakeRating } from './takeRating'
import { percentile } from './takeStats'
import {
  estimateOffsetCents,
  estimateTuningCurve,
  foldOctaveGlitches,
} from './takeTuning'

/* Fixed rather than the user's setting, so scores don't change with it. */
const MIN_CLARITY = 0.9
/* Same voice limits as the live detector in usePitchDetection.ts. */
const MIN_PITCH_HZ = 60
const MAX_PITCH_HZ = 1500

/* A sample this close to full scale has probably been cut off by the mic. */
const CLIPPING_LEVEL = 0.99
const CLIPPED_SHARE_WARNING = 0.001
const TOO_QUIET_DB = -45
/* Below this share of clear pitch, with plenty of sound, something else is
 * probably playing: chords and backing tracks defeat single-pitch detection. */
const UNCLEAR_VOICED_SHARE = 0.25
const UNCLEAR_MIN_ACTIVE_MS = 5000

/* A pitch class under this share of note time is a slip, not part of the key.
 * detectScales needs every note to fit, so one stray would leave no match. */
const KEY_MIN_PITCH_CLASS_SHARE = 0.05

/* Hands the page back this often so the progress bar and taps stay live. */
const FRAME_BUDGET_MS = 12
const FRAMES_PER_BATCH = 64

export type TakeQuality = {
  voicedMs: number
  activeMs: number
  isTooQuiet: boolean
  isClipped: boolean
  isUnclear: boolean
}

export type NoteUse = { midi: number; totalMs: number }

export type TakeKey = ScaleCandidate & {
  pitchClasses: ReadonlySet<number>
  familiarTwins: ScaleCandidate[]
}

export type TakeAnalysis = {
  durationMs: number
  track: PitchTrack
  /* Pitch relative to the singer's own tuning, per frame; NaN when unvoiced. */
  tunedMidi: Float32Array
  /* Frames at or above this level count as sound rather than room noise. */
  soundGateDb: number
  notes: TakeNote[]
  tuning: { offsetCents: number; driftCents: number }
  quality: TakeQuality
  /* Highest note first, per the Vertical Ordering rule. */
  notesUsed: NoteUse[]
  key: TakeKey | null
  profile: TakeProfile | null
  rating: TakeRating | null
}

export type AnalyzeOptions = {
  onProgress?: (ratio: number) => void
  signal?: AbortSignal
  /* Auto gain flattens loudness, so the dynamics reading would be meaningless. */
  hasAutoGain?: boolean
}

function yieldToPage(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

async function fillPitchTrack(
  source: TakeSource,
  track: PitchTrack,
  { onProgress, signal }: AnalyzeOptions,
) {
  const trackFrames = createFrameTracker(source, track)
  let batchStartedAt = performance.now()

  for (let from = 0; from < track.frameCount; from += FRAMES_PER_BATCH) {
    signal?.throwIfAborted()

    trackFrames(from, Math.min(from + FRAMES_PER_BATCH, track.frameCount))

    if (performance.now() - batchStartedAt >= FRAME_BUDGET_MS) {
      onProgress?.(from / track.frameCount)
      await yieldToPage()
      batchStartedAt = performance.now()
    }
  }
}

function extractVoicedMidi(track: PitchTrack, soundGateDb: number) {
  const midi = new Float32Array(track.frameCount)

  for (let frame = 0; frame < track.frameCount; frame++) {
    const isVoiced =
      track.rmsDb[frame] >= soundGateDb &&
      track.clarity[frame] >= MIN_CLARITY &&
      track.hz[frame] >= MIN_PITCH_HZ &&
      track.hz[frame] <= MAX_PITCH_HZ

    midi[frame] = isVoiced ? frequencyToMidi(track.hz[frame]) : Number.NaN
  }

  return midi
}

function segmentNotes(
  track: PitchTrack,
  midi: Float32Array,
  offsetAt: (timeMs: number) => number,
) {
  /* Timestamps here are exact, unlike live detection. */
  const segmenter = createNoteSegmenter({
    onsetLatencyMs: 0,
    releaseLatencyMs: 0,
  })
  const tunedMidi = new Float32Array(midi.length)

  for (let frame = 0; frame < midi.length; frame++) {
    const timeMs = frameTimeMs(track, frame)
    const isVoiced = !Number.isNaN(midi[frame])

    tunedMidi[frame] = isVoiced
      ? midi[frame] - offsetAt(timeMs) / 100
      : Number.NaN
    segmenter.push(timeMs, isVoiced ? tunedMidi[frame] : null)
  }

  return {
    tunedMidi,
    notes: buildTakeNotes(segmenter.flush(), tunedMidi, track.hopMs, (timeMs) =>
      frameIndexAt(track, timeMs),
    ),
  }
}

function summariseNotesUsed(notes: TakeNote[]): NoteUse[] {
  const byMidi = new Map<number, NoteUse>()

  for (const note of notes) {
    const use = byMidi.get(note.midi) ?? { midi: note.midi, totalMs: 0 }
    use.totalMs += note.endMs - note.startMs
    byMidi.set(note.midi, use)
  }

  return [...byMidi.values()].toSorted((a, b) => b.midi - a.midi)
}

function detectKey(notes: TakeNote[]): TakeKey | null {
  const timeByPitchClass = new Map<number, number>()
  let totalMs = 0

  for (const note of notes) {
    const pitchClass = pitchClassOf(note.midi)
    const durationMs = note.endMs - note.startMs
    timeByPitchClass.set(
      pitchClass,
      (timeByPitchClass.get(pitchClass) ?? 0) + durationMs,
    )
    totalMs += durationMs
  }

  const sung: SungNote[] = notes
    .filter((note) => {
      const share =
        (timeByPitchClass.get(pitchClassOf(note.midi)) ?? 0) / totalMs

      return share >= KEY_MIN_PITCH_CLASS_SHARE
    })
    .map((note) => ({ midi: note.midi, durationMs: note.endMs - note.startMs }))

  const detection = detectScales(sung)
  const family = detection.families[0]
  if (
    !detection.hasEnoughNotes ||
    detection.sungPitchClasses.size < MIN_DISTINCT_PITCH_CLASSES ||
    !family
  ) {
    return null
  }

  return {
    ...family.candidates[0],
    pitchClasses: family.pitchClasses,
    familiarTwins: familiarTwins(family.candidates),
  }
}

/* Share of note time inside the best-fitting major or natural minor scale. Those
 * share the same note sets, so the 12 major scales cover both. */
export function commonScaleCoverage(notes: TakeNote[]): number {
  let bestMs = 0
  let totalMs = 0
  for (const note of notes) totalMs += note.endMs - note.startMs
  if (totalMs === 0) return 0

  for (let root = 0; root < 12; root++) {
    const scale = buildScalePitchClasses(root, 'ionian')
    let insideMs = 0
    for (const note of notes) {
      if (scale.has(pitchClassOf(note.midi))) {
        insideMs += note.endMs - note.startMs
      }
    }
    bestMs = Math.max(bestMs, insideMs)
  }

  return bestMs / totalMs
}

function countClippedSamples(samples: Float32Array): number {
  let clipped = 0
  for (let i = 0; i < samples.length; i++) {
    if (Math.abs(samples[i]) >= CLIPPING_LEVEL) clipped++
  }

  return clipped
}

/**
 * Reads pitch across a whole take, in time slices so the page stays responsive,
 * then derives notes, key, profile and rating. Everything is relative to the
 * singer's own tuning because a recording has no reference to compare with.
 */
export async function analyzeTake(
  source: TakeSource,
  options: AnalyzeOptions = {},
): Promise<TakeAnalysis> {
  const track = createPitchTrack(source)
  await fillPitchTrack(source, track, options)
  options.signal?.throwIfAborted()

  const durationMs = (source.samples.length / source.sampleRate) * 1000
  const soundGateDb = findSoundGateDb(track.rmsDb)
  const midi = foldOctaveGlitches(extractVoicedMidi(track, soundGateDb))

  /* First pass with one overall tuning, just to find where the notes are. */
  const overallOffset = estimateOffsetCents(midi)
  const firstPass = segmentNotes(track, midi, () => overallOffset)
  const curve = estimateTuningCurve(
    firstPass.notes.map((note) => ({
      startMs: note.startMs,
      endMs: note.endMs,
      /* Back to raw pitch: the curve measures tuning, so it needs it included. */
      centerMidi: note.centerMidi + overallOffset / 100,
    })),
    durationMs,
    overallOffset,
  )

  /* Second pass follows the singer's tuning, so a slow drift can't flip every
   * note across a semitone boundary. */
  const { tunedMidi, notes } = segmentNotes(track, midi, curve.offsetAt)

  let activeFrames = 0
  let voicedFrames = 0
  for (let frame = 0; frame < track.frameCount; frame++) {
    if (track.rmsDb[frame] >= soundGateDb) activeFrames++
    if (!Number.isNaN(tunedMidi[frame])) voicedFrames++
  }

  const activeMs = activeFrames * track.hopMs
  const voicedMs = voicedFrames * track.hopMs
  const key = detectKey(notes)
  const coverage = commonScaleCoverage(notes)

  const quality: TakeQuality = {
    voicedMs,
    activeMs,
    isTooQuiet: percentile(track.rmsDb, 0.95) < TOO_QUIET_DB,
    isClipped:
      countClippedSamples(source.samples) / Math.max(1, source.samples.length) >
      CLIPPED_SHARE_WARNING,
    isUnclear:
      activeMs >= UNCLEAR_MIN_ACTIVE_MS &&
      voicedMs / activeMs < UNCLEAR_VOICED_SHARE,
  }

  const tuning = {
    offsetCents: curve.offsetCents,
    driftCents: curve.driftCents,
  }

  return {
    durationMs,
    track,
    tunedMidi,
    soundGateDb,
    notes,
    tuning,
    quality,
    notesUsed: summariseNotesUsed(notes),
    key,
    profile: buildTakeProfile({
      track,
      tunedMidi,
      soundGateDb,
      notes,
      activeMs,
      voicedMs,
      commonScaleCoverage: coverage,
      hasAutoGain: options.hasAutoGain ?? false,
    }),
    rating: buildTakeRating({
      track,
      notes,
      voicedMs,
      driftCents: curve.driftCents,
      inScaleShare: inScaleShare(notes, key, coverage),
    }),
  }
}

function inScaleShare(
  notes: TakeNote[],
  key: TakeKey | null,
  coverage: number,
): number {
  if (!key) return coverage

  let insideMs = 0
  let totalMs = 0
  for (const note of notes) {
    const durationMs = note.endMs - note.startMs
    totalMs += durationMs
    if (key.pitchClasses.has(pitchClassOf(note.midi))) insideMs += durationMs
  }

  return totalMs > 0 ? insideMs / totalMs : 0
}
