import { describe, expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import DoReMiScaleItem from './DoReMiScaleItem.vue'

const defaultStep = { solfege: 'Do', note: 'C' as const, octave: 4 }

function mountItem(propsOverrides = {}) {
  return mount(DoReMiScaleItem, {
    props: {
      step: defaultStep,
      status: 'upcoming' as const,
      isComplete: false,
      isStarted: false,
      isHighlighted: false,
      holdProgress: 0,
      buttonTitle: 'Play Do',
      ...propsOverrides,
    },
  })
}

describe('DoReMiScaleItem', () => {
  test('should render solfège label and note name', () => {
    const wrapper = mountItem()
    expect(wrapper.get('button').text()).toBe('Do')
    expect(wrapper.text()).toContain('C4')
  })

  test('should emit click when solfège button is clicked', async () => {
    const wrapper = mountItem()
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  test('should show checkmark for completed status', () => {
    const wrapper = mountItem({ status: 'completed' })
    expect(wrapper.text()).toContain('✓')
  })

  test('should show checkmark when current and complete', () => {
    const wrapper = mountItem({ status: 'current', isComplete: true })
    expect(wrapper.text()).toContain('✓')
  })

  test('should show pulse indicator for current and started', () => {
    const wrapper = mountItem({ status: 'current', isStarted: true })
    expect(wrapper.text()).toContain('●')
  })

  test('should show empty circle for upcoming status', () => {
    const wrapper = mountItem({ status: 'upcoming' })
    expect(wrapper.text()).toContain('○')
  })

  test('should apply highlighted styling when isHighlighted is true', () => {
    const wrapper = mountItem({ isHighlighted: true })
    expect(wrapper.get('button').classes()).toContain('border-purple-500')
  })

  test('should set progress bar width based on holdProgress for current step', () => {
    const wrapper = mountItem({ status: 'current', holdProgress: 0.5 })
    const progressBar = wrapper
      .findAll('div')
      .find((el) => el.classes().includes('h-full'))
    expect(progressBar?.attributes('style')).toContain('width: 50%')
  })

  test('should set progress bar to 100% for completed step', () => {
    const wrapper = mountItem({ status: 'completed' })
    const progressBar = wrapper
      .findAll('div')
      .find((el) => el.classes().includes('h-full'))
    expect(progressBar?.attributes('style')).toContain('width: 100%')
  })

  test('should apply completed border styling', () => {
    const wrapper = mountItem({ status: 'completed' })
    expect(wrapper.classes()).toContain('border-green-700')
  })
})
