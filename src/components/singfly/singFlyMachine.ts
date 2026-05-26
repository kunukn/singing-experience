import { assign, setup } from 'xstate'

/* Why the bird's round ended. Carried in machine context (not a side ref) so
 * "crashed" is self-describing: the renderer recolors the lethal pillar /
 * boundary and the post-death preview line gates straight off this. */
export type CrashCause =
  | { kind: 'pipe'; pipeId: number }
  | { kind: 'boundary'; side: 'floor' | 'ceiling' }
  /* Round ran out with unhit pipes but no single lethal hit (silent player,
   * timer expiry). Still a loss, but no red pillar / boundary to color. */
  | { kind: 'incomplete' }

export type SingFlyPhase = 'idle' | 'playing' | 'crashed' | 'won'

type SingFlyContext = { crashCause: CrashCause | null }

type SingFlyEvent =
  | { type: 'START' }
  | { type: 'CRASH'; cause: CrashCause }
  | { type: 'WON' }
  | { type: 'RESET' }

/* The single source of truth for the SingFly round lifecycle.
 *
 * CRASH/WON are only accepted in `playing`, so an illegal end transition is
 * structurally impossible — no guard predicate, no scattered booleans. Every
 * lifecycle side-effect (mic, canvas render loop, field-clock freeze, death
 * burst, trace reset) lives in a single `watch(phase)` per owner, not in this
 * machine: the machine stays pure (state + context only). */
export const singFlyMachine = setup({
  types: {
    context: {} as SingFlyContext,
    events: {} as SingFlyEvent,
  },
  actions: {
    setCause: assign({
      crashCause: ({ event }) => (event.type === 'CRASH' ? event.cause : null),
    }),
    clearCause: assign({ crashCause: null }),
  },
}).createMachine({
  id: 'singFly',
  initial: 'idle',
  context: { crashCause: null },
  states: {
    idle: {
      on: { START: 'playing' },
    },
    playing: {
      /* Re-entering for a replay clears the previous round's cause. */
      entry: 'clearCause',
      on: {
        CRASH: { target: 'crashed', actions: 'setCause' },
        WON: 'won',
        RESET: 'idle',
      },
    },
    crashed: {
      on: { START: 'playing', RESET: 'idle' },
    },
    won: {
      on: { START: 'playing', RESET: 'idle' },
    },
  },
})
