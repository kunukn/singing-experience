import { describe, expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'
import CircleOfFifthsWheel from './CircleOfFifthsWheel.vue'

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })

function mountWheel(props = {}) {
  return mount(CircleOfFifthsWheel, {
    props: { view: 'fifths' as const, ...props },
    global: { plugins: [i18n] },
  })
}

const keyAt = (wrapper: ReturnType<typeof mountWheel>, index: number) =>
  wrapper.get(`[data-testid="circle-key-${index}"]`)

describe('CircleOfFifthsWheel', () => {
  test('should render 12 keys with their accidental counts', () => {
    const wrapper = mountWheel()

    expect(wrapper.findAll('[data-testid^="circle-key-"]')).toHaveLength(12)
    expect(keyAt(wrapper, 2).text()).toContain('D')
    expect(keyAt(wrapper, 2).text()).toContain('2♯')
    expect(keyAt(wrapper, 6).text()).toContain('F♯/G♭')
    expect(wrapper.get('[data-testid="circle-minor-0"]').text()).toBe('Am')
  })

  test('should mark current, next and lit keys', () => {
    const wrapper = mountWheel({
      litKeyIndices: [0, 1],
      currentKeyIndex: 1,
      nextKeyIndex: 2,
    })

    expect(keyAt(wrapper, 0).attributes('data-status')).toBe('done')
    expect(keyAt(wrapper, 1).attributes('data-status')).toBe('current')
    expect(keyAt(wrapper, 2).attributes('data-status')).toBe('next')
    expect(keyAt(wrapper, 3).attributes('data-status')).toBe('idle')
  })

  test('should move odd keys half a turn in the chromatic view', async () => {
    const wrapper = mountWheel()
    expect(keyAt(wrapper, 1).attributes('data-angle')).toBe('30')

    await wrapper.setProps({ view: 'chromatic' })

    expect(keyAt(wrapper, 1).attributes('data-angle')).toBe('210')
    expect(keyAt(wrapper, 2).attributes('data-angle')).toBe('60')
  })

  test('should draw the walk as a star only in the chromatic view', async () => {
    const wrapper = mountWheel({ litKeyIndices: [0, 1, 2] })
    const star = () => wrapper.get('[data-testid="circle-star"]')
    expect(star().attributes('data-visible')).toBe('false')

    await wrapper.setProps({ view: 'chromatic' })

    expect(star().attributes('data-visible')).toBe('true')
  })

  test('should outline the key the singer is heard on', async () => {
    const wrapper = mountWheel({ heardKeyIndex: 1 })
    const outline = () => wrapper.get('[data-testid="circle-heard-outline"]')

    expect(keyAt(wrapper, 1).attributes('data-heard')).toBe('true')
    expect(keyAt(wrapper, 0).attributes('data-heard')).toBe('false')
    expect(outline().attributes('data-angle')).toBe('30')

    await wrapper.setProps({ view: 'chromatic' })

    expect(outline().attributes('data-angle')).toBe('210')
  })

  test('should not outline any key when nothing is heard', () => {
    const wrapper = mountWheel()

    expect(wrapper.find('[data-testid="circle-heard-outline"]').exists()).toBe(
      false,
    )
  })

  test('should emit the key index when a key is tapped', async () => {
    const wrapper = mountWheel({ isInteractive: true })

    await keyAt(wrapper, 3).get('button').trigger('click')

    expect(wrapper.emitted('select')).toEqual([[3]])
  })

  test('should not offer key buttons during a walk', () => {
    const wrapper = mountWheel({ isInteractive: false })

    expect(wrapper.find('button').exists()).toBe(false)
  })
})
