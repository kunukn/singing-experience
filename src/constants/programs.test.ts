import { describe, expect, test } from 'vitest'

import {
  EXPERIMENTAL_SECTION,
  gameSections,
  games,
  groupProgramsBySection,
  startHerePrograms,
  toolSections,
  tools,
} from './programs'

const listKeys = (groups: ReturnType<typeof groupProgramsBySection>) =>
  groups.flatMap((group) => group.programs.map((program) => program.key))

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
    const groupKeys = groupProgramsBySection(tools, toolSections).map(
      (group) => group.key,
    )

    expect(groupKeys).toEqual([...toolSections, EXPERIMENTAL_SECTION])
  })

  test('moves alpha programs into the experimental group', () => {
    const groups = groupProgramsBySection(tools, toolSections)
    const experimental = groups.find(
      (group) => group.key === EXPERIMENTAL_SECTION,
    )
    const alphaKeys = tools
      .filter((program) => program.stage === 'alpha')
      .map((program) => program.key)

    expect(experimental?.programs.map((program) => program.key)).toEqual(
      alphaKeys,
    )
  })

  test('leaves out empty sections', () => {
    const groups = groupProgramsBySection(
      tools.filter((program) => program.section === 'instruments'),
      toolSections,
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
})
