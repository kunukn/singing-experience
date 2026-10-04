import { beforeEach, describe, expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'
import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'
import PianoNoteLog from './PianoNoteLog.vue'

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })

const writeText = vi.fn<(text: string) => Promise<void>>()

function mountLog(text: string) {
  return mount(PianoNoteLog, {
    props: { modelValue: text },
    /* PrimeTextarea reads $primevue.config, so it needs the plugin installed. */
    global: { plugins: [i18n, PrimeVue] },
  })
}

function clearButtonOf(wrapper: ReturnType<typeof mountLog>) {
  return wrapper.get('[data-testid="piano-note-log-clear"]')
}

function copyButtonOf(wrapper: ReturnType<typeof mountLog>) {
  return wrapper.get('[data-testid="piano-note-log-copy"]')
}

describe('PianoNoteLog', () => {
  beforeEach(() => {
    writeText.mockReset()
    writeText.mockResolvedValue()
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
  })

  test('should show the logged notes in the text box', () => {
    const wrapper = mountLog('D4 E4')
    const textarea = wrapper.get('textarea').element as HTMLTextAreaElement

    expect(textarea.value).toBe('D4 E4')
  })

  test('should empty the log when Clear is pressed', async () => {
    const wrapper = mountLog('D4 E4')

    await clearButtonOf(wrapper).trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([['']])
  })

  test('should copy the log text when Copy is pressed', async () => {
    const wrapper = mountLog('D4 E4')

    await copyButtonOf(wrapper).trigger('click')
    await flushPromises()

    expect(writeText).toHaveBeenCalledTimes(1)
    expect(writeText).toHaveBeenCalledWith('D4 E4')
    expect(copyButtonOf(wrapper).text()).toBe('Copied')
  })

  test('should not claim a copy when the clipboard refuses', async () => {
    writeText.mockRejectedValue(new Error('denied'))
    const wrapper = mountLog('D4 E4')

    await copyButtonOf(wrapper).trigger('click')
    await flushPromises()

    expect(copyButtonOf(wrapper).text()).toBe('Copy')
  })

  test('should pass typed edits up', async () => {
    const wrapper = mountLog('D4')

    await wrapper.get('textarea').setValue('D4\n')

    expect(wrapper.emitted('update:modelValue')).toEqual([['D4\n']])
  })

  test('should disable Clear and Copy while the log is empty', () => {
    const wrapper = mountLog('')

    expect(clearButtonOf(wrapper).attributes('disabled')).toBeDefined()
    expect(copyButtonOf(wrapper).attributes('disabled')).toBeDefined()
  })
})
