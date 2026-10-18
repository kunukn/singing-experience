import { describe, expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'
import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'
import GameEndActions from './GameEndActions.vue'

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })

function mountActions(slot?: string) {
  return mount(GameEndActions, {
    slots: slot ? { default: slot } : {},
    global: { plugins: [i18n, PrimeVue] },
  })
}

describe('GameEndActions', () => {
  test('should label the buttons Play Again and Settings', () => {
    const wrapper = mountActions()

    expect(wrapper.get('[data-testid="game-play-again"]').text()).toBe(
      'Play Again',
    )
    expect(wrapper.get('[data-testid="game-settings"]').text()).toBe('Settings')
  })

  test('should ask to play again when Play Again is pressed', async () => {
    const wrapper = mountActions()

    await wrapper.get('[data-testid="game-play-again"]').trigger('click')

    expect(wrapper.emitted('playAgain')).toHaveLength(1)
    expect(wrapper.emitted('settings')).toBeUndefined()
  })

  test('should ask for the settings when Settings is pressed', async () => {
    const wrapper = mountActions()

    await wrapper.get('[data-testid="game-settings"]').trigger('click')

    expect(wrapper.emitted('settings')).toHaveLength(1)
    expect(wrapper.emitted('playAgain')).toBeUndefined()
  })

  test('should show extra controls passed in the slot', () => {
    const wrapper = mountActions('<span data-testid="extra">Snap</span>')

    expect(wrapper.get('[data-testid="extra"]').text()).toBe('Snap')
  })
})
