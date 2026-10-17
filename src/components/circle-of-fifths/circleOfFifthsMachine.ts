import { setup } from 'xstate'

export type CircleOfFifthsPhase =
  | 'idle'
  | 'walking'
  | 'walkComplete'
  | 'patternSinging'

type CircleOfFifthsEvent =
  | { type: 'START_WALK' }
  | { type: 'START_PATTERN' }
  | { type: 'COMPLETE' }
  | { type: 'STOP' }
  | { type: 'RESET' }

/* Lifecycle of both modes. The walk goes idle → walking → walkComplete; an
 * Explore pattern is a short idle → patternSinging → idle round trip. As in
 * doReMiMachine, COMPLETE is only accepted while singing, and every side effect
 * (mic, RAF tick, tones, confetti) lives in the composable around it. */
export const circleOfFifthsMachine = setup({
  types: {
    events: {} as CircleOfFifthsEvent,
  },
}).createMachine({
  id: 'circleOfFifths',
  initial: 'idle',
  states: {
    idle: {
      on: { START_WALK: 'walking', START_PATTERN: 'patternSinging' },
    },
    walking: {
      on: { COMPLETE: 'walkComplete', STOP: 'idle', RESET: 'idle' },
    },
    walkComplete: {
      on: { START_WALK: 'walking', RESET: 'idle' },
    },
    patternSinging: {
      on: { COMPLETE: 'idle', STOP: 'idle', RESET: 'idle' },
    },
  },
})
