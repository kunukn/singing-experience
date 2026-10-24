import { describe, expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'
import type { FocusLevel } from './focusLevel'
import PitchFocusLevelLadder from './PitchFocusLevelLadder.vue'

function mountLadder(level: FocusLevel | null) {
  return mount(PitchFocusLevelLadder, {
    global: {
      plugins: [createI18n({ legacy: false, locale: 'en', messages: { en } })],
    },
    props: { level },
  })
}

function row(wrapper: ReturnType<typeof mountLadder>, level: FocusLevel) {
  return wrapper.get(`[data-level="${level}"]`)
}

describe('PitchFocusLevelLadder', () => {
  test('should list the levels highest first', () => {
    const levels = mountLadder(null)
      .findAll('[data-level]')
      .map((item) => item.attributes('data-level'))

    expect(levels).toEqual([
      'pitchPerfect',
      'leadSinger',
      'stageReady',
      'niceAndClose',
      'findingIt',
      'warmingUp',
    ])
  })

  test('should mark only the current level', () => {
    const wrapper = mountLadder('niceAndClose')

    expect(
      wrapper.findAll('[data-current="true"]').map((item) => item.text()),
    ).toEqual([expect.stringContaining('Nice and close')])
    expect(row(wrapper, 'niceAndClose').text()).toContain('You')
  })

  test('should mark no level before one is given', () => {
    expect(mountLadder(null).find('[data-current="true"]').exists()).toBe(false)
  })

  test('should show both goals for the top level', () => {
    expect(row(mountLadder(null), 'pitchPerfect').text()).toContain(
      '95% on pitch and 80% spot on',
    )
  })

  test('should show only the on pitch goal when spot on is not needed', () => {
    expect(row(mountLadder(null), 'stageReady').text()).toContain(
      '75% on pitch',
    )
    expect(row(mountLadder(null), 'stageReady').text()).not.toContain('spot on')
  })

  test('should welcome everyone on the first level', () => {
    expect(row(mountLadder(null), 'warmingUp').text()).toContain(
      'Everyone starts here',
    )
  })

  test('should explain on pitch and spot on in cents', () => {
    expect(mountLadder(null).text()).toContain(
      'On pitch: within 20 cents · Spot on: within 10 cents',
    )
  })
})
