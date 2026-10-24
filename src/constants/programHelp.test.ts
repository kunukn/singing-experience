import { describe, expect, test } from 'vitest'
import { programHelpByKey } from './programHelp'
import { games, programs, tools } from './programs'

/* Eager-load every locale so a missing help string fails here, not on screen */
const localeModules = import.meta.glob<{ default: Record<string, unknown> }>(
  '@/locales/*.json',
  { eager: true },
)
const messagesByLocale = Object.fromEntries(
  Object.entries(localeModules).map(([path, module]) => [
    path.match(/([a-z]+)\.json$/)![1],
    module.default,
  ]),
)
const locales = Object.keys(messagesByLocale)

function lookUp(messages: Record<string, unknown>, key: string) {
  return key
    .split('.')
    .reduce<unknown>(
      (node, part) => (node as Record<string, unknown> | undefined)?.[part],
      messages,
    )
}

function requiredHelpKeys() {
  const keys = [
    'home.welcome',
    'programHelp.buttonLabel',
    'programHelp.howTo',
    'programHelp.terms',
  ]
  for (const [programKey, help] of Object.entries(programHelpByKey)) {
    for (let step = 1; step <= help.stepCount; step++) {
      keys.push(`programHelp.${programKey}.step${step}`)
    }
    for (const term of help.terms) {
      keys.push(`glossary.${term}.name`, `glossary.${term}.description`)
    }
  }

  return [...new Set(keys)]
}

describe('program help', () => {
  test('should have a guide for every program', () => {
    const programKeys = [...programs, ...games, ...tools].map(
      (program) => program.key,
    )

    expect(Object.keys(programHelpByKey).toSorted()).toEqual(
      programKeys.toSorted(),
    )
  })

  test.each(locales)('should have every help string in %s', (locale) => {
    const missing = requiredHelpKeys().filter((key) => {
      const value = lookUp(messagesByLocale[locale], key)

      return typeof value !== 'string' || value.trim() === ''
    })

    expect(missing).toEqual([])
  })
})
