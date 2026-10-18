import { describe, expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'
import CircleOfFifthsSolfegeLadder from './CircleOfFifthsSolfegeLadder.vue'
import type { LadderHighlight } from './CircleOfFifthsSolfegeLadder.vue'

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })

const WALK_HIGHLIGHTS: LadderHighlight[] = [
  { solfege: 'DO', tone: 'major' },
  { solfege: 'SO', tone: 'major' },
]

const EXPLORE_HIGHLIGHTS: LadderHighlight[] = [
  { solfege: 'DO', tone: 'major' },
  { solfege: 'MI', tone: 'major' },
  { solfege: 'SO', tone: 'major' },
  { solfege: 'LA', tone: 'minor' },
]

function mountLadder(props = {}) {
  return mount(CircleOfFifthsSolfegeLadder, {
    props: {
      keyIndex: 0,
      startSolfege: 'DO' as const,
      highlights: WALK_HIGHLIGHTS,
      activeSolfege: null,
      ...props,
    },
    global: { plugins: [i18n] },
  })
}

const mountExploreLadder = (props = {}) =>
  mountLadder({
    startSolfege: 'LA',
    highlights: EXPLORE_HIGHLIGHTS,
    ...props,
  })

const stepsOf = (wrapper: ReturnType<typeof mountLadder>) =>
  wrapper.findAll('[data-testid="circle-solfege-step"]')

function stepsWhere(
  wrapper: ReturnType<typeof mountLadder>,
  attribute:
    | 'data-highlighted'
    | 'data-active'
    | 'data-chord-tone'
    | 'data-half-step-up',
) {
  return stepsOf(wrapper)
    .map((step, index) => ({ step, index }))
    .filter(({ step }) => step.attributes(attribute) === 'true')
    .map(({ step, index }) => `${index}:${step.attributes('data-solfege')}`)
}

const notesOf = (wrapper: ReturnType<typeof mountLadder>) =>
  wrapper
    .findAll('[data-testid="circle-solfege-note"]')
    .map((note) => note.text())

describe('CircleOfFifthsSolfegeLadder - walk', () => {
  test('should list the scale syllables from DO up to DO', () => {
    const solfege = stepsOf(mountLadder()).map((step) =>
      step.attributes('data-solfege'),
    )

    expect(solfege).toEqual(['DO', 'RE', 'MI', 'FA', 'SO', 'LA', 'TI', 'DO'])
  })

  test('should highlight the bottom DO and SO for a walk in fifths', () => {
    expect(stepsWhere(mountLadder(), 'data-highlighted')).toEqual([
      '0:DO',
      '4:SO',
    ])
  })

  test('should mark SO TI RE FA when a dominant 7th rings going fourths', () => {
    const wrapper = mountLadder({ chordSemitones: [7, 11, 2, 5] })

    expect(stepsWhere(wrapper, 'data-chord-tone')).toEqual([
      '1:RE',
      '3:FA',
      '4:SO',
      '6:TI',
    ])
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

    expect(ladder.attributes('aria-label')).toBe('G major')
    expect(notesOf(wrapper)).toEqual(['G', 'A', 'B', 'C', 'D', 'E', 'F♯', 'G'])
  })
})

describe('CircleOfFifthsSolfegeLadder - explore', () => {
  test('should start on the LA below DO and name the key notes', () => {
    const wrapper = mountExploreLadder()
    const solfege = stepsOf(wrapper).map((step) =>
      step.attributes('data-solfege'),
    )

    expect(solfege).toEqual(['LA', 'TI', 'DO', 'RE', 'MI', 'FA', 'SO', 'LA'])
    expect(notesOf(wrapper)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'A'])
    expect(notesOf(mountExploreLadder({ keyIndex: 1 }))).toEqual([
      'E',
      'F♯',
      'G',
      'A',
      'B',
      'C',
      'D',
      'E',
    ])
  })

  test('should keep the chord dots and half steps on the same syllables', () => {
    const wrapper = mountExploreLadder()

    expect(stepsWhere(wrapper, 'data-chord-tone')).toEqual([
      '2:DO',
      '4:MI',
      '6:SO',
    ])
    expect(stepsWhere(wrapper, 'data-half-step-up')).toEqual(['2:DO', '5:FA'])
  })

  test('should highlight DO MI SO as major and the low LA as minor', () => {
    const wrapper = mountExploreLadder()
    const tones = stepsOf(wrapper).map((step) => step.attributes('data-tone'))

    expect(stepsWhere(wrapper, 'data-highlighted')).toEqual([
      '0:LA',
      '2:DO',
      '4:MI',
      '6:SO',
    ])
    expect(tones[0]).toBe('minor')
    expect(tones[2]).toBe('major')
    expect(tones[7]).toBeUndefined()
  })

  test('should land the sung syllable on the lowest chip with its name', () => {
    expect(
      stepsWhere(mountExploreLadder({ activeSolfege: 'LA' }), 'data-active'),
    ).toEqual(['0:LA'])
    expect(
      stepsWhere(mountExploreLadder({ activeSolfege: 'DO' }), 'data-active'),
    ).toEqual(['2:DO'])
  })
})
