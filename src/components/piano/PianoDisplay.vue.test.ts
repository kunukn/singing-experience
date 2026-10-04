import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'
import PianoDisplay from './PianoDisplay.vue'
import {
  MIN_SEMITONE_UNIT_POINTER,
  buildPianoLayout,
  pianoNoteBlockSpan,
} from './pianoLayout'

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })

/* A key press plays a tone; keep the real player but silence its audio calls,
 * which need a Web Audio context happy-dom doesn't have. */
vi.mock('@/composables/useTonePlayer', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/composables/useTonePlayer')>()

  return {
    useTonePlayer: () => ({
      ...actual.useTonePlayer(),
      warmUp: vi.fn().mockResolvedValue(undefined),
      playToneAt: vi.fn(),
      getImmediate: () => 0,
    }),
  }
})

function pxOf(style: string | undefined, property: string): number {
  const match = new RegExp(`${property}:\\s*(-?[\\d.]+)px`).exec(style ?? '')

  return Number(match?.[1])
}

/* C4–G4 — a short board; enough keys to tell the target from its neighbours. */
const RANGE = { midiMin: 60, midiMax: 67 }

/* The board the display draws for RANGE here: happy-dom never measures the
 * container and reports a fine pointer, so the keys sit at that floor.
 * Expected positions are read from this layout rather than written out in px,
 * so they follow the floor and the key proportions if either changes. */
const LAYOUT = buildPianoLayout(
  RANGE.midiMin,
  RANGE.midiMax,
  MIN_SEMITONE_UNIT_POINTER,
)
const E4 = 64
const F4 = 65
const E4_BLOCK = pianoNoteBlockSpan(LAYOUT, E4)
/* px — where the E4 and F4 key faces meet. */
const E_F_EDGE = LAYOUT.whites.find((key) => key.midi === F4)!.leftPx

function mountDisplay(
  props: Partial<InstanceType<typeof PianoDisplay>['$props']> = {},
  slots: Record<string, string> = {},
) {
  return mount(PianoDisplay, {
    props: { ...RANGE, ...props },
    slots,
    global: { plugins: [createPinia(), i18n] },
  })
}

describe('PianoDisplay - lane slot', () => {
  test('should render nothing extra when no lane slot is given', () => {
    const wrapper = mountDisplay()

    expect(wrapper.find('[data-testid="lane-probe"]').exists()).toBe(false)
  })

  test('should hand the key layout to the lane slot', () => {
    const wrapper = mountDisplay(
      {},
      {
        lane: `<template #lane="{ layout }">
          <div data-testid="lane-probe" :data-midi-min="layout.midiMin" :data-key-count="layout.whites.length + layout.blacks.length" />
        </template>`,
      },
    )
    const probe = wrapper.get('[data-testid="lane-probe"]')

    expect(probe.attributes('data-midi-min')).toBe('60')
    /* C4 D4 E4 F4 G4 + C♯4 D♯4 F♯4 */
    expect(probe.attributes('data-key-count')).toBe('8')
  })
})

describe('PianoDisplay - target key', () => {
  test('should mark no key by default', () => {
    const wrapper = mountDisplay()

    expect(wrapper.findAll('[data-target]')).toHaveLength(0)
  })

  test('should mark only the target key as active', () => {
    const wrapper = mountDisplay({ targetMidi: 63 })

    const marked = wrapper.findAll('[data-target]')
    expect(marked).toHaveLength(1)
    expect(marked[0].attributes('data-testid')).toBe('piano-key-63')
    expect(marked[0].attributes('data-target')).toBe('active')
  })

  test('should mark the target key as correct once it is hit', () => {
    const wrapper = mountDisplay({ targetMidi: 64, isTargetCorrect: true })

    expect(
      wrapper.get('[data-testid="piano-key-64"]').attributes('data-target'),
    ).toBe('correct')
  })

  /* The block is centred on E4's pitch, not on its key face, so it runs past
   * the key's right edge. */
  test('should wash a white target in the falling block shape', () => {
    const wrapper = mountDisplay({ targetMidi: E4 })

    const style = wrapper
      .get('[data-testid="piano-target-wash"]')
      .attributes('style')
    expect(pxOf(style, 'inset-inline-start')).toBeCloseTo(E4_BLOCK.leftPx, 5)
    expect(pxOf(style, 'width')).toBeCloseTo(E4_BLOCK.widthPx, 5)
    expect(E4_BLOCK.leftPx + E4_BLOCK.widthPx).toBeGreaterThan(E_F_EDGE)
  })

  /* Same E4 block as the target wash above — the full block, overhang past
   * the E key's right edge included. */
  test("should shape a white key's press glow like the block when asked", async () => {
    const wrapper = mountDisplay({ isPressGlowBlockShaped: true })

    await wrapper.get('[data-testid="piano-key-64"]').trigger('pointerdown')

    const style = wrapper
      .get('[data-testid="piano-key-glow"][data-midi="64"]')
      .attributes('style')
    expect(pxOf(style, 'inset-inline-start')).toBeCloseTo(E4_BLOCK.leftPx, 5)
    expect(pxOf(style, 'width')).toBeCloseTo(E4_BLOCK.widthPx, 5)
  })

  /* E4 and F4 blocks overhang their shared edge by the same amount, so the
   * two glows mirror each other around it. */
  test('should overhang the E/F edge equally from both sides', async () => {
    const wrapper = mountDisplay({ isPressGlowBlockShaped: true })

    await wrapper.get('[data-testid="piano-key-64"]').trigger('pointerdown')
    await wrapper.get('[data-testid="piano-key-65"]').trigger('pointerdown')

    const eStyle = wrapper
      .get('[data-testid="piano-key-glow"][data-midi="64"]')
      .attributes('style')
    const fStyle = wrapper
      .get('[data-testid="piano-key-glow"][data-midi="65"]')
      .attributes('style')
    const eOverhang =
      pxOf(eStyle, 'inset-inline-start') + pxOf(eStyle, 'width') - E_F_EDGE
    const fOverhang = E_F_EDGE - pxOf(fStyle, 'inset-inline-start')
    expect(eOverhang).toBeGreaterThan(0)
    expect(eOverhang).toBeCloseTo(fOverhang, 5)
  })

  test('should glow across the whole white key by default', async () => {
    const wrapper = mountDisplay()

    await wrapper.get('[data-testid="piano-key-64"]').trigger('pointerdown')

    expect(
      wrapper
        .get('[data-testid="piano-key-glow"][data-midi="64"]')
        .attributes('style'),
    ).toBeUndefined()
  })

  /* A black key already is the block's shape, so its wash stays on the key. */
  test('should draw no separate wash for a black target', () => {
    const wrapper = mountDisplay({ targetMidi: 63 })

    expect(wrapper.find('[data-testid="piano-target-wash"]').exists()).toBe(
      false,
    )
  })
})

/* A2–C4, the board Sing the Keys draws for Row, Row, Row Your Boat: 17 semitone
 * units wide. */
const WIDE_RANGE = { midiMin: 45, midiMax: 60 }

/* px — an iPhone 16's 393px, less the page padding and the line gutters. */
const PHONE_CONTAINER_WIDTH = 353

const SIZE_PROBE = `<template #lane="{ layout }">
  <div data-testid="lane-probe" :data-unit="layout.unit" :data-total-width="layout.totalWidth" />
</template>`

describe('PianoDisplay - key sizing', () => {
  /* happy-dom never lays anything out, so the container width is fed in
   * through the observer the display fits its keys from. */
  let reportContainerWidth: (width: number) => Promise<void>

  beforeEach(() => {
    const callbacks: ResizeObserverCallback[] = []

    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          callbacks.push(callback)
        }
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    )

    reportContainerWidth = async (width) => {
      for (const callback of callbacks) {
        callback(
          [{ contentRect: { width } } as ResizeObserverEntry],
          {} as ResizeObserver,
        )
      }
      await nextTick()
    }
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function mountSized(
    props: Partial<InstanceType<typeof PianoDisplay>['$props']> = {},
  ) {
    const wrapper = mountDisplay(
      { ...WIDE_RANGE, ...props },
      { lane: SIZE_PROBE },
    )

    return {
      unit: () =>
        Number(
          wrapper.get('[data-testid="lane-probe"]').attributes('data-unit'),
        ),
      totalWidth: () =>
        Number(
          wrapper
            .get('[data-testid="lane-probe"]')
            .attributes('data-total-width'),
        ),
    }
  }

  test('should start at the pointer floor before the container is measured', () => {
    expect(mountSized().unit()).toBe(MIN_SEMITONE_UNIT_POINTER)
  })

  test('should start at the given floor before the container is measured', () => {
    expect(mountSized({ minSemitoneUnit: 14 }).unit()).toBe(14)
  })

  /* 353 / 17 units = 20.76, floored to 20: a 340px board. */
  test('should shrink the keys to fit a narrow container when given a lower floor', async () => {
    const board = mountSized({ minSemitoneUnit: 14 })

    await reportContainerWidth(PHONE_CONTAINER_WIDTH)

    expect(board.unit()).toBe(20)
    expect(board.totalWidth()).toBeLessThanOrEqual(PHONE_CONTAINER_WIDTH)
  })

  /* Held at the floor: a board wider than the screen, which scrolls as on
   * the piano page. */
  test('should stop at the pointer floor in a narrow container by default', async () => {
    const board = mountSized()

    await reportContainerWidth(PHONE_CONTAINER_WIDTH)

    expect(board.unit()).toBe(MIN_SEMITONE_UNIT_POINTER)
    expect(board.totalWidth()).toBeGreaterThan(PHONE_CONTAINER_WIDTH)
  })
})

describe('PianoDisplay - keyboard hints', () => {
  /* Vue casts an absent Boolean prop to false, so "omitted" must be its own
   * case — it once hid every chip on a page that never passed the prop. */
  test('should show the computer-key chips when the prop is omitted', () => {
    const wrapper = mountDisplay()

    expect(
      wrapper.findAll('[data-testid="piano-key-hint"]').length,
    ).toBeGreaterThan(0)
    /* Q plays C4 in the printed computer-keyboard map. */
    expect(
      wrapper
        .get('[data-testid="piano-key-60"] [data-testid="piano-key-hint"]')
        .text(),
    ).toBe('Q')
    wrapper.unmount()
  })

  test('should hide the chips when hints are turned off', () => {
    const wrapper = mountDisplay({ areKeyboardHintsVisible: false })

    expect(wrapper.findAll('[data-testid="piano-key-hint"]')).toHaveLength(0)
    wrapper.unmount()
  })
})

describe('PianoDisplay - press and release', () => {
  test('should emit a press on pointerdown and a release on pointerup', async () => {
    const wrapper = mountDisplay()

    await wrapper
      .get(`[data-testid="piano-key-${E4}"]`)
      .trigger('pointerdown', { pointerId: 7 })
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 7 }))

    expect(wrapper.emitted('notePressed')?.map(([midi]) => midi)).toEqual([E4])
    expect(wrapper.emitted('noteReleased')?.map(([midi]) => midi)).toEqual([E4])
    wrapper.unmount()
  })

  test('should release a touch the browser takes over for panning', async () => {
    const wrapper = mountDisplay()

    await wrapper
      .get(`[data-testid="piano-key-${E4}"]`)
      .trigger('pointerdown', { pointerId: 3 })
    window.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 3 }))

    expect(wrapper.emitted('noteReleased')?.map(([midi]) => midi)).toEqual([E4])
    wrapper.unmount()
  })

  /* Q plays C4 in the printed computer-keyboard map. */
  test('should emit a press and release for a computer key', () => {
    const wrapper = mountDisplay()

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ' }))
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyQ' }))

    expect(wrapper.emitted('notePressed')?.map(([midi]) => midi)).toEqual([60])
    expect(wrapper.emitted('noteReleased')?.map(([midi]) => midi)).toEqual([60])
    wrapper.unmount()
  })

  test('should release a held key when the keyboard unmounts', () => {
    const wrapper = mountDisplay()

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ' }))
    const pressed = wrapper.emitted('notePressed')
    wrapper.unmount()

    expect(pressed?.map(([midi]) => midi)).toEqual([60])
    expect(wrapper.emitted('noteReleased')?.map(([midi]) => midi)).toEqual([60])
  })
})
