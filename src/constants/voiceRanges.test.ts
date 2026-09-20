import { describe, expect, test } from 'vitest'
import { midiToNoteLabel } from '@/utils/noteUtils'
import { VOICE_RANGES } from './voiceRanges'

const VOICE_TYPE_LABEL_KEYS = VOICE_RANGES.filter(
  (range) => range.group === 'voiceTypes',
).map((range) => range.labelKey)

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
