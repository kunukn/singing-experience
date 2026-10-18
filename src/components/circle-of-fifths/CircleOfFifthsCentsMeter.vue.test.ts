import { describe, expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import { OFF_CENTS } from '@/utils/pitchColors'
import CircleOfFifthsCentsMeter from './CircleOfFifthsCentsMeter.vue'

function indicatorTopOf(cents: number | null) {
  const wrapper = mount(CircleOfFifthsCentsMeter, { props: { cents } })

  return wrapper
    .get('[data-testid="circle-cents-meter-indicator"]')
    .attributes('style')
    ?.match(/top: ([\d.]+)%/)?.[1]
}

describe('CircleOfFifthsCentsMeter', () => {
  test.each([
    { cents: 0, expected: '50' },
    { cents: OFF_CENTS, expected: '0' },
    { cents: -OFF_CENTS, expected: '100' },
    { cents: -OFF_CENTS / 2, expected: '75' },
  ])(
    'should place $cents¢ at $expected% from the top',
    ({ cents, expected }) => {
      expect(indicatorTopOf(cents)).toBe(expected)
    },
  )

  test('should pin readings beyond OFF_CENTS to the ends', () => {
    expect(indicatorTopOf(OFF_CENTS * 2)).toBe('0')
    expect(indicatorTopOf(-OFF_CENTS * 2)).toBe('100')
  })

  test('should keep its space but hide without a pitch', () => {
    const wrapper = mount(CircleOfFifthsCentsMeter, { props: { cents: null } })

    expect(wrapper.attributes('data-visible')).toBe('false')
  })
})
