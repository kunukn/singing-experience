import { setup } from 'xstate'

export type SongRecorderPhase =
  | 'idle'
  | 'countIn'
  | 'recording'
  | { review: 'stopped' | 'playing' | 'paused' }

type SongRecorderEvent =
  | { type: 'RECORD' }
  | { type: 'COUNT_IN_DONE' }
  | { type: 'STOP' }
  | { type: 'LIMIT_REACHED' }
  | { type: 'ERROR' }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'STOP_PLAYBACK' }
  | { type: 'PLAYBACK_DONE' }
  | { type: 'RESET' }
  | { type: 'IMPORT' }

/* Lifecycle for /song-recorder. Pure state chart — mic, metronome and playback
 * scheduling live in useSongRecorder.
 *
 * idle → countIn (one bar of clicks) → recording → review. STOP during the
 * count-in abandons the take; STOP or LIMIT_REACHED while recording keeps it.
 * review owns the playback transport (stopped ⇄ playing ⇄ paused); RESET
 * throws the take away for a new one. ERROR (mic refused) returns to idle.
 * IMPORT (ABC pasted in) replaces the take: from idle, or from review where it
 * lands on a stopped transport. Never mid-take. */
export const songRecorderMachine = setup({
  types: {
    events: {} as SongRecorderEvent,
  },
}).createMachine({
  id: 'songRecorder',
  initial: 'idle',
  states: {
    idle: {
      on: { RECORD: 'countIn', IMPORT: 'review' },
    },
    countIn: {
      on: {
        COUNT_IN_DONE: 'recording',
        STOP: 'idle',
        ERROR: 'idle',
      },
    },
    recording: {
      on: {
        STOP: 'review',
        LIMIT_REACHED: 'review',
        ERROR: 'idle',
      },
    },
    review: {
      initial: 'stopped',
      on: { RESET: 'idle', IMPORT: '.stopped' },
      states: {
        stopped: {
          on: { PLAY: 'playing' },
        },
        playing: {
          on: {
            PAUSE: 'paused',
            STOP_PLAYBACK: 'stopped',
            PLAYBACK_DONE: 'stopped',
          },
        },
        paused: {
          on: {
            RESUME: 'playing',
            STOP_PLAYBACK: 'stopped',
          },
        },
      },
    },
  },
})
