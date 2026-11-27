import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { createI18n } from 'vue-i18n'
import {
  deleteSavedPitchTake,
  loadPitchTake,
  savePitchTake,
} from '@/components/pitch-detector/pitchTakePersistence'
import en from '@/locales/en.json'
import { midiToFrequency, midiToNoteLabel } from '@/utils/noteUtils'
import PitchDisplay from './PitchDisplay.vue'
import type { PitchTake } from './pitchLaneRecorder'
import type { PitchLaneDetection, PitchLaneId } from './pitchLanes'

vi.mock('@/components/pitch-detector/pitchTakePersistence', () => ({
  savePitchTake: vi.fn(),
  loadPitchTake: vi.fn(),
  deleteSavedPitchTake: vi.fn(),
}))

function createTestI18n() {
  return createI18n({ legacy: false, locale: 'en', messages: { en } })
}

/* A clean reading for one voice, the shape PitchDetectorDisplay hands over. */
function laneDetection(laneId: PitchLaneId, midi: number): PitchLaneDetection {
  const info = midiToNoteLabel(midi)

  return {
    laneId,
    noteInfo: {
      note: info.note,
      octave: info.octave,
      cents: 0,
      midiNote: midi,
      frequency: midiToFrequency(midi),
    },
    frequency: midiToFrequency(midi),
    clarity: 0.9,
    isClean: true,
  }
}

function mountDisplay(laneDetections: PitchLaneDetection[]) {
  return mount(PitchDisplay, {
    global: { plugins: [createTestI18n()] },
    props: { laneDetections, isListening: false },
  })
}

const C4 = 60
const G5 = 79

/* The note each readout names, in lane order. Read from the readout itself:
 * the rest of the display prints its own letters and digits ("Clarity",
 * "784 Hz"). */
function noteReadouts(wrapper: ReturnType<typeof mountDisplay>) {
  return wrapper
    .findAll('[data-testid="note-readout"]')
    .map((readout) => readout.text())
}

/* A mounted display listens on window and runs a timer until it is unmounted,
 * so none may outlive its test. */
enableAutoUnmount(afterEach)

/* The display reads two module-level useLocalStorage refs, which
 * localStorage.clear() does not reach, so each goes back to its new-singer
 * default through its own setter: ribbon shown, and light mode (happy-dom
 * reports no dark preference). */
const { isVoiceTypeRibbonVisible } = useVoiceTypeRibbon()
const { isDark, toggleDark } = useDarkMode()

beforeEach(() => {
  isVoiceTypeRibbonVisible.value = true
  if (isDark.value) toggleDark()

  localStorage.clear()
  setActivePinia(createPinia())
})

describe('PitchDisplay', () => {
  test('should show one unlabelled readout for a single voice', () => {
    const wrapper = mountDisplay([laneDetection('low', C4)])

    expect(noteReadouts(wrapper)).toEqual(['C4'])
    /* One voice needs no column heading — there is nothing to tell apart. */
    expect(wrapper.text()).not.toContain('Low voice')
    expect(wrapper.text()).not.toContain('High voice')
  })

  test('should show both voices, each named, in duet mode', () => {
    const wrapper = mountDisplay([
      laneDetection('low', C4),
      laneDetection('high', G5),
    ])

    expect(wrapper.text()).toContain('Low voice')
    expect(wrapper.text()).toContain('High voice')
    expect(noteReadouts(wrapper)).toEqual(['C4', 'G5'])
  })
})

describe('PitchDisplay recording persistence', () => {
  /* 1.5 s from the first sample to the last, shown as the recording's length. */
  const createTake = (): PitchTake => ({
    lanes: {
      low: {
        samples: [
          { midiNote: C4, timestamp: 1000, isClean: true, cents: 0 },
          { midiNote: C4, timestamp: 2500, isClean: true, cents: 0 },
        ],
        noteMarkers: [],
      },
      high: { samples: [], noteMarkers: [] },
    },
    stoppedAtMs: 2600,
  })

  function mountPersisted(persistTake = true) {
    return mount(PitchDisplay, {
      global: { plugins: [createTestI18n()] },
      props: {
        laneDetections: [laneDetection('low', C4)],
        isListening: false,
        persistTake,
      },
    })
  }

  beforeEach(() => {
    vi.mocked(savePitchTake).mockReset().mockResolvedValue()
    vi.mocked(deleteSavedPitchTake).mockReset().mockResolvedValue()
    vi.mocked(loadPitchTake).mockReset().mockResolvedValue(null)
  })

  test('should show a saved take with its controls after a reload', async () => {
    vi.mocked(loadPitchTake).mockResolvedValue(createTake())

    const wrapper = mountPersisted()
    await flushPromises()

    expect(wrapper.find('[data-testid="btn-replay-sound"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="btn-clear-recording"]').exists()).toBe(
      true,
    )
    expect(wrapper.find('[data-testid="pitch-timer"]').text()).toContain('1.5s')
  })

  test('should delete the saved take when Clear is pressed', async () => {
    vi.mocked(loadPitchTake).mockResolvedValue(createTake())

    const wrapper = mountPersisted()
    await flushPromises()
    await wrapper.find('[data-testid="btn-clear-recording"]').trigger('click')

    expect(deleteSavedPitchTake).toHaveBeenCalledOnce()
    expect(wrapper.find('[data-testid="btn-clear-recording"]').exists()).toBe(
      false,
    )
  })

  test('should delete the saved take when a new recording starts', async () => {
    vi.mocked(loadPitchTake).mockResolvedValue(createTake())

    const wrapper = mountPersisted()
    await flushPromises()
    await wrapper.setProps({ isListening: true })

    expect(deleteSavedPitchTake).toHaveBeenCalledOnce()
    expect(wrapper.find('[data-testid="btn-replay-sound"]').exists()).toBe(
      false,
    )
  })

  test('should save the take when recording stops', async () => {
    const wrapper = mountPersisted()
    await flushPromises()

    await wrapper.setProps({ isListening: true })
    await wrapper.setProps({
      laneDetections: [laneDetection('low', C4)],
    })
    await wrapper.setProps({ isListening: false })
    await nextTick()

    expect(savePitchTake).toHaveBeenCalledOnce()
    const saved = vi.mocked(savePitchTake).mock.calls[0][0]
    expect(saved.lanes.low.samples).toHaveLength(1)
  })

  test('should save nothing when a recording caught no pitch', async () => {
    const wrapper = mountPersisted()
    await flushPromises()

    await wrapper.setProps({ isListening: true })
    await wrapper.setProps({ isListening: false })
    await nextTick()

    expect(savePitchTake).not.toHaveBeenCalled()
  })

  test('should save a recording still running when the page reloads', async () => {
    const wrapper = mountPersisted()
    await flushPromises()

    await wrapper.setProps({ isListening: true })
    await wrapper.setProps({ laneDetections: [laneDetection('low', C4)] })
    window.dispatchEvent(new Event('pagehide'))

    expect(savePitchTake).toHaveBeenCalledOnce()
  })

  test('should save a recording still running when leaving the page', async () => {
    const wrapper = mountPersisted()
    await flushPromises()

    await wrapper.setProps({ isListening: true })
    await wrapper.setProps({ laneDetections: [laneDetection('low', C4)] })
    wrapper.unmount()

    expect(savePitchTake).toHaveBeenCalledOnce()
  })

  test('should leave storage alone without persistTake', async () => {
    const wrapper = mountPersisted(false)
    await flushPromises()

    await wrapper.setProps({ isListening: true })
    await wrapper.setProps({ laneDetections: [laneDetection('low', C4)] })
    await wrapper.setProps({ isListening: false })
    await nextTick()

    expect(loadPitchTake).not.toHaveBeenCalled()
    expect(savePitchTake).not.toHaveBeenCalled()
    expect(deleteSavedPitchTake).not.toHaveBeenCalled()
  })
})
