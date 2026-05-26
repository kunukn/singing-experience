import { setup } from 'xstate'

export type SingTonePhase = 'idle' | 'playing' | 'complete'

type SingToneEvent =
  | { type: 'START' }
  | { type: 'COMPLETE' }
  | { type: 'STOP' }
  | { type: 'RESET' }

/* The single source of truth for the SingTone round lifecycle.
 *
 * COMPLETE is only accepted in `playing`, so a stray completion is
 * structurally impossible — no guard predicate, no scattered booleans. There
 * is no end-cause to carry, so the machine is state-only. Every lifecycle
 * side-effect (mic, RAF tick, reference tone, confetti) lives in the
 * composable / Display around this machine, not in it: the machine stays
 * pure. */
export const singToneMachine = setup({
  types: {
    events: {} as SingToneEvent,
  },
}).createMachine({
  id: 'singTone',
  initial: 'idle',
  states: {
    idle: {
      on: { START: 'playing' },
    },
    playing: {
      on: {
        COMPLETE: 'complete',
        STOP: 'idle',
        RESET: 'idle',
      },
    },
    complete: {
      /* START enables a direct replay; RESET returns to the idle screen. */
      on: { START: 'playing', RESET: 'idle' },
    },
  },
})
