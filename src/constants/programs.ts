export type Program = {
  key: string
  icon: string
  route: string
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
    key: 'graceKelly',
    icon: '👑',
    route: '/grace-kelly-challenge',
  },
  {
    key: 'singFly',
    icon: '🐦',
    route: '/singfly',
  },
  {
    key: 'pitchGame',
    icon: '🎼',
    route: '/pitch-game',
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
    key: 'piano',
    icon: '🎹',
    route: '/piano',
  },
  {
    key: 'guitar',
    icon: '🎸',
    route: '/guitar',
  },
  {
    key: 'tuner',
    icon: '🪕',
    route: '/tuner',
  },
  {
    key: 'notes',
    icon: '🎵',
    route: '/notes',
  },
  {
    key: 'toneDetector',
    icon: '🎚️',
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
