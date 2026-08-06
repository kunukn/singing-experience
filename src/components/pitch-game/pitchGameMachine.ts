import { setup } from 'xstate'

export type PitchGamePhase = 'idle' | 'playing' | 'complete'

type PitchGameEvent =
  { type: 'START' } | { type: 'COMPLETE' } | { type: 'RESET' }

/* The single source of truth for the PitchGame round lifecycle.
 *
 * COMPLETE is only accepted in `playing`, so a stray (or double) completion is
 * structurally impossible — replaces the old isPlaying/summary flag-guard.
 * There is no STOP event: pressing Stop calls stopGame() which finalizes a
 * summary and ends into `complete` (not back to `idle`) — unlike DoReMi /
 * SingTone. No end-cause to carry, so the machine is state-only. Every
 * lifecycle side-effect (mic, RAF tick, end timer, confetti) lives in the
 * composable / Display around this machine, not in it: the machine stays
 * pure. */
export const pitchGameMachine = setup({
  types: {
    events: {} as PitchGameEvent,
  },
}).createMachine({
  id: 'pitchGame',
  initial: 'idle',
  states: {
    idle: {
      on: { START: 'playing' },
    },
    playing: {
      on: {
        COMPLETE: 'complete',
        RESET: 'idle',
      },
    },
    complete: {
      /* START enables a direct replay; RESET returns to the idle screen. */
      on: { START: 'playing', RESET: 'idle' },
    },
  },
})
