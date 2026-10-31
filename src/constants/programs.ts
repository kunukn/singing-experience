import type { Component } from 'vue'

import ProgramCircleOfFifthsIcon from '@/components/icons/program/ProgramCircleOfFifthsIcon.vue'
import ProgramDoReMiIcon from '@/components/icons/program/ProgramDoReMiIcon.vue'
import ProgramGraceKellyIcon from '@/components/icons/program/ProgramGraceKellyIcon.vue'
import ProgramGuitarIcon from '@/components/icons/program/ProgramGuitarIcon.vue'
import ProgramNotesIcon from '@/components/icons/program/ProgramNotesIcon.vue'
import ProgramPianoIcon from '@/components/icons/program/ProgramPianoIcon.vue'
import ProgramPitchDetectorIcon from '@/components/icons/program/ProgramPitchDetectorIcon.vue'
import ProgramPitchGameIcon from '@/components/icons/program/ProgramPitchGameIcon.vue'
import ProgramScaleDetectorIcon from '@/components/icons/program/ProgramScaleDetectorIcon.vue'
import ProgramSingFlyIcon from '@/components/icons/program/ProgramSingFlyIcon.vue'
import ProgramSingTheKeysIcon from '@/components/icons/program/ProgramSingTheKeysIcon.vue'
import ProgramSingToneIcon from '@/components/icons/program/ProgramSingToneIcon.vue'
import ProgramSingingGamesIcon from '@/components/icons/program/ProgramSingingGamesIcon.vue'
import ProgramSingingToolsIcon from '@/components/icons/program/ProgramSingingToolsIcon.vue'
import ProgramSongRecorderIcon from '@/components/icons/program/ProgramSongRecorderIcon.vue'
import ProgramToneDetectorIcon from '@/components/icons/program/ProgramToneDetectorIcon.vue'
import ProgramTunerIcon from '@/components/icons/program/ProgramTunerIcon.vue'
import ProgramVoiceRangeFinderIcon from '@/components/icons/program/ProgramVoiceRangeFinderIcon.vue'
import ProgramWarmUpIcon from '@/components/icons/program/ProgramWarmUpIcon.vue'

/* Maturity of an unfinished program — shown as a tag on its card and in the top bar */
export type ProgramStage = 'alpha' | 'beta'

export type Program = {
  key: string
  icon: Component
  route: string
  stage?: ProgramStage
}

export const games: Program[] = [
  {
    key: 'singTone',
    icon: ProgramSingToneIcon,
    route: '/sing-tone',
  },
  {
    key: 'doReMi',
    icon: ProgramDoReMiIcon,
    route: '/do-re-mi',
  },
  {
    key: 'singTheKeys',
    icon: ProgramSingTheKeysIcon,
    route: '/sing-the-keys',
    stage: 'beta',
  },
  {
    key: 'graceKelly',
    icon: ProgramGraceKellyIcon,
    route: '/grace-kelly-challenge',
  },
  {
    key: 'singFly',
    icon: ProgramSingFlyIcon,
    route: '/singfly',
  },
  {
    key: 'pitchGame',
    icon: ProgramPitchGameIcon,
    route: '/pitch-game',
    stage: 'beta',
  },
  {
    key: 'circleOfFifths',
    icon: ProgramCircleOfFifthsIcon,
    route: '/circle-of-fifths',
    stage: 'beta',
  },
]

export const tools: Program[] = [
  {
    key: 'pitchDetector',
    icon: ProgramPitchDetectorIcon,
    route: '/pitch-detector',
  },
  {
    key: 'warmUp',
    icon: ProgramWarmUpIcon,
    route: '/warm-up',
  },
  {
    key: 'voiceRangeFinder',
    icon: ProgramVoiceRangeFinderIcon,
    route: '/voice-range-finder',
    stage: 'beta',
  },
  {
    key: 'notes',
    icon: ProgramNotesIcon,
    route: '/notes',
  },

  {
    key: 'piano',
    icon: ProgramPianoIcon,
    route: '/piano',
  },
  {
    key: 'guitar',
    icon: ProgramGuitarIcon,
    route: '/guitar',
  },
  {
    key: 'scaleDetector',
    icon: ProgramScaleDetectorIcon,
    route: '/scale-detector',
    stage: 'beta',
  },
  {
    key: 'songRecorder',
    icon: ProgramSongRecorderIcon,
    route: '/song-recorder',
    stage: 'alpha',
  },
  {
    key: 'toneDetector',
    icon: ProgramToneDetectorIcon,
    route: '/tone-detector',
    stage: 'alpha',
  },
  {
    key: 'tuner',
    icon: ProgramTunerIcon,
    route: '/tuner',
  },
]

export const programs: Program[] = [
  {
    key: 'singingTools',
    icon: ProgramSingingToolsIcon,
    route: '/tools',
  },
  {
    key: 'singingGames',
    icon: ProgramSingingGamesIcon,
    route: '/games',
  },
]

export const programStageByRoute = new Map(
  [...games, ...tools].flatMap((program) =>
    program.stage ? [[program.route, program.stage] as const] : [],
  ),
)

export const programByRoute = new Map(
  [...programs, ...games, ...tools].map(
    (program) => [program.route, program] as const,
  ),
)
