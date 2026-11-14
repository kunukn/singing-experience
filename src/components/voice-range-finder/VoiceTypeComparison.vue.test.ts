import { beforeEach, describe, expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'
import { FAMOUS_SINGERS } from './famousSingers'
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

  test('should star the best fit, say it in words and explain the star', () => {
    const wrapper = mountComparison()
    const starredVoices = rowsOf(wrapper)
      .filter((row) =>
        row
          .find('[data-testid="voice-type-comparison-best-fit-mark"]')
          .exists(),
      )
      .map((row) => row.attributes('data-voice-type'))

    expect(starredVoices).toEqual(['voiceRanges.bass'])
    /* After the name, so the names keep their start-aligned column */
    expect(rowFor(wrapper, 'voiceRanges.bass').text()).toContain('Bass ★')
    expect(
      rowFor(wrapper, 'voiceRanges.bass').attributes('aria-label'),
    ).toMatch(/ Your best fit\.$/)
    expect(
      rowFor(wrapper, 'voiceRanges.baritone').attributes('aria-label'),
    ).not.toContain('best fit')
    expect(wrapper.text()).toContain('★ = your best fit.')
  })

  test('should leave out the star key when the range misses every voice', () => {
    /* F♯6–A6: above Soprano's C6, so no voice is covered at all */
    const wrapper = mountComparison(90, 93)

    expect(
      wrapper
        .find('[data-testid="voice-type-comparison-best-fit-mark"]')
        .exists(),
    ).toBe(false)
    expect(wrapper.text()).not.toContain('best fit')
  })

  test('should draw the singer range as its own bar beside My range only', () => {
    expect(
      mountComparison()
        .find('[data-testid="voice-type-comparison-range-bar"]')
        .exists(),
    ).toBe(true)
    expect(
      mount(VoiceTypeComparison, { global: { plugins: [i18n] } })
        .find('[data-testid="voice-type-comparison-range-bar"]')
        .exists(),
    ).toBe(false)
  })

  test('should label both ends of the singer range', () => {
    /* G2–E4 */
    const labels = mountComparison(43, 64)
      .findAll('[data-testid="voice-type-comparison-range-label"]')
      .map((label) => label.text())

    expect(labels).toEqual(['G2', 'E4'])
  })

  describe('with See my voice off', () => {
    const mountOff = () =>
      mount(VoiceTypeComparison, {
        props: { midiMin: 44, midiMax: 60, isListening: false },
        global: { plugins: [i18n] },
      })

    test('should fade every voice bar, covered part included', () => {
      const wrapper = mountOff()

      expect(
        rowsOf(wrapper).map((row) => row.attributes('data-faded')),
      ).toEqual(Array(6).fill('true'))
      expect(
        wrapper.find('[data-testid="voice-type-comparison-bar"]').exists(),
      ).toBe(false)
    })

    test('should still show how much of each voice is covered', () => {
      expect(rowFor(mountOff(), 'voiceRanges.tenor').text()).toContain('%')
    })

    test('should explain the striped bar and the arrows', () => {
      const legend = mountOff()
        .get('[data-testid="voice-type-comparison-legend"]')
        .text()

      expect(legend).toContain(en.voiceRangeFinder.compare.rangeLegend)
      expect(legend).toContain(en.voiceRangeFinder.compare.reachLegend)
    })

    test('should explain the striped bar and the arrows while listening', () => {
      const legend = mountComparison()
        .get('[data-testid="voice-type-comparison-legend"]')
        .text()

      expect(legend).toContain(en.voiceRangeFinder.compare.rangeLegend)
      expect(legend).toContain(en.voiceRangeFinder.compare.reachLegend)
    })

    test('should not fade the bars while listening', () => {
      expect(
        rowsOf(mountComparison()).map((row) => row.attributes('data-faded')),
      ).toEqual(Array(6).fill(undefined))
    })
  })

  describe('live note line', () => {
    const liveLinesOf = (liveMidi: number | null) =>
      mount(VoiceTypeComparison, {
        props: { midiMin: 44, midiMax: 60, liveMidi },
        global: { plugins: [i18n] },
      }).findAll<HTMLElement>('[data-testid="voice-type-comparison-live-line"]')

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

    test('should keep the line one colour whether the note is clean, flat or sharp', () => {
      const colorOf = (liveMidi: number) =>
        liveLinesOf(liveMidi)[0]!.element.style.backgroundColor

      expect(colorOf(60)).not.toBe('')
      expect(colorOf(59.7)).toBe(colorOf(60))
      expect(colorOf(60.3)).toBe(colorOf(60))
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

    test('should read a note within 2¢ as ≈0¢', () => {
      const textOf = (liveMidi: number) =>
        liveLabelOf(liveMidi).text().replace(/\s+/g, ' ')

      expect(textOf(52.02)).toBe('E3 ≈0¢')
      expect(textOf(51.98)).toBe('E3 ≈0¢')
      expect(textOf(52.03)).toBe('E3 +3¢')
    })

    test('should put the label before the line past the middle', () => {
      /* C5 */
      const label = liveLabelOf(72)

      expect(label.text().replace(/\s+/g, ' ')).toBe('C5 ≈0¢')
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

  /* A tap on the chart used to replace My range, losing a sung range unseen */
  test('should not offer a voice as My range when a row is tapped', async () => {
    const wrapper = mountComparison()

    expect(wrapper.find('button').exists()).toBe(false)

    await rowFor(wrapper, 'voiceRanges.baritone').trigger('click')

    expect(wrapper.emitted('selectRange')).toBeUndefined()
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

      test('should tell the singer to turn on See my voice', () => {
        expect(
          mountOff().get('[data-testid="voice-type-comparison-legend"]').text(),
        ).toContain('Turn on See my voice.')
      })
    })

    test('should not ask to turn on See my voice while listening', () => {
      expect(
        mountExplore()
          .get('[data-testid="voice-type-comparison-legend"]')
          .text(),
      ).not.toContain('Turn on')
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

    describe('famous singers', () => {
      const mountSingers = (liveMidi: number | null = null) =>
        mount(VoiceTypeComparison, {
          props: { liveMidi, showSingers: true },
          global: { plugins: [i18n] },
        })

      const singersOf = (wrapper: ReturnType<typeof mountSingers>) =>
        wrapper
          .findAll('[data-singer]')
          .map((row) => row.attributes('data-singer'))

      test('should leave singers out by default', () => {
        const wrapper = mountExplore()

        expect(wrapper.find('[data-singer]').exists()).toBe(false)
        expect(
          wrapper
            .find('[data-testid="voice-type-comparison-singers-title"]')
            .exists(),
        ).toBe(false)
        expect(wrapper.text()).not.toContain(
          en.voiceRangeFinder.compare.famousSingersLegend,
        )
      })

      test('should list every singer below the voice types, high to low', () => {
        const wrapper = mountSingers()

        expect(singersOf(wrapper)).toEqual(FAMOUS_SINGERS.map(({ id }) => id))
        expect(
          wrapper
            .findAll('[data-testid="voice-type-comparison-row"]')
            .slice(0, 6)
            .every((row) => row.attributes('data-voice-type')),
        ).toBe(true)
      })

      test('should head the singers and explain their ranges', () => {
        const wrapper = mountSingers()

        expect(
          wrapper
            .get('[data-testid="voice-type-comparison-singers-title"]')
            .text(),
        ).toBe('Famous singers')
        expect(
          wrapper.get('[data-testid="voice-type-comparison-legend"]').text(),
        ).toContain(en.voiceRangeFinder.compare.famousSingersLegend)
      })

      test('should read out and label a singer by their range', () => {
        const row = mountSingers().get('[data-singer="johnnyCash"]')

        expect(row.attributes('aria-label')).toBe('Johnny Cash, E2–D4')
        expect(
          row.get('[data-testid="voice-type-comparison-voice-start"]').text(),
        ).toBe('E2')
        expect(
          row.get('[data-testid="voice-type-comparison-voice-end"]').text(),
        ).toBe('D4')
      })

      /* Which of the two shows is a container query, so the DOM shim sees both */
      test('should give a singer a short and a full name', () => {
        const row = mountSingers().get('[data-singer="elvisPresley"]')

        expect(
          row.get('[data-testid="voice-type-comparison-short-name"]').text(),
        ).toBe('Presley')
        expect(
          row.get('[data-testid="voice-type-comparison-full-name"]').text(),
        ).toBe('Elvis Presley')
      })

      test('should light up the singers who sing the live note, and only them', () => {
        /* A♯5: only Mariah Carey (to C6) and Whitney Houston (to A♯5) reach it */
        const sounding = mountSingers(82)
          .findAll('[data-singer]')
          .filter((row) => row.attributes('data-sounding') === 'true')
          .map((row) => row.attributes('data-singer'))

        expect(sounding).toEqual(['mariahCarey', 'whitneyHouston'])
      })

      test('should draw the live line through the singers too', () => {
        expect(
          mountSingers(60).findAll(
            '[data-testid="voice-type-comparison-live-line"]',
          ),
          /* The six voices, the singers and My range */
        ).toHaveLength(6 + FAMOUS_SINGERS.length + 1)
      })

      /* Six voice rows above it, so the subheading is grid row 7 */
      test('should put the live label on the subheading row, clear of every bar', () => {
        expect(
          mountSingers(60)
            .get('[data-testid="voice-type-comparison-live-label-area"]')
            .attributes('style'),
        ).toContain('grid-row: 7 / span 1')
      })

      test('should centre the live label on the voice rows without singers', () => {
        expect(
          mountExplore(60)
            .get('[data-testid="voice-type-comparison-live-label-area"]')
            .attributes('style'),
        ).toContain('grid-row: 1 / span 6')
      })

      test('should keep the voice bars in place when the singers appear', () => {
        const styleOf = (wrapper: ReturnType<typeof mountSingers>) =>
          wrapper
            .get(
              '[data-voice-type="voiceRanges.bass"] [data-testid="voice-type-comparison-bar"]',
            )
            .attributes('style')

        expect(styleOf(mountSingers())).toBe(styleOf(mountExplore()))
      })

      describe('My range bar', () => {
        const { setMyVoiceRange } = useMyVoiceRange()

        const myRangeOf = (wrapper: ReturnType<typeof mountSingers>) =>
          wrapper.get('[data-my-range]')

        const endsOf = (wrapper: ReturnType<typeof mountSingers>) => {
          const row = myRangeOf(wrapper)

          return [
            row.get('[data-testid="voice-type-comparison-voice-start"]').text(),
            row.get('[data-testid="voice-type-comparison-voice-end"]').text(),
          ]
        }

        beforeEach(() => {
          setMyVoiceRange(41, 67) // F2–G4
        })

        test('should stay hidden without the singers', () => {
          expect(mountExplore().find('[data-my-range]').exists()).toBe(false)
        })

        test('should sit below the last singer, named and with both ends labelled', () => {
          const wrapper = mountSingers()
          const rows = wrapper.findAll(
            '[data-testid="voice-type-comparison-row"]',
          )

          expect(rows.at(-1)!.attributes('data-my-range')).toBeDefined()
          expect(myRangeOf(wrapper).attributes('aria-label')).toBe(
            'My range, F2–G4',
          )
          expect(endsOf(wrapper)).toEqual(['F2', 'G4'])
        })

        test.each([
          { midiMin: 36, inside: 'true' }, // C2
          { midiMin: 39, inside: 'true' }, // D♯2
          { midiMin: 40, inside: undefined }, // E2
        ])(
          'should put the low note inside the bar only below E2 ($midiMin)',
          ({ midiMin, inside }) => {
            setMyVoiceRange(midiMin, 84) // C6
            const start = myRangeOf(mountSingers()).get(
              '[data-testid="voice-type-comparison-voice-start"]',
            )

            expect(start.attributes('data-inside')).toBe(inside)
          },
        )

        test.each([
          { midiMax: 96, inside: 'true' }, // C7
          { midiMax: 85, inside: 'true' }, // C♯6
          { midiMax: 84, inside: undefined }, // C6
        ])(
          'should put the high note inside the bar only above C6 ($midiMax)',
          ({ midiMax, inside }) => {
            setMyVoiceRange(48, midiMax) // from C3
            const end = myRangeOf(mountSingers()).get(
              '[data-testid="voice-type-comparison-voice-end"]',
            )

            expect(end.attributes('data-inside')).toBe(inside)
          },
        )

        test('should clip a high end past the chart and name its real note', () => {
          setMyVoiceRange(48, 96) // C3–C7
          const wrapper = mountSingers()

          expect(endsOf(wrapper)).toEqual(['C3', 'C7'])
          expect(
            myRangeOf(wrapper)
              .get('[data-testid="voice-type-comparison-voice-end"]')
              .attributes('style'),
          ).toContain('inset-inline-start: 100%')
        })

        test('should explain the stripes', () => {
          expect(
            mountSingers()
              .get('[data-testid="voice-type-comparison-legend"]')
              .text(),
          ).toContain(en.voiceRangeFinder.compare.rangeLegend)
        })

        test('should light up while the live note is inside the range', () => {
          /* C4 is inside F2–G4; C5 is above it */
          expect(myRangeOf(mountSingers(60)).attributes('data-sounding')).toBe(
            'true',
          )
          expect(myRangeOf(mountSingers(72)).attributes('data-sounding')).toBe(
            'false',
          )
        })

        test('should keep its bar when See my voice is off', () => {
          const row = myRangeOf(
            mount(VoiceTypeComparison, {
              props: { liveMidi: null, showSingers: true, isListening: false },
              global: { plugins: [i18n] },
            }),
          )

          expect(row.attributes('data-faded')).toBeUndefined()
        })

        test('should clip a low end past the chart, name its real note and leave the axis alone', () => {
          const bassStyle = (wrapper: ReturnType<typeof mountSingers>) =>
            wrapper
              .get(
                '[data-voice-type="voiceRanges.bass"] [data-testid="voice-type-comparison-bar"]',
              )
              .attributes('style')
          const before = bassStyle(mountSingers())

          setMyVoiceRange(36, 84) // C2–C6
          const wrapper = mountSingers()

          expect(endsOf(wrapper)).toEqual(['C2', 'C6'])
          expect(
            myRangeOf(wrapper)
              .get('[data-testid="voice-type-comparison-voice-start"]')
              .attributes('style'),
          ).toContain('inset-inline-start: 0%')
          expect(bassStyle(wrapper)).toBe(before)
        })
      })

      test('should ignore the singers beside My range', () => {
        const wrapper = mount(VoiceTypeComparison, {
          props: { midiMin: 44, midiMax: 60, showSingers: true },
          global: { plugins: [i18n] },
        })

        expect(wrapper.find('[data-singer]').exists()).toBe(false)
      })
    })

    test('should show no best fit while exploring', () => {
      const wrapper = mountExplore()

      expect(
        wrapper
          .find('[data-testid="voice-type-comparison-best-fit-mark"]')
          .exists(),
      ).toBe(false)
      expect(wrapper.text()).not.toContain('best fit')
    })
  })
})
