import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { useSettings } from '@/composables/useSettings'
import en from '@/locales/en.json'
import { frequencyToNote } from '@/utils/noteUtils'
import { useRecordingBitDepth } from './recordingQuality'
import type { RecorderStatus, Take } from './useVoiceRecorder'
import VoiceRecorderDisplay from './VoiceRecorderDisplay.vue'

const fileDialog = vi.hoisted(() => ({
  open: vi.fn(),
  onChange: null as ((files: FileList | null) => void) | null,
}))

vi.mock('@vueuse/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@vueuse/core')>()),
  useFileDialog: () => ({
    open: fileDialog.open,
    onChange: (handler: (files: FileList | null) => void) => {
      fileDialog.onChange = handler
    },
  }),
}))

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })

const TAKE: Take = {
  blob: new Blob(['take'], { type: 'audio/webm' }),
  mimeType: 'audio/webm',
  recordedAt: new Date(0),
  stopReason: 'user',
  hasAutoGain: false,
  source: 'recorded',
}

const PREVIEW_TOGGLE = '[data-testid="recorder-preview"]'
const NOTES_TOGGLE = '[data-testid="recorder-live-notes"]'
const READOUT = '[data-testid="live-note"]'
const QUALITY_TOGGLE = '[data-testid="recorder-quality"]'

function mountDisplay({
  status = 'idle',
  take = null,
  isSimulated = false,
  isPreviewOn = true,
  isOpeningFile = false,
}: {
  status?: RecorderStatus
  take?: Take | null
  isSimulated?: boolean
  isPreviewOn?: boolean
  isOpeningFile?: boolean
} = {}) {
  useSettings().isPreviewEnabled.value = isPreviewOn

  return mount(VoiceRecorderDisplay, {
    props: {
      status,
      take,
      isSimulated,
      isOpeningFile,
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
    hasQuality: boolean
  }>([
    {
      state: 'idle with no take',
      status: 'idle',
      take: null,
      hasPreview: true,
      hasNotes: false,
      hasQuality: true,
    },
    {
      state: 'starting',
      status: 'starting',
      take: null,
      hasPreview: false,
      hasNotes: false,
      hasQuality: false,
    },
    {
      state: 'recording',
      status: 'recording',
      take: null,
      hasPreview: false,
      hasNotes: true,
      hasQuality: false,
    },
    {
      state: 'showing a take',
      status: 'idle',
      take: TAKE,
      hasPreview: false,
      hasNotes: false,
      hasQuality: true,
    },
  ])(
    'should offer the toggle that has an effect when $state',
    ({ status, take, hasPreview, hasNotes, hasQuality }) => {
      const wrapper = mountDisplay({ status, take })

      expect(wrapper.find(PREVIEW_TOGGLE).exists()).toBe(hasPreview)
      expect(wrapper.find(NOTES_TOGGLE).exists()).toBe(hasNotes)
      expect(wrapper.find(QUALITY_TOGGLE).exists()).toBe(hasQuality)
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

describe('VoiceRecorderDisplay - recording quality', () => {
  afterEach(() => {
    useRecordingBitDepth().value = 16
  })

  test('should start on Standard and switch to Studio when picked', async () => {
    const wrapper = mountDisplay()
    const toggle = wrapper.get(QUALITY_TOGGLE)

    expect(toggle.attributes('data-bit-depth')).toBe('16')

    const studio = toggle
      .findAll('button')
      .find((button) => button.text().startsWith('Studio'))
    await studio!.trigger('click')

    expect(useRecordingBitDepth().value).toBe(24)
    expect(toggle.attributes('data-bit-depth')).toBe('24')
  })

  test('should describe each option with its bit depth and size', () => {
    const descriptions = mountDisplay()
      .get(QUALITY_TOGGLE)
      .findAll('[data-testid="recorder-quality-description"]')
      .map((description) => description.text())

    expect(descriptions).toEqual([
      'Standard, 16-bit, about 6 MB a minute',
      'Studio, 24-bit, about 9 MB a minute',
    ])
  })

  test('should offer no quality choice on the test page', () => {
    const wrapper = mountDisplay({ isSimulated: true })

    expect(wrapper.find(QUALITY_TOGGLE).exists()).toBe(false)
  })
})

describe('VoiceRecorderDisplay - opening a file', () => {
  const UPLOAD_BUTTON = '[data-testid="recorder-upload"]'
  const RECORD_BUTTON = '[data-testid="recorder-record"]'

  beforeEach(() => {
    fileDialog.open.mockReset()
    fileDialog.onChange = null
  })

  test.each<{ state: string; status: RecorderStatus; take: Take | null }>([
    { state: 'idle with no take', status: 'idle', take: null },
    { state: 'showing a take', status: 'idle', take: TAKE },
  ])('should offer to open a file when $state', ({ status, take }) => {
    const wrapper = mountDisplay({ status, take })

    expect(wrapper.find(UPLOAD_BUTTON).exists()).toBe(true)
  })

  test('should not offer to open a file while recording', () => {
    const wrapper = mountDisplay({ status: 'recording' })

    expect(wrapper.find(UPLOAD_BUTTON).exists()).toBe(false)
  })

  test('should not offer to open a file on the test page', () => {
    const wrapper = mountDisplay({ isSimulated: true })

    expect(wrapper.find(UPLOAD_BUTTON).exists()).toBe(false)
  })

  test('should open the file picker and pass on the picked file', async () => {
    const wrapper = mountDisplay()
    const file = new File(['song'], 'song.mp3', { type: 'audio/mpeg' })

    await wrapper.get(UPLOAD_BUTTON).trigger('click')
    fileDialog.onChange?.([file] as unknown as FileList)

    expect(fileDialog.open).toHaveBeenCalledOnce()
    expect(wrapper.emitted('upload')).toEqual([[file]])
  })

  test('should not record while a picked file is being checked', () => {
    const wrapper = mountDisplay({ isOpeningFile: true })

    expect(wrapper.get(RECORD_BUTTON).attributes('disabled')).toBeDefined()
    expect(wrapper.get(UPLOAD_BUTTON).attributes('disabled')).toBeDefined()
  })

  test('should say how long an opened recording can be', () => {
    const wrapper = mountDisplay()

    expect(wrapper.text()).toContain(
      'Or open a recording of your singing, up to 5 minutes.',
    )
  })
})
