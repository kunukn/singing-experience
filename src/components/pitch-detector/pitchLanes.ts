import type {
  DuetLane,
  DuetLaneDetection,
} from '@/composables/useDuetPitchDetection'

/*
 * The pitch chart's voices. One lane in single-voice mode, two once "Two
 * singers" is on — the same low/high split the piano and guitar boards use, so
 * a singer moving between the three pages meets one convention: orange is the
 * low (or only) voice, blue the high one.
 *
 * Single-voice mode still renders through the lane pipeline, just with a
 * one-element array, so nothing below here needs a second code path.
 */
export type PitchLaneId = 'low' | 'high'

export const PITCH_LANE_IDS: readonly PitchLaneId[] = ['low', 'high']

/* One live-pitch line: where to draw it and what to call it. */
export type PitchPreviewLane = DuetLane & { laneId: PitchLaneId }

/* One voice's recordable frame — what the history buffer samples from. */
export type PitchLaneDetection = DuetLaneDetection & { laneId: PitchLaneId }
