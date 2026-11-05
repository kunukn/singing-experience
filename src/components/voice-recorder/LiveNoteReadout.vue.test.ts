import { describe, expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'
import { frequencyToNote, type NoteInfo } from '@/utils/noteUtils'
import LiveNoteReadout from './LiveNoteReadout.vue'

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })

function mountReadout(noteInfo: NoteInfo | null) {
  return mount(LiveNoteReadout, {
    props: { noteInfo },
    global: { plugins: [i18n] },
  })
}

describe('LiveNoteReadout', () => {
  test('should show the note name and its cents', () => {
    const noteInfo = frequencyToNote(155.56)!

    const wrapper = mountReadout({ ...noteInfo, cents: 12 })

    expect(wrapper.get('[data-testid="live-note-label"]').text()).toBe('D♯3')
    expect(wrapper.get('[data-testid="live-note-cents"]').text()).toBe('+12¢')
    expect(
      wrapper.get('[data-testid="cents-meter"]').attributes('data-visible'),
    ).toBe('true')
  })

  test('should show a placeholder and hide the meter without a pitch', () => {
    const wrapper = mountReadout(null)

    expect(wrapper.get('[data-testid="live-note-label"]').text()).toBe('–')
    expect(
      wrapper.get('[data-testid="live-note-cents"]').attributes('data-cents'),
    ).toBe('none')
    expect(
      wrapper.get('[data-testid="cents-meter"]').attributes('data-visible'),
    ).toBe('false')
  })
})
