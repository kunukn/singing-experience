import type { Component } from 'vue'

import ProgramCircleOfFifthsIcon from '@/components/icons/program/ProgramCircleOfFifthsIcon.vue'
import ProgramDoReMiIcon from '@/components/icons/program/ProgramDoReMiIcon.vue'
import ProgramGraceKellyIcon from '@/components/icons/program/ProgramGraceKellyIcon.vue'
import ProgramGuitarIcon from '@/components/icons/program/ProgramGuitarIcon.vue'
import ProgramNotesIcon from '@/components/icons/program/ProgramNotesIcon.vue'
import ProgramPianoIcon from '@/components/icons/program/ProgramPianoIcon.vue'
import ProgramPitchDetectorIcon from '@/components/icons/program/ProgramPitchDetectorIcon.vue'
import ProgramNoteRushIcon from '@/components/icons/program/ProgramNoteRushIcon.vue'
import ProgramScaleDetectorIcon from '@/components/icons/program/ProgramScaleDetectorIcon.vue'
import ProgramSingFlyIcon from '@/components/icons/program/ProgramSingFlyIcon.vue'
import ProgramSingTheKeysIcon from '@/components/icons/program/ProgramSingTheKeysIcon.vue'
import ProgramSingToneIcon from '@/components/icons/program/ProgramSingToneIcon.vue'
import ProgramSingingGamesIcon from '@/components/icons/program/ProgramSingingGamesIcon.vue'
import ProgramSingingToolsIcon from '@/components/icons/program/ProgramSingingToolsIcon.vue'
import ProgramMelodyWriterIcon from '@/components/icons/program/ProgramMelodyWriterIcon.vue'
import ProgramToneDetectorIcon from '@/components/icons/program/ProgramToneDetectorIcon.vue'
import ProgramTunerIcon from '@/components/icons/program/ProgramTunerIcon.vue'
import ProgramVoiceRangeFinderIcon from '@/components/icons/program/ProgramVoiceRangeFinderIcon.vue'
import ProgramVoiceRecorderIcon from '@/components/icons/program/ProgramVoiceRecorderIcon.vue'
import ProgramWarmUpIcon from '@/components/icons/program/ProgramWarmUpIcon.vue'

/* Maturity of an unfinished program — shown as a tag on its card and in the top bar */
export type ProgramStage = 'alpha' | 'beta'

/* Section headings on the Tools and Games pages, in display order */
export const toolSections = [
  'getReady',
  'seeYourVoice',
  'instruments',
  'learnMusic',
] as const
export const gameSections = ['startHere', 'challenges'] as const

/* Alpha programs gather here, below every other section, whatever their own section says */
export const EXPERIMENTAL_SECTION = 'experimental'

export type ProgramSection =
  | (typeof toolSections)[number]
  | (typeof gameSections)[number]

export type Program = {
  key: string
  icon: Component
  route: string
  stage?: ProgramStage
  section?: ProgramSection
}

export type ProgramGroup = {
  key: ProgramSection | typeof EXPERIMENTAL_SECTION
  programs: Program[]
}

export const games: Program[] = [
  {
    key: 'singTone',
    icon: ProgramSingToneIcon,
    route: '/sing-tone',
    section: 'startHere',
  },
  {
    key: 'doReMi',
    icon: ProgramDoReMiIcon,
    route: '/do-re-mi',
    section: 'startHere',
  },
  {
    key: 'singTheKeys',
    icon: ProgramSingTheKeysIcon,
    route: '/sing-the-keys',
    section: 'challenges',
    stage: 'beta',
  },
  {
    key: 'graceKelly',
    icon: ProgramGraceKellyIcon,
    route: '/grace-kelly-challenge',
    section: 'challenges',
  },
  {
    key: 'singFly',
    icon: ProgramSingFlyIcon,
    route: '/singfly',
    section: 'startHere',
  },
  {
    key: 'noteRush',
    icon: ProgramNoteRushIcon,
    route: '/note-rush',
    section: 'challenges',
    stage: 'beta',
  },
  {
    key: 'circleOfFifths',
    icon: ProgramCircleOfFifthsIcon,
    route: '/circle-of-fifths',
    section: 'challenges',
    stage: 'beta',
  },
]

export const tools: Program[] = [
  {
    key: 'pitchDetector',
    icon: ProgramPitchDetectorIcon,
    route: '/pitch-detector',
    section: 'seeYourVoice',
  },
  {
    key: 'warmUp',
    icon: ProgramWarmUpIcon,
    route: '/warm-up',
    section: 'getReady',
  },
  {
    key: 'voiceRangeFinder',
    icon: ProgramVoiceRangeFinderIcon,
    route: '/voice-range-finder',
    section: 'getReady',
  },
  {
    key: 'notes',
    icon: ProgramNotesIcon,
    route: '/notes',
    section: 'learnMusic',
  },

  {
    key: 'piano',
    icon: ProgramPianoIcon,
    route: '/piano',
    section: 'instruments',
  },
  {
    key: 'guitar',
    icon: ProgramGuitarIcon,
    route: '/guitar',
    section: 'instruments',
  },
  {
    key: 'scaleDetector',
    icon: ProgramScaleDetectorIcon,
    route: '/scale-detector',
    section: 'learnMusic',
    stage: 'beta',
  },
  {
    key: 'voiceRecorder',
    icon: ProgramVoiceRecorderIcon,
    route: '/voice-recorder',
    section: 'seeYourVoice',
    stage: 'beta',
  },
  {
    key: 'melodyWriter',
    icon: ProgramMelodyWriterIcon,
    route: '/melody-writer',
    section: 'seeYourVoice',
    stage: 'alpha',
  },
  {
    key: 'toneDetector',
    icon: ProgramToneDetectorIcon,
    route: '/tone-detector',
    section: 'seeYourVoice',
    stage: 'alpha',
  },
  {
    key: 'tuner',
    icon: ProgramTunerIcon,
    route: '/tuner',
    section: 'instruments',
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

/**
 * Splits programs into their sections, in `sectionOrder`. Alpha programs go
 * to a trailing experimental group, so promoting one out of alpha moves it
 * back to its own section. Empty sections are left out.
 */
export function groupProgramsBySection(
  programList: readonly Program[],
  sectionOrder: readonly ProgramSection[],
): ProgramGroup[] {
  const groups: ProgramGroup[] = sectionOrder.map((section) => ({
    key: section,
    programs: programList.filter(
      (program) => program.stage !== 'alpha' && program.section === section,
    ),
  }))
  groups.push({
    key: EXPERIMENTAL_SECTION,
    programs: programList.filter((program) => program.stage === 'alpha'),
  })

  return groups.filter((group) => group.programs.length > 0)
}

/* The first programs a new singer should try, in order — shown on the landing page */
export const startHerePrograms: Program[] = [
  '/warm-up',
  '/voice-range-finder',
  '/sing-tone',
].map((route) => programByRoute.get(route)!)

/* The same programs for a returning singer's daily warm-up — the range is already known, so the finder goes last */
export const dailyWarmUpPrograms: Program[] = [
  '/warm-up',
  '/sing-tone',
  '/voice-range-finder',
].map((route) => programByRoute.get(route)!)
