import { describe, expect, test } from 'vitest'
import { createI18n } from 'vue-i18n'
import type en from '@/locales/en.json'

type MessageSchema = typeof en

/* Eager-load every locale so each one's plural forms are checked */
const localeModules = import.meta.glob<{ default: MessageSchema }>(
  '@/locales/*.json',
  { eager: true },
)
const messages: Record<string, MessageSchema> = Object.fromEntries(
  Object.entries(localeModules).map(([path, module]) => [
    path.match(/([a-z]+)\.json$/)![1],
    module.default,
  ]),
)
const locales = Object.keys(messages)

/* Greenlandic has no 1-form yet — it is waiting for a native speaker */
const LOCALES_WITHOUT_ONE_FORM = new Set(['kl'])

function translate(
  locale: string,
  key: 'congratulationsMessage' | 'settingsSummary',
  rounds: number,
) {
  const i18n = createI18n({ legacy: false, locale, messages })

  return i18n.global.t(
    `singTone.${key}`,
    { rounds, seconds: '1.6', holdDuration: 0.1 },
    rounds,
  )
}

describe('Sing Tone copy', () => {
  test('should talk about one tone when a single round is played', () => {
    expect(translate('en', 'congratulationsMessage', 1)).toBe(
      'You matched the tone in 1.6 seconds with 0.1s hold duration!',
    )
    expect(translate('en', 'settingsSummary', 1)).toBe(
      'Sing 1 tone with 0.1s hold duration',
    )
  })

  test('should talk about all the tones when several rounds are played', () => {
    expect(translate('en', 'congratulationsMessage', 3)).toBe(
      'You matched all 3 tones in 1.6 seconds with 0.1s hold duration!',
    )
    expect(translate('en', 'settingsSummary', 3)).toBe(
      'Sing 3 tones with 0.1s hold duration',
    )
  })

  test.each(locales)('should fill every placeholder in %s', (locale) => {
    for (const key of ['congratulationsMessage', 'settingsSummary'] as const) {
      expect(translate(locale, key, 1)).not.toMatch(/[{}]/)
      expect(translate(locale, key, 3)).not.toMatch(/[{}]/)
      expect(translate(locale, key, 3)).toContain('3')
    }
  })

  test.each(locales.filter((locale) => !LOCALES_WITHOUT_ONE_FORM.has(locale)))(
    'should have a separate one-tone message in %s',
    (locale) => {
      expect(translate(locale, 'congratulationsMessage', 1)).not.toBe(
        translate(locale, 'congratulationsMessage', 3).replace('3', '1'),
      )
    },
  )
})
