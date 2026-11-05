import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'
import { compressTake } from './compressTake'
import TakePlayer from './TakePlayer.vue'

vi.mock('./compressTake', () => ({
  SMALL_FILE_MIME_TYPE: 'audio/mp4',
  compressTake: vi.fn(),
}))

const SMALL_BUTTON = '[data-testid="take-download-small"]'
const SMALL_ERROR = '[data-testid="take-download-small-error"]'
const RECORDED_AT = new Date(2026, 10, 5, 21, 30)

const wavTake = () => new Blob(['wav'], { type: 'audio/wav' })

function mountPlayer(blob: Blob = wavTake(), mimeType = 'audio/wav') {
  return mount(TakePlayer, {
    props: { blob, mimeType, recordedAt: RECORDED_AT },
    global: {
      plugins: [createI18n({ legacy: false, locale: 'en', messages: { en } })],
    },
  })
}

let savedFiles: string[] = []

beforeEach(() => {
  savedFiles = []
  vi.mocked(compressTake)
    .mockReset()
    .mockResolvedValue(new Blob(['m4a'], { type: 'audio/mp4' }))
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    savedFiles.push(this.download)
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('TakePlayer - small file', () => {
  test('should save the take as a small .m4a', async () => {
    const take = wavTake()
    const wrapper = mountPlayer(take)

    await wrapper.get(SMALL_BUTTON).trigger('click')
    await flushPromises()

    expect(compressTake).toHaveBeenCalledWith(take)
    expect(savedFiles).toEqual(['voice-recording-2026-11-05-2130.m4a'])
  })

  test('should reuse the small file on a second tap', async () => {
    const wrapper = mountPlayer()

    await wrapper.get(SMALL_BUTTON).trigger('click')
    await flushPromises()
    await wrapper.get(SMALL_BUTTON).trigger('click')
    await flushPromises()

    expect(compressTake).toHaveBeenCalledTimes(1)
    expect(savedFiles).toHaveLength(2)
  })

  test('should make a new small file for a new take', async () => {
    const wrapper = mountPlayer()

    await wrapper.get(SMALL_BUTTON).trigger('click')
    await flushPromises()
    await wrapper.setProps({ blob: wavTake() })
    await wrapper.get(SMALL_BUTTON).trigger('click')
    await flushPromises()

    expect(compressTake).toHaveBeenCalledTimes(2)
  })

  test('should explain when the small file fails and save nothing', async () => {
    vi.mocked(compressTake).mockRejectedValue(new Error('no encoder'))
    const wrapper = mountPlayer()

    await wrapper.get(SMALL_BUTTON).trigger('click')
    await flushPromises()

    expect(wrapper.get(SMALL_ERROR).text()).toBe(
      'Failed to make a small file. You can still download the full one.',
    )
    expect(savedFiles).toEqual([])
  })

  test('should not offer a small file for an older compressed take', () => {
    const wrapper = mountPlayer(
      new Blob(['webm'], { type: 'audio/webm' }),
      'audio/webm',
    )

    expect(wrapper.find(SMALL_BUTTON).exists()).toBe(false)
  })
})
