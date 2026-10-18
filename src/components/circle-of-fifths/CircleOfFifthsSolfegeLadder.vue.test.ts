import { describe, expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'
import CircleOfFifthsSolfegeLadder from './CircleOfFifthsSolfegeLadder.vue'

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })

function mountLadder(props = {}) {
  return mount(CircleOfFifthsSolfegeLadder, {
    props: {
      keyIndex: 0,
      hopSolfege: 'SO' as const,
      activeSolfege: null,
      ...props,
    },
    global: { plugins: [i18n] },
  })
}

function stepsWhere(
  wrapper: ReturnType<typeof mountLadder>,
  attribute:
    | 'data-highlighted'
    | 'data-active'
    | 'data-chord-tone'
    | 'data-half-step-up',
) {
  return wrapper
    .findAll('[data-testid="circle-solfege-step"]')
    .map((step, index) => ({ step, index }))
    .filter(({ step }) => step.attributes(attribute) === 'true')
    .map(({ step, index }) => `${index}:${step.attributes('data-solfege')}`)
}

describe('CircleOfFifthsSolfegeLadder', () => {
  test('should list the scale syllables from DO up to DO', () => {
    const solfege = mountLadder()
      .findAll('[data-testid="circle-solfege-step"]')
      .map((step) => step.attributes('data-solfege'))

    expect(solfege).toEqual(['DO', 'RE', 'MI', 'FA', 'SO', 'LA', 'TI', 'DO'])
  })

  test('should highlight the bottom DO and SO for a walk in fifths', () => {
    expect(stepsWhere(mountLadder(), 'data-highlighted')).toEqual([
      '0:DO',
      '4:SO',
    ])
  })

  test('should highlight the bottom DO and FA for a walk in fourths', () => {
    const wrapper = mountLadder({ hopSolfege: 'FA' })

    expect(stepsWhere(wrapper, 'data-highlighted')).toEqual(['0:DO', '3:FA'])
  })

  test('should mark only the syllable being sung as active', () => {
    expect(
      stepsWhere(mountLadder({ activeSolfege: 'DO' }), 'data-active'),
    ).toEqual(['0:DO'])
    expect(
      stepsWhere(mountLadder({ activeSolfege: 'SO' }), 'data-active'),
    ).toEqual(['4:SO'])
    expect(stepsWhere(mountLadder(), 'data-active')).toEqual([])
  })

  test('should mark DO, MI and SO as the notes of the chord', () => {
    expect(stepsWhere(mountLadder(), 'data-chord-tone')).toEqual([
      '0:DO',
      '2:MI',
      '4:SO',
    ])
  })

  test('should mark the half steps up to FA and the top DO', () => {
    expect(stepsWhere(mountLadder(), 'data-half-step-up')).toEqual([
      '3:FA',
      '7:DO',
    ])
  })

  test('should name the notes of the key under the syllables', () => {
    const wrapper = mountLadder({ keyIndex: 1 })
    const ladder = wrapper.get('[data-testid="circle-solfege-ladder"]')

    const notes = wrapper
      .findAll('[data-testid="circle-solfege-note"]')
      .map((note) => note.text())

    expect(ladder.attributes('aria-label')).toBe('G major')
    expect(notes).toEqual(['G', 'A', 'B', 'C', 'D', 'E', 'F♯', 'G'])
  })
})
