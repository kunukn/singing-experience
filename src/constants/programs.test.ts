import { describe, expect, test } from 'vitest'

import {
  EXPERIMENTAL_SECTION,
  gameSections,
  games,
  groupProgramsBySection,
  startHerePrograms,
  dailyWarmUpPrograms,
  toolSections,
  tools,
  type Program,
  type ProgramSection,
  type ProgramStage,
} from './programs'

const listKeys = (groups: ReturnType<typeof groupProgramsBySection>) =>
  groups.flatMap((group) => group.programs.map((program) => program.key))

/* A hand-built catalogue for the grouping rules, so promoting a real program
 * out of alpha, or moving it to another section, leaves those tests alone.
 * Three of the tools sections, in their display order. */
const SECTION_ORDER: ProgramSection[] = [
  'getReady',
  'seeYourVoice',
  'instruments',
]

const createProgram = (
  key: string,
  section: ProgramSection,
  stage?: ProgramStage,
): Program => ({ key, icon: {}, route: `/${key}`, section, stage })

describe('programs', () => {
  test.each([
    { name: 'tools', list: tools, order: toolSections },
    { name: 'games', list: games, order: gameSections },
  ])('gives every $name program exactly one group', ({ list, order }) => {
    const keys = listKeys(groupProgramsBySection(list, order))

    expect(keys.toSorted()).toEqual(
      list.map((program) => program.key).toSorted(),
    )
  })

  test.each([
    { name: 'tools', list: tools, order: toolSections },
    { name: 'games', list: games, order: gameSections },
  ])(
    'gives every non-alpha $name program a known section',
    ({ list, order }) => {
      const sectionsInOrder: readonly string[] = order

      for (const program of list.filter((item) => item.stage !== 'alpha'))
        expect(sectionsInOrder).toContain(program.section)
    },
  )

  test('lists groups in section order with experimental last', () => {
    const groups = groupProgramsBySection(
      [
        createProgram('sketchPad', 'getReady', 'alpha'),
        createProgram('tuner', 'instruments'),
        createProgram('warmUp', 'getReady'),
      ],
      SECTION_ORDER,
    )

    expect(groups.map((group) => group.key)).toEqual([
      'getReady',
      'instruments',
      EXPERIMENTAL_SECTION,
    ])
  })

  test('moves alpha programs out of their section into the experimental group', () => {
    const groups = groupProgramsBySection(
      [
        createProgram('warmUp', 'getReady'),
        createProgram('sketchPad', 'getReady', 'alpha'),
      ],
      SECTION_ORDER,
    )

    expect(groups.map((group) => [group.key, listKeys([group])])).toEqual([
      ['getReady', ['warmUp']],
      [EXPERIMENTAL_SECTION, ['sketchPad']],
    ])
  })

  test('leaves out empty sections', () => {
    const groups = groupProgramsBySection(
      [createProgram('tuner', 'instruments')],
      SECTION_ORDER,
    )

    expect(groups.map((group) => group.key)).toEqual(['instruments'])
  })

  test('resolves every start-here program', () => {
    expect(startHerePrograms.map((program) => program.key)).toEqual([
      'warmUp',
      'voiceRangeFinder',
      'singTone',
    ])
  })

  test('orders the daily warm-up with the range finder last', () => {
    expect(dailyWarmUpPrograms.map((program) => program.key)).toEqual([
      'warmUp',
      'singTone',
      'voiceRangeFinder',
    ])
  })
})
