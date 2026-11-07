import { beforeEach, describe, expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { useVoiceTakeStore } from '@/stores/useVoiceTakeStore'
import type { RecorderStatus, Take } from './useVoiceRecorder'
import VoiceRecorderDisplay from './VoiceRecorderDisplay.vue'
import VoiceRecorderPage from './VoiceRecorderPage.vue'

const mocks = vi.hoisted(() => ({
  isGameActive: null as unknown,
  start: vi.fn(),
  status: null as unknown,
  createUploadedTake: vi.fn(),
}))

vi.mock('@/composables/useIdlePreview', () => ({
  useIdlePreview: (options: { isGameActive: unknown }) => {
    mocks.isGameActive = options.isGameActive

    return {
      previewFrequency: computed(() => 155.56),
      previewMidi: computed(() => 51),
    }
  },
}))

vi.mock('./uploadedTake', () => ({
  createUploadedTake: mocks.createUploadedTake,
}))

vi.mock('./useVoiceRecorder', () => ({
  useVoiceRecorder: () => ({
    status: (mocks.status = ref<RecorderStatus>('idle')),
    elapsedMs: ref(0),
    errorKey: ref(null),
    liveStream: ref(null),
    start: mocks.start,
    stop: vi.fn(),
  }),
}))

vi.mock('./takePersistence', () => ({
  loadTake: vi.fn(async () => null),
  saveTake: vi.fn(async () => {}),
  deleteSavedTake: vi.fn(async () => {}),
}))

const TAKE: Take = {
  blob: new Blob(['take'], { type: 'audio/webm' }),
  mimeType: 'audio/webm',
  recordedAt: new Date(0),
  stopReason: 'user',
  hasAutoGain: false,
  source: 'recorded',
}

function isGameActive() {
  return (mocks.isGameActive as ComputedRef<boolean>).value
}

function mountPage() {
  return mount(VoiceRecorderPage, {
    global: { stubs: { VoiceRecorderDisplay: true } },
  })
}

describe('VoiceRecorderPage preview', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mocks.start.mockReset()
  })

  test('should keep the mic closed until a saved take could have loaded', async () => {
    mountPage()

    expect(isGameActive()).toBe(true)

    await flushPromises()

    expect(isGameActive()).toBe(false)
  })

  test('should keep the mic closed while a take is shown', async () => {
    mountPage()
    await flushPromises()

    useVoiceTakeStore().setTake(TAKE)

    expect(isGameActive()).toBe(true)
  })

  test('should close the preview before the recorder opens its mic', async () => {
    let wasPreviewClosedAtStart = false
    mocks.start.mockImplementation(async () => {
      wasPreviewClosedAtStart = isGameActive()
    })
    const wrapper = mountPage()
    await flushPromises()

    wrapper.getComponent(VoiceRecorderDisplay).vm.$emit('record')
    await flushPromises()

    expect(mocks.start).toHaveBeenCalledOnce()
    expect(wasPreviewClosedAtStart).toBe(true)
  })

  test('should bring the preview back when recording fails to start', async () => {
    mocks.start.mockResolvedValue(undefined)
    const wrapper = mountPage()
    await flushPromises()

    wrapper.getComponent(VoiceRecorderDisplay).vm.$emit('record')
    await flushPromises()

    expect(isGameActive()).toBe(false)
  })
})

describe('VoiceRecorderPage - opening a file', () => {
  const UPLOADED: Take = {
    ...TAKE,
    recordedAt: new Date(1),
    source: 'uploaded',
  }
  const file = new File(['song'], 'song.mp3', { type: 'audio/mpeg' })

  beforeEach(() => {
    setActivePinia(createPinia())
    mocks.createUploadedTake.mockReset()
  })

  async function openFile() {
    const wrapper = mountPage()
    await flushPromises()

    wrapper.getComponent(VoiceRecorderDisplay).vm.$emit('upload', file)
    await flushPromises()

    return wrapper
  }

  test('should show an opened file as the take', async () => {
    mocks.createUploadedTake.mockResolvedValue({ take: UPLOADED })

    await openFile()

    expect(mocks.createUploadedTake).toHaveBeenCalledWith(file)
    expect(useVoiceTakeStore().take).toEqual(UPLOADED)
  })

  test('should keep the current take when the file cannot be used', async () => {
    mocks.createUploadedTake.mockResolvedValue({
      errorKey: 'voiceRecorder.upload.tooLong',
    })
    useVoiceTakeStore().setTake(TAKE)

    const wrapper = await openFile()

    expect(useVoiceTakeStore().take).toEqual(TAKE)
    expect(wrapper.getComponent(VoiceRecorderDisplay).props('errorKey')).toBe(
      'voiceRecorder.upload.tooLong',
    )
  })

  test('should clear the file error when recording starts', async () => {
    mocks.createUploadedTake.mockResolvedValue({
      errorKey: 'voiceRecorder.upload.notAudio',
    })
    const wrapper = await openFile()

    wrapper.getComponent(VoiceRecorderDisplay).vm.$emit('record')
    await flushPromises()

    expect(
      wrapper.getComponent(VoiceRecorderDisplay).props('errorKey'),
    ).toBeNull()
  })

  test('should not replace a recording started while the file was checked', async () => {
    mocks.createUploadedTake.mockImplementation(async () => {
      ;(mocks.status as Ref<RecorderStatus>).value = 'recording'

      return { take: UPLOADED }
    })

    await openFile()

    expect(useVoiceTakeStore().take).toBeNull()
  })
})
