import { describe, expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'
import { midiToFrequency, midiToNoteLabel } from '@/utils/noteUtils'
import PitchDisplay from './PitchDisplay.vue'
import type { PitchLaneDetection, PitchLaneId } from './pitchLanes'

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

describe('PitchDisplay', () => {
  test('should render without errors', () => {
    expect(mountDisplay([]).exists()).toBe(true)
  })

  test('shows one unlabelled readout for a single voice', () => {
    const wrapper = mountDisplay([laneDetection('low', C4)])

    expect(wrapper.text()).toContain('C')
    /* One voice needs no column heading — there is nothing to tell apart. */
    expect(wrapper.text()).not.toContain('Low voice')
    expect(wrapper.text()).not.toContain('High voice')
  })

  test('shows both voices, each named, in duet mode', () => {
    const wrapper = mountDisplay([
      laneDetection('low', C4),
      laneDetection('high', G5),
    ])

    expect(wrapper.text()).toContain('Low voice')
    expect(wrapper.text()).toContain('High voice')
    /* The octave digits are what separate C4 from G5 in the rendered text. */
    expect(wrapper.text()).toContain('4')
    expect(wrapper.text()).toContain('5')
  })
})
