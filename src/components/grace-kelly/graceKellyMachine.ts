import { setup } from 'xstate'

export type GraceKellyPhase = 'idle' | 'playing' | 'done'

type GraceKellyEvent = { type: 'START' } | { type: 'STOP' } | { type: 'DONE' }

/* The single source of truth for the Grace Kelly melody player lifecycle.
 *
 * DONE is only accepted in `playing` so a stray completion is impossible.
 * STOP returns to idle without going through done (user manually cancelled).
 * Every side-effect (audio scheduling, cancellation) lives in the composable
 * around this machine — it stays pure. */
export const graceKellyMachine = setup({
  types: {
    events: {} as GraceKellyEvent,
  },
}).createMachine({
  id: 'graceKelly',
  initial: 'idle',
  states: {
    idle: {
      on: { START: 'playing' },
    },
    playing: {
      on: {
        DONE: 'done',
        STOP: 'idle',
      },
    },
    done: {
      on: { START: 'playing' },
    },
  },
})
