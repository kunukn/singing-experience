import { setup } from 'xstate'

export type NotesPhase = 'idle' | 'playing' | 'paused' | 'done'

type NotesEvent =
  | { type: 'START' }
  | { type: 'STOP' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'DONE' }

/* Lifecycle for the /notes scale player. Mirrors the Grace Kelly machine — a
 * pure idle/playing/paused/done state chart with every side-effect (audio
 * scheduling, cancellation) living in the composable around it.
 *
 * DONE is only accepted in `playing` so a stray completion is impossible.
 * STOP returns to idle from either playing or paused (user manually cancelled).
 * PAUSE/RESUME toggle between playing and paused without restarting. */
export const notesMachine = setup({
  types: {
    events: {} as NotesEvent,
  },
}).createMachine({
  id: 'notes',
  initial: 'idle',
  states: {
    idle: {
      on: { START: 'playing' },
    },
    playing: {
      on: {
        DONE: 'done',
        STOP: 'idle',
        PAUSE: 'paused',
      },
    },
    paused: {
      on: {
        RESUME: 'playing',
        STOP: 'idle',
      },
    },
    done: {
      on: { START: 'playing' },
    },
  },
})
