import { describe, expect, test } from 'vitest'
import { midiToNoteLabel } from '@/utils/noteUtils'
import { getSegmentsForRange } from '@/utils/voiceRangeSegments'
import { VOICE_RANGE_GROUP_ORDER, VOICE_RANGES } from './voiceRanges'

const VOICE_TYPE_LABEL_KEYS = VOICE_RANGES.filter(
  (range) => range.group === 'voiceTypes',
).map((range) => range.labelKey)

/* Ranges that mean "everything" rather than a particular tessitura. They sit
 * below the pitch-ordered entries instead of competing with them on midpoint. */
const CATCH_ALL_LABEL_KEYS = ['voiceRanges.choir', 'voiceRanges.full']

const midpointOf = (range: (typeof VOICE_RANGES)[number]) =>
  (range.midiMin + range.midiMax) / 2

const rangesIn = (groupId: string) =>
  VOICE_RANGES.filter((range) => range.group === groupId)

describe('VOICE_RANGES', () => {
  /*
   * noteRange and the MIDI numbers are two hand-maintained facts about the same
   * span, and noteRange is what a singer reads in the range select, the sing-tone
   * header and both game summaries. Nothing else in the app cross-checks them, so
   * an edit to one without the other would ship a label that quietly lies.
   */
  test.each(VOICE_RANGES)(
    '$labelKey noteRange matches its MIDI span',
    (range) => {
      const from = midiToNoteLabel(range.midiMin).label
      const to = midiToNoteLabel(range.midiMax).label

      /* En dash U+2013, as every entry uses */
      expect(range.noteRange).toBe(`${from}–${to}`)
    },
  )

  test('every range spans from low to high', () => {
    for (const range of VOICE_RANGES) {
      expect(range.midiMax).toBeGreaterThan(range.midiMin)
    }
  })

  test('every focusVoices entry names a real voice type', () => {
    for (const range of VOICE_RANGES) {
      for (const labelKey of range.focusVoices ?? []) {
        expect(VOICE_TYPE_LABEL_KEYS).toContain(labelKey)
      }
    }
  })

  test('labelKeys are unique', () => {
    const labelKeys = VOICE_RANGES.map((range) => range.labelKey)

    expect(new Set(labelKeys).size).toBe(labelKeys.length)
  })
})

/*
 * The selector sits next to a chart that draws high notes at the top, so its
 * options read the same way down the list — see "Pitch Orientation" in
 * AGENTS.md. Asserted as a rule rather than a snapshot of today's order, so a
 * range added in the wrong place fails here instead of shipping.
 */
describe('VOICE_RANGES ordering', () => {
  test.each(VOICE_RANGE_GROUP_ORDER)(
    '%s options run high to low',
    (groupId) => {
      const midpoints = rangesIn(groupId)
        .filter((range) => !CATCH_ALL_LABEL_KEYS.includes(range.labelKey))
        .map(midpointOf)

      expect(midpoints).toEqual([...midpoints].sort((a, b) => b - a))
    },
  )

  test.each(VOICE_RANGE_GROUP_ORDER)(
    '%s catch-alls come after every pitch-ordered option',
    (groupId) => {
      const isCatchAll = rangesIn(groupId).map((range) =>
        CATCH_ALL_LABEL_KEYS.includes(range.labelKey),
      )
      const firstCatchAll = isCatchAll.indexOf(true)
      if (firstCatchAll === -1) return

      expect(isCatchAll.slice(firstCatchAll).every(Boolean)).toBe(true)
    },
  )

  /*
   * The ribbon stacks its columns low-to-high because lane 0 sits nearest the
   * axis, so every vertical rendering of those segments has to turn them
   * around. Asserted here rather than in the legend's own test: it is the rule
   * that is being pinned, not one component's markup.
   */
  test('a vertical list of voice type segments reads high to low', () => {
    const choirIndex = VOICE_RANGES.findIndex(
      (range) => range.labelKey === 'voiceRanges.choir',
    )
    const choir = VOICE_RANGES[choirIndex]
    const rows = getSegmentsForRange(
      choirIndex,
      choir.midiMin,
      choir.midiMax,
    ).toReversed()
    const midpoints = rows.map(
      (segment) => (segment.midiFrom + segment.midiTo) / 2,
    )

    expect(midpoints).toEqual([...midpoints].sort((a, b) => b - a))
  })

  test('groups appear in VOICE_RANGE_GROUP_ORDER, uninterrupted', () => {
    const groupsInArrayOrder = VOICE_RANGES.map((range) => range.group).filter(
      (group, index, all) => group !== all[index - 1],
    )

    expect(groupsInArrayOrder).toEqual([...VOICE_RANGE_GROUP_ORDER])
  })
})
