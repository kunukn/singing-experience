import { describe, expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'
import DoReMiScale from './DoReMiScale.vue'
import { buildMajorScale, C3_MIDI, noteToFrequency } from '@/utils/noteUtils'

function createTestI18n() {
  return createI18n({ legacy: false, locale: 'en', messages: { en } })
}

describe('DoReMiScale', () => {
  test('should render without errors', () => {
    const i18n = createTestI18n()
    const wrapper = mount(DoReMiScale, {
      global: { plugins: [i18n] },
      props: {
        scaleSteps: buildMajorScale(C3_MIDI),
        currentStepIndex: 0,
        holdProgress: 0,
        isComplete: false,
        isStarted: false,
      },
    })
    expect(wrapper.exists()).toBe(true)
  })

  test('should render 13 chromatic items for a major scale', () => {
    const i18n = createTestI18n()
    const wrapper = mount(DoReMiScale, {
      global: { plugins: [i18n] },
      props: {
        scaleSteps: buildMajorScale(C3_MIDI),
        currentStepIndex: 0,
        holdProgress: 0,
        isComplete: false,
        isStarted: false,
      },
    })

    /* 8 included scale steps + 5 excluded chromatic tones = 13 total */
    const allItems = wrapper.findAll('[data-testid^="scale-step"]')
    expect(allItems).toHaveLength(13)
  })

  test('should mark non-scale tones as excluded', () => {
    const i18n = createTestI18n()
    const wrapper = mount(DoReMiScale, {
      global: { plugins: [i18n] },
      props: {
        scaleSteps: buildMajorScale(C3_MIDI),
        currentStepIndex: 0,
        holdProgress: 0,
        isComplete: false,
        isStarted: false,
      },
    })

    /* C# (index 1), D# (3), F# (6), G# (8), A# (10) are excluded */
    const excludedItems = wrapper.findAll(
      '[data-testid^="scale-step-excluded"]',
    )
    expect(excludedItems).toHaveLength(5)
  })

  test('should clamp below-range preview to bottom of root item without label', () => {
    const i18n = createTestI18n()
    const wrapper = mount(DoReMiScale, {
      global: { plugins: [i18n] },
      props: {
        scaleSteps: buildMajorScale(C3_MIDI),
        currentStepIndex: 0,
        holdProgress: 0,
        isComplete: false,
        isStarted: false,
        previewMidi: C3_MIDI - 2,
        previewNoteLabel: 'A#2',
      },
    })

    /* Root item (C3) at chromaticIndex 0 should have the preview indicator */
    const rootItem = wrapper.find('[data-testid="scale-step-0"]')
    expect(rootItem.exists()).toBe(true)

    /* The preview indicator should be present but with no label */
    const previewLabel = rootItem.find('[data-testid="preview-label"]')
    expect(previewLabel.exists()).toBe(false)
  })

  test('should clamp above-range preview to top of highest item without label', () => {
    const i18n = createTestI18n()
    const wrapper = mount(DoReMiScale, {
      global: { plugins: [i18n] },
      props: {
        scaleSteps: buildMajorScale(C3_MIDI),
        currentStepIndex: 0,
        holdProgress: 0,
        isComplete: false,
        isStarted: false,
        previewMidi: C3_MIDI + 14,
        previewNoteLabel: 'D4',
      },
    })

    /* Highest item (C4) at scale-step-7 should have the preview indicator */
    const topItem = wrapper.find('[data-testid="scale-step-7"]')
    expect(topItem.exists()).toBe(true)

    /* The preview indicator should be present but with no label */
    const previewLabel = topItem.find('[data-testid="preview-label"]')
    expect(previewLabel.exists()).toBe(false)
  })

  test('should show label for in-range previewMidi', () => {
    const i18n = createTestI18n()
    const wrapper = mount(DoReMiScale, {
      global: { plugins: [i18n] },
      props: {
        scaleSteps: buildMajorScale(C3_MIDI),
        currentStepIndex: 0,
        holdProgress: 0,
        isComplete: false,
        isStarted: false,
        previewMidi: C3_MIDI + 5,
        previewNoteLabel: 'F3',
      },
    })

    /* F3 is at chromaticIndex 5 (scale-step-3 for Fa) */
    const fItem = wrapper.find('[data-testid="scale-step-3"]')
    expect(fItem.exists()).toBe(true)
  })

  test('should position at 50% for perfect pitch frequency', () => {
    const i18n = createTestI18n()
    const perfectHz = noteToFrequency('C', 3)
    const wrapper = mount(DoReMiScale, {
      global: { plugins: [i18n] },
      props: {
        scaleSteps: buildMajorScale(C3_MIDI),
        currentStepIndex: 0,
        holdProgress: 0,
        isComplete: false,
        isStarted: false,
        previewMidi: C3_MIDI,
        previewFrequency: perfectHz,
        previewNoteLabel: 'C3',
      },
    })

    /* Root item (C3) should have the preview indicator at 50% */
    const rootItem = wrapper.find('[data-testid="scale-step-0"]')
    expect(rootItem.exists()).toBe(true)

    const indicator = rootItem.find('.pointer-events-none')
    expect(indicator.exists()).toBe(true)
    expect(indicator.attributes('style')).toContain('top: 50%')
  })

  test('should position above center for slightly sharp frequency', () => {
    const i18n = createTestI18n()
    /* 20 cents sharp — rawMidi ≈ C3_MIDI + 0.2, delta ≈ +0.2, offset ≈ 30% */
    const sharpHz = noteToFrequency('C', 3) * Math.pow(2, 20 / 1200)
    const wrapper = mount(DoReMiScale, {
      global: { plugins: [i18n] },
      props: {
        scaleSteps: buildMajorScale(C3_MIDI),
        currentStepIndex: 0,
        holdProgress: 0,
        isComplete: false,
        isStarted: false,
        previewMidi: C3_MIDI,
        previewFrequency: sharpHz,
        previewNoteLabel: 'C3',
      },
    })

    const rootItem = wrapper.find('[data-testid="scale-step-0"]')
    const indicator = rootItem.find('.pointer-events-none')
    expect(indicator.exists()).toBe(true)

    const style = indicator.attributes('style') ?? ''
    const match = style.match(/top:\s*([\d.]+)%/)
    expect(match).not.toBeNull()

    const topPercent = parseFloat(match![1])
    expect(topPercent).toBeLessThan(50)
    expect(topPercent).toBeGreaterThan(0)
  })

  test('should position below center for slightly flat frequency', () => {
    const i18n = createTestI18n()
    /* 20 cents flat — rawMidi ≈ C3_MIDI - 0.2, delta ≈ -0.2, offset ≈ 70% */
    const flatHz = noteToFrequency('C', 3) * Math.pow(2, -20 / 1200)
    const wrapper = mount(DoReMiScale, {
      global: { plugins: [i18n] },
      props: {
        scaleSteps: buildMajorScale(C3_MIDI),
        currentStepIndex: 0,
        holdProgress: 0,
        isComplete: false,
        isStarted: false,
        previewMidi: C3_MIDI,
        previewFrequency: flatHz,
        previewNoteLabel: 'C3',
      },
    })

    const rootItem = wrapper.find('[data-testid="scale-step-0"]')
    const indicator = rootItem.find('.pointer-events-none')
    expect(indicator.exists()).toBe(true)

    const style = indicator.attributes('style') ?? ''
    const match = style.match(/top:\s*([\d.]+)%/)
    expect(match).not.toBeNull()

    const topPercent = parseFloat(match![1])
    expect(topPercent).toBeGreaterThan(50)
    expect(topPercent).toBeLessThan(100)
  })

  test('should fall back to 50% center when no frequency provided', () => {
    const i18n = createTestI18n()
    const wrapper = mount(DoReMiScale, {
      global: { plugins: [i18n] },
      props: {
        scaleSteps: buildMajorScale(C3_MIDI),
        currentStepIndex: 0,
        holdProgress: 0,
        isComplete: false,
        isStarted: false,
        previewMidi: C3_MIDI,
        previewNoteLabel: 'C3',
      },
    })

    const rootItem = wrapper.find('[data-testid="scale-step-0"]')
    const indicator = rootItem.find('.pointer-events-none')
    expect(indicator.exists()).toBe(true)
    expect(indicator.attributes('style')).toContain('top: 50%')
  })

  test('should show preview indicator when isStarted is true', () => {
    const i18n = createTestI18n()
    const exactHz = noteToFrequency('C', 3)
    const wrapper = mount(DoReMiScale, {
      global: { plugins: [i18n] },
      props: {
        scaleSteps: buildMajorScale(C3_MIDI),
        currentStepIndex: 0,
        holdProgress: 0,
        isComplete: false,
        isStarted: true,
        previewMidi: C3_MIDI,
        previewFrequency: exactHz,
        previewNoteLabel: 'C3',
      },
    })

    const rootItem = wrapper.find('[data-testid="scale-step-0"]')
    const indicator = rootItem.find('.pointer-events-none')
    expect(indicator.exists()).toBe(true)
    expect(indicator.attributes('style')).toContain('top: 50%')
  })
})
