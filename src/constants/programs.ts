export type Program = {
  key: string
  icon: string
  route: string
}

export const games: Program[] = [
  {
    key: 'doReMi',
    icon: '🎶',
    route: '/do-re-mi',
  },
  {
    key: 'singTone',
    icon: '🎯',
    route: '/sing-tone',
  },
  {
    key: 'pitchGame',
    icon: '🎼',
    route: '/pitch-game',
  },
  {
    key: 'singFly',
    icon: '🐦',
    route: '/singfly',
  },
  {
    key: 'graceKelly',
    icon: '👑',
    route: '/grace-kelly-challenge',
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
    key: 'tuner',
    icon: '🪕',
    route: '/tuner',
  },
  {
    key: 'toneDetector',
    icon: '🎹',
    route: '/tone-detector',
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
