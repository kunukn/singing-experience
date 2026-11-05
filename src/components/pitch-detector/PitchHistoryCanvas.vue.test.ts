import { afterEach, describe, expect, test, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createI18n } from 'vue-i18n'
import { midiToFrequency, midiToNoteLabel } from '@/utils/noteUtils'
import type { NoteInfo } from '@/utils/noteUtils'
import PitchHistoryCanvas from './PitchHistoryCanvas.vue'
import { HISTORY_RETENTION_MS } from './pitchConstants'
import type { PitchLaneDetection, PitchLaneId } from './pitchLanes'

function noteAt(midi: number): NoteInfo {
  const info = midiToNoteLabel(midi)

  return {
    note: info.note,
    octave: info.octave,
    cents: 0,
    midiNote: midi,
    frequency: midiToFrequency(midi),
  }
}

function singing(laneId: PitchLaneId, midi: number): PitchLaneDetection {
  return {
    laneId,
    noteInfo: noteAt(midi),
    isClean: true,
  } as PitchLaneDetection
}

function silent(laneId: PitchLaneId): PitchLaneDetection {
  return { laneId, noteInfo: null, isClean: false } as PitchLaneDetection
}

async function mountListening() {
  const wrapper = mount(PitchHistoryCanvas, {
    props: {
      laneDetections: [],
      previewLanes: [],
      isListening: false,
      midiMin: 48,
      midiMax: 72,
      gridMidis: [],
    },
    global: {
      plugins: [createI18n({ legacy: false, locale: 'en', messages: {} })],
    },
  })
  await wrapper.setProps({ isListening: true })

  return wrapper
}

async function sendFrame(
  wrapper: Awaited<ReturnType<typeof mountListening>>,
  laneDetections: PitchLaneDetection[],
  nowMs: number,
) {
  vi.spyOn(performance, 'now').mockReturnValue(nowMs)
  await wrapper.setProps({ laneDetections })
  await nextTick()
}

describe('PitchHistoryCanvas - history retention', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('should drop a quiet voice once its samples leave the retention window', async () => {
    const wrapper = await mountListening()

    await sendFrame(wrapper, [singing('low', 48), singing('high', 72)], 1000)
    await sendFrame(
      wrapper,
      [silent('low'), singing('high', 72)],
      1000 + HISTORY_RETENTION_MS + 1,
    )

    const lanes = wrapper.vm.getSamples()
    expect(lanes.low).toHaveLength(0)
    expect(lanes.high).toHaveLength(1)

    wrapper.unmount()
  })

  test('should keep a quiet voice while its samples are inside the retention window', async () => {
    const wrapper = await mountListening()

    await sendFrame(wrapper, [singing('low', 48), singing('high', 72)], 1000)
    await sendFrame(
      wrapper,
      [silent('low'), singing('high', 72)],
      1000 + HISTORY_RETENTION_MS,
    )

    expect(wrapper.vm.getSamples().low).toHaveLength(1)

    wrapper.unmount()
  })

  test('should keep the take through silence when no voice is singing', async () => {
    const wrapper = await mountListening()

    await sendFrame(wrapper, [singing('low', 48)], 1000)
    await sendFrame(wrapper, [silent('low')], 1000 + HISTORY_RETENTION_MS * 2)

    expect(wrapper.vm.getSamples().low).toHaveLength(1)

    wrapper.unmount()
  })
})
