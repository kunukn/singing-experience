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

  test('should apply highlighted state when isHighlighted is true', () => {
    const wrapper = mountItem({ isHighlighted: true })
    expect(wrapper.attributes('data-highlighted')).toBe('true')
  })

  test('should set progress bar width based on holdProgress for current step', () => {
    const wrapper = mountItem({ status: 'current', holdProgress: 0.5 })
    expect(
      wrapper.get('[data-testid="progress-bar"]').attributes('style'),
    ).toContain('width: 50%')
  })

  test('should set progress bar to 100% for completed step', () => {
    const wrapper = mountItem({ status: 'completed' })
    expect(
      wrapper.get('[data-testid="progress-bar"]').attributes('style'),
    ).toContain('width: 100%')
  })

  test('should report completed status via data attribute', () => {
    const wrapper = mountItem({ status: 'completed' })
    expect(wrapper.attributes('data-status')).toBe('completed')
  })

  test('should show dash for solfège label when excluded', () => {
    const wrapper = mountItem({ excluded: true })
    expect(wrapper.get('button').text()).toBe('–')
  })

  test('should report excluded state via data attribute', () => {
    const wrapper = mountItem({ excluded: true })
    expect(wrapper.attributes('data-included')).toBe('false')
  })

  test('should show empty circle status when excluded', () => {
    const wrapper = mountItem({ excluded: true, status: 'completed' })
    const statusIcon = wrapper.get('[data-testid="status-icon"]')
    expect(statusIcon.text()).toBe('○')
  })

  test('should still emit click when excluded', async () => {
    const wrapper = mountItem({ excluded: true })
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  test('should have 0% progress bar when excluded', () => {
    const wrapper = mountItem({ excluded: true, status: 'completed' })
    expect(
      wrapper.get('[data-testid="progress-bar"]').attributes('style'),
    ).toContain('width: 0%')
  })
})
