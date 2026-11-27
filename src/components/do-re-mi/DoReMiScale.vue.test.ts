import { beforeEach, describe, expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'
import DoReMiScale from './DoReMiScale.vue'
import { buildMajorScale, C3_MIDI, noteToFrequency } from '@/utils/noteUtils'

function createTestI18n() {
  return createI18n({ legacy: false, locale: 'en', messages: { en } })
}

/* The preview colours read the theme from localStorage. */
beforeEach(() => {
  localStorage.clear()
})

describe('DoReMiScale', () => {
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

  /* The label is drawn for an out-of-range preview today, although the comment
   * on previewIndicator in DoReMiScale.vue says it is suppressed. These two
   * tests pin what the singer sees now; see the owner flag on that comment. */
  test('should clamp a below-range preview past the bottom of the root item and keep its label', () => {
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

    /* The only indicator sits in the root item (C3), below its bottom edge */
    expect(wrapper.findAll('[data-testid="preview-indicator"]')).toHaveLength(1)

    const indicator = wrapper
      .get('[data-testid="scale-step-0"]')
      .get('[data-testid="preview-indicator"]')
    expect(indicator.attributes('data-out-of-range')).toBe('true')
    expect(indicator.attributes('style')).toMatch(
      /top:\s*calc\(100% \+ \d+px\)/,
    )
    expect(indicator.get('[data-testid="preview-label"]').text()).toBe('A#2')
  })

  test('should clamp an above-range preview past the top of the highest item and keep its label', () => {
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

    /* The only indicator sits in the highest item (C4), above its top edge */
    expect(wrapper.findAll('[data-testid="preview-indicator"]')).toHaveLength(1)

    const indicator = wrapper
      .get('[data-testid="scale-step-7"]')
      .get('[data-testid="preview-indicator"]')
    expect(indicator.attributes('data-out-of-range')).toBe('true')
    expect(indicator.attributes('style')).toMatch(/top:\s*-\d+px/)
    expect(indicator.get('[data-testid="preview-label"]').text()).toBe('D4')
  })

  test('should show the label in the item of an in-range previewMidi', () => {
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
    const fItem = wrapper.get('[data-testid="scale-step-3"]')
    expect(fItem.get('[data-testid="preview-label"]').text()).toBe('F3')
    expect(
      fItem
        .get('[data-testid="preview-indicator"]')
        .attributes('data-out-of-range'),
    ).toBe('false')
    expect(wrapper.findAll('[data-testid="preview-label"]')).toHaveLength(1)
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

    const indicator = rootItem.find('[data-testid="preview-indicator"]')
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
    const indicator = rootItem.find('[data-testid="preview-indicator"]')
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
    const indicator = rootItem.find('[data-testid="preview-indicator"]')
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
    const indicator = rootItem.find('[data-testid="preview-indicator"]')
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
    const indicator = rootItem.find('[data-testid="preview-indicator"]')
    expect(indicator.exists()).toBe(true)
    expect(indicator.attributes('style')).toContain('top: 50%')
  })
})
