import { describe, expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'
import { VOICE_RANGES } from '@/constants/voiceRanges'
import VoiceTypeComparison from './VoiceTypeComparison.vue'

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })

/* G♯2–C4 */
function mountComparison(midiMin = 44, midiMax = 60) {
  return mount(VoiceTypeComparison, {
    props: { midiMin, midiMax },
    global: { plugins: [i18n] },
  })
}

const rowsOf = (wrapper: ReturnType<typeof mountComparison>) =>
  wrapper.findAll('[data-testid="voice-type-comparison-row"]')

const rowFor = (
  wrapper: ReturnType<typeof mountComparison>,
  labelKey: string,
) => wrapper.get(`[data-voice-type="${labelKey}"]`)

describe('VoiceTypeComparison', () => {
  test('should list all six voice types, Soprano first', () => {
    const voiceTypes = rowsOf(mountComparison()).map((row) =>
      row.attributes('data-voice-type'),
    )

    expect(voiceTypes).toEqual([
      'voiceRanges.soprano',
      'voiceRanges.mezzoSoprano',
      'voiceRanges.alto',
      'voiceRanges.tenor',
      'voiceRanges.baritone',
      'voiceRanges.bass',
    ])
  })

  test('should show how much of the voice is covered and which way to go', () => {
    const baritone = rowFor(mountComparison(), 'voiceRanges.baritone')

    expect(baritone.attributes('data-coverage')).toBe('63')
    expect(baritone.text()).toContain('63%')
    expect(
      baritone.get('[data-testid="voice-type-comparison-hint"]').text(),
    ).toBe('↑A4')
    expect(baritone.attributes('aria-label')).toBe(
      'Baritone, A2–A4. You cover 63%. Sing up to A4.',
    )
  })

  /* Which of the two shows is a container query, so the DOM shim sees both */
  test('should give Mezzo-Soprano a short and a full name, and read out the full one', () => {
    const mezzo = rowFor(mountComparison(), 'voiceRanges.mezzoSoprano')

    expect(
      mezzo.get('[data-testid="voice-type-comparison-short-name"]').text(),
    ).toBe('Mezzo')
    expect(
      mezzo.get('[data-testid="voice-type-comparison-full-name"]').text(),
    ).toBe('Mezzo-Soprano')
    expect(mezzo.attributes('aria-label')).toContain('Mezzo-Soprano')
  })

  test('should show a name without a short form once', () => {
    const soprano = rowFor(mountComparison(), 'voiceRanges.soprano')

    expect(
      soprano.find('[data-testid="voice-type-comparison-short-name"]').exists(),
    ).toBe(false)
    expect(soprano.text().match(/Soprano/g)).toHaveLength(1)
  })

  test('should point both ways when the range sits inside the voice', () => {
    const bass = rowFor(mountComparison(), 'voiceRanges.bass')

    expect(bass.get('[data-testid="voice-type-comparison-hint"]').text()).toBe(
      '↓E2 ↑E4',
    )
  })

  test('should tick a voice that is covered whole', () => {
    const baritone = rowFor(mountComparison(45, 69), 'voiceRanges.baritone')

    expect(
      baritone.get('[data-testid="voice-type-comparison-hint"]').text(),
    ).toBe('✓')
  })

  test('should mark exactly one best fit', () => {
    const bestFits = rowsOf(mountComparison()).filter(
      (row) => row.attributes('data-best-fit') === 'true',
    )

    expect(bestFits.map((row) => row.attributes('data-voice-type'))).toEqual([
      'voiceRanges.bass',
    ])
  })

  test('should label both ends of the singer range', () => {
    /* G2–E4 */
    const labels = mountComparison(43, 64)
      .findAll('[data-testid="voice-type-comparison-range-label"]')
      .map((label) => label.text())

    expect(labels).toEqual(['G2', 'E4'])
  })

  describe('live note line', () => {
    const liveLinesOf = (liveMidi: number | null) =>
      mount(VoiceTypeComparison, {
        props: { midiMin: 44, midiMax: 60, liveMidi },
        global: { plugins: [i18n] },
      }).findAll('[data-testid="voice-type-comparison-live-line"]')

    test('should not draw a line while nothing is sung', () => {
      expect(liveLinesOf(null)).toHaveLength(0)
    })

    test('should draw the sung note through every row', () => {
      /* D4 on the E2–C6 axis: (62 − 40) / 44 */
      const lines = liveLinesOf(62)

      /* One per voice-type row */
      expect(lines).toHaveLength(6)
      for (const line of lines)
        expect(line.attributes('style')).toContain('inset-inline-start: 50%')
    })

    const liveLabelOf = (liveMidi: number | null) =>
      mount(VoiceTypeComparison, {
        props: { midiMin: 44, midiMax: 60, liveMidi },
        global: { plugins: [i18n] },
      }).find('[data-testid="voice-type-comparison-live-label"]')

    test('should name the sung note and its cents beside the line', () => {
      /* E3, 20¢ sharp — left half of the axis, so the label sits after the line */
      const label = liveLabelOf(52.2)

      expect(label.text().replace(/\s+/g, ' ')).toBe('E3 +20¢')
      expect(label.attributes('data-side')).toBe('end')
    })

    test('should put the label before the line past the middle', () => {
      /* C5 */
      const label = liveLabelOf(72)

      expect(label.text().replace(/\s+/g, ' ')).toBe('C5 0¢')
      expect(label.attributes('data-side')).toBe('start')
    })

    test('should name the real note when the line is pinned to the edge', () => {
      /* A1, below the E2 axis start */
      expect(liveLabelOf(33).text()).toContain('A1')
    })

    test('should not label anything while nothing is sung', () => {
      expect(liveLabelOf(null).exists()).toBe(false)
    })

    test('should pin a note below the chart to its edge', () => {
      expect(liveLinesOf(30)[0]!.attributes('style')).toContain(
        'inset-inline-start: 0%',
      )
    })
  })

  test('should mark the Bass bottom and every C above the tracks', () => {
    expect(
      mountComparison()
        .findAll('[data-testid="voice-type-comparison-tick"]')
        .map((tick) => tick.text()),
    ).toEqual(['E2', 'C3', 'C4', 'C5', 'C6'])
  })

  test('should keep the Bass bottom mark when the range runs below it', () => {
    /* C2–C4: the axis widens to C2, so E2 sits inside it */
    expect(
      mountComparison(36, 60)
        .findAll('[data-testid="voice-type-comparison-tick"]')
        .map((tick) => tick.text()),
    ).toEqual(['C2', 'E2', 'C3', 'C4', 'C5', 'C6'])
  })

  test('should not label voice ends beside My range', () => {
    expect(
      mountComparison()
        .find('[data-testid="voice-type-comparison-voice-start"]')
        .exists(),
    ).toBe(false)
  })

  test('should ask for the voice range when a row is tapped', async () => {
    const wrapper = mountComparison()

    await rowFor(wrapper, 'voiceRanges.baritone').trigger('click')

    expect(wrapper.emitted('selectRange')).toEqual([
      [
        VOICE_RANGES.findIndex(
          (range) => range.labelKey === 'voiceRanges.baritone',
        ),
      ],
    ])
  })

  describe('explore mode', () => {
    function mountExplore(liveMidi: number | null = null) {
      return mount(VoiceTypeComparison, {
        props: { liveMidi },
        global: { plugins: [i18n] },
      })
    }

    const soundingVoices = (wrapper: ReturnType<typeof mountExplore>) =>
      wrapper
        .findAll('[data-testid="voice-type-comparison-row"]')
        .filter((row) => row.attributes('data-sounding') === 'true')
        .map((row) => row.attributes('data-voice-type'))

    test('should list all six voice types, Soprano first, without a range', () => {
      const wrapper = mountExplore()

      expect(
        wrapper
          .findAll('[data-testid="voice-type-comparison-row"]')
          .map((row) => row.attributes('data-voice-type')),
      ).toEqual([
        'voiceRanges.soprano',
        'voiceRanges.mezzoSoprano',
        'voiceRanges.alto',
        'voiceRanges.tenor',
        'voiceRanges.baritone',
        'voiceRanges.bass',
      ])
      expect(wrapper.text()).toContain('Voice types')
    })

    test('should leave out coverage, hints and range labels', () => {
      const wrapper = mountExplore(60)

      expect(
        wrapper.find('[data-testid="voice-type-comparison-hint"]').exists(),
      ).toBe(false)
      expect(
        wrapper
          .find('[data-testid="voice-type-comparison-range-label"]')
          .exists(),
      ).toBe(false)
      expect(wrapper.text()).not.toContain('%')
    })

    test('should light up the voices that can sing the live note', () => {
      /* G5, a little sharp: inside Soprano (C4–C6) and Mezzo (A3–A5) only */
      expect(soundingVoices(mountExplore(79.2))).toEqual([
        'voiceRanges.soprano',
        'voiceRanges.mezzoSoprano',
      ])
    })

    test.each([
      { labelKey: 'voiceRanges.soprano', start: 'C4', end: 'C6' },
      { labelKey: 'voiceRanges.bass', start: 'E2', end: 'E4' },
    ])(
      'should label $labelKey from $start to $end',
      ({ labelKey, start, end }) => {
        const row = mountExplore().get(`[data-voice-type="${labelKey}"]`)

        expect(
          row.get('[data-testid="voice-type-comparison-voice-start"]').text(),
        ).toBe(start)
        expect(
          row.get('[data-testid="voice-type-comparison-voice-end"]').text(),
        ).toBe(end)
      },
    )

    test('should leave out the C tick labels, which the bar ends already name', () => {
      expect(
        mountExplore()
          .find('[data-testid="voice-type-comparison-tick"]')
          .exists(),
      ).toBe(false)
    })

    test.each([null, 79.2])(
      'should draw every voice bar whole, sung note or not (%s)',
      (liveMidi) => {
        const bars = mountExplore(liveMidi).findAll(
          '[data-testid="voice-type-comparison-bar"]',
        )

        expect(bars).toHaveLength(6)
      },
    )

    describe('with See my voice off', () => {
      const mountOff = () =>
        mount(VoiceTypeComparison, {
          props: { liveMidi: null, isListening: false },
          global: { plugins: [i18n] },
        })

      test('should fade every voice bar', () => {
        const wrapper = mountOff()

        expect(
          wrapper
            .findAll('[data-testid="voice-type-comparison-row"]')
            .map((row) => row.attributes('data-faded')),
        ).toEqual(Array(6).fill('true'))
        expect(
          wrapper.find('[data-testid="voice-type-comparison-bar"]').exists(),
        ).toBe(false)
      })
    })

    test('should not fade the bars while listening', () => {
      expect(
        mountExplore(60)
          .find('[data-testid="voice-type-comparison-row"]')
          .attributes('data-faded'),
      ).toBeUndefined()
    })

    test('should light up nothing while nothing is sung', () => {
      expect(soundingVoices(mountExplore(null))).toEqual([])
    })

    test('should not offer a voice as My range when a row is tapped', async () => {
      const wrapper = mountExplore()

      expect(wrapper.find('button').exists()).toBe(false)

      await wrapper.get('[data-voice-type="voiceRanges.alto"]').trigger('click')

      expect(wrapper.emitted('selectRange')).toBeUndefined()
    })
  })
})
