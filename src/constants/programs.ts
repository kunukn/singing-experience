/* Maturity of an unfinished program — shown as a tag on its card and in the top bar */
export type ProgramStage = 'alpha' | 'beta'

export type Program = {
  key: string
  icon: string
  route: string
  stage?: ProgramStage
}

export const games: Program[] = [
  {
    key: 'singTone',
    icon: '🎯',
    route: '/sing-tone',
  },
  {
    key: 'doReMi',
    icon: '🎶',
    route: '/do-re-mi',
  },
  {
    key: 'singTheKeys',
    icon: '🎹',
    route: '/sing-the-keys',
    stage: 'beta',
  },
  {
    key: 'graceKelly',
    icon: '👑',
    route: '/grace-kelly-challenge',
    stage: 'beta',
  },
  {
    key: 'singFly',
    icon: '🐦',
    route: '/singfly',
    stage: 'beta',
  },
  {
    key: 'pitchGame',
    icon: '🎼',
    route: '/pitch-game',
    stage: 'beta',
  },
]

export const tools: Program[] = [
  {
    key: 'pitchDetector',
    icon: '🎤',
    route: '/pitch-detector',
  },
  {
    key: 'warmUp',
    icon: '🎙️',
    route: '/warm-up',
  },
  {
    key: 'notes',
    icon: '🎵',
    route: '/notes',
  },
  {
    key: 'tuner',
    icon: '🪕',
    route: '/tuner',
  },
  {
    key: 'piano',
    icon: '🎹',
    route: '/piano',
    stage: 'beta',
  },
  {
    key: 'guitar',
    icon: '🎸',
    route: '/guitar',
    stage: 'beta',
  },
  {
    key: 'scaleDetector',
    icon: '🔑',
    route: '/scale-detector',
    stage: 'beta',
  },
  {
    key: 'songRecorder',
    icon: '📝',
    route: '/song-recorder',
    stage: 'alpha',
  },
  {
    key: 'toneDetector',
    icon: '🎚️',
    route: '/tone-detector',
    stage: 'alpha',
  },
]

export const programs: Program[] = [
  {
    key: 'singingTools',
    icon: '🎛️',
    route: '/tools',
  },
  {
    key: 'singingGames',
    icon: '🕹️',
    route: '/games',
  },
]

export const programStageByRoute = new Map(
  [...games, ...tools].flatMap((program) =>
    program.stage ? [[program.route, program.stage] as const] : [],
  ),
)
