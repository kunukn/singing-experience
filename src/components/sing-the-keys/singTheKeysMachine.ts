import { setup } from 'xstate'

export type SingTheKeysPhase = 'idle' | 'playing' | 'done'

type SingTheKeysEvent = { type: 'START' } | { type: 'STOP' } | { type: 'DONE' }

/* Lifecycle of one Sing the Keys run. No pause: a falling lane with an open mic
 * has nothing sensible to freeze on — the singer stops and starts over.
 *
 * DONE is only accepted in `playing` so a stray completion is impossible.
 * Every side-effect (audio scheduling, rAF loop) lives in useSingTheKeys —
 * the machine stays pure. */
export const singTheKeysMachine = setup({
  types: {
    events: {} as SingTheKeysEvent,
  },
}).createMachine({
  id: 'singTheKeys',
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
