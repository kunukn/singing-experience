export type Program = {
  key: string
  icon: string
  route: string
}

export const programs: Program[] = [
  {
    key: 'pitchDetector',
    icon: '🎤',
    route: '/pitch-detector',
  },
  {
    key: 'doReMi',
    icon: '🎶',
    route: '/do-re-mi',
  },
  {
    key: 'toneDetector',
    icon: '🎹',
    route: '/tone-detector',
  },
]
