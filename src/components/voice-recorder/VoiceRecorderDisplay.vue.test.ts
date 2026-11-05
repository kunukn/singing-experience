import { afterEach, describe, expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { useSettings } from '@/composables/useSettings'
import en from '@/locales/en.json'
import { frequencyToNote } from '@/utils/noteUtils'
import type { RecorderStatus, Take } from './useVoiceRecorder'
import VoiceRecorderDisplay from './VoiceRecorderDisplay.vue'

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })

const TAKE: Take = {
  blob: new Blob(['take'], { type: 'audio/webm' }),
  mimeType: 'audio/webm',
  recordedAt: new Date(0),
  stopReason: 'user',
  hasAutoGain: false,
}

const PREVIEW_TOGGLE = '[data-testid="recorder-preview"]'
const NOTES_TOGGLE = '[data-testid="recorder-live-notes"]'
const READOUT = '[data-testid="live-note"]'

function mountDisplay({
  status = 'idle',
  take = null,
  isSimulated = false,
  isPreviewOn = true,
}: {
  status?: RecorderStatus
  take?: Take | null
  isSimulated?: boolean
  isPreviewOn?: boolean
} = {}) {
  useSettings().isPreviewEnabled.value = isPreviewOn

  return mount(VoiceRecorderDisplay, {
    props: {
      status,
      take,
      isSimulated,
      elapsedMs: 0,
      errorKey: null,
      previewNote: frequencyToNote(155.56),
    },
    global: {
      plugins: [i18n],
      stubs: { TakePlayer: true, TakeAnalysisPanel: true },
    },
  })
}

describe('VoiceRecorderDisplay toggles', () => {
  afterEach(() => {
    useSettings().isPreviewEnabled.value = false
  })

  test.each<{
    state: string
    status: RecorderStatus
    take: Take | null
    hasPreview: boolean
    hasNotes: boolean
  }>([
    {
      state: 'idle with no take',
      status: 'idle',
      take: null,
      hasPreview: true,
      hasNotes: false,
    },
    {
      state: 'starting',
      status: 'starting',
      take: null,
      hasPreview: false,
      hasNotes: false,
    },
    {
      state: 'recording',
      status: 'recording',
      take: null,
      hasPreview: false,
      hasNotes: true,
    },
    {
      state: 'showing a take',
      status: 'idle',
      take: TAKE,
      hasPreview: false,
      hasNotes: false,
    },
  ])(
    'should offer the toggle that has an effect when $state',
    ({ status, take, hasPreview, hasNotes }) => {
      const wrapper = mountDisplay({ status, take })

      expect(wrapper.find(PREVIEW_TOGGLE).exists()).toBe(hasPreview)
      expect(wrapper.find(NOTES_TOGGLE).exists()).toBe(hasNotes)
    },
  )

  test('should show the previewed note when See my voice is on', () => {
    const wrapper = mountDisplay()

    expect(wrapper.get('[data-testid="live-note-label"]').text()).toBe('D♯3')
  })

  test('should hide the readout when See my voice is off', () => {
    const wrapper = mountDisplay({ isPreviewOn: false })

    expect(wrapper.find(READOUT).exists()).toBe(false)
  })

  test('should hide the readout while a take is shown', () => {
    const wrapper = mountDisplay({ take: TAKE })

    expect(wrapper.find(READOUT).exists()).toBe(false)
  })

  test('should offer no preview on the test page', () => {
    const wrapper = mountDisplay({ isSimulated: true })

    expect(wrapper.find(PREVIEW_TOGGLE).exists()).toBe(false)
    expect(wrapper.find(READOUT).exists()).toBe(false)
  })
})
