import { midiToNoteLabel, type NoteName } from '@/utils/noteUtils'

/*
 * The guitar tuning catalogue — one source of truth for every consumer, so the
 * tuner and the fretboard can never disagree about what DADGAD is.
 *
 * Tunings are stored as MIDI numbers because that is the primitive both consumers
 * derive from: the fretboard adds the fret offset to each open string, the tuner
 * needs note names for its sample keys and string buttons. Order is ascending —
 * index 0 is string 6, the lowest string and the fretboard's leftmost column.
 */

export const GUITAR_TUNING_IDS = [
  'standard',
  'ebStandard',
  'dropD',
  'dropC',
  'openG',
  'openD',
  'openC',
  'dadgad',
] as const

export type GuitarTuningId = (typeof GUITAR_TUNING_IDS)[number]

export type GuitarTuningGroupId = 'standard' | 'drop' | 'open' | 'alternate'

export type GuitarTuning = {
  id: GuitarTuningId
  group: GuitarTuningGroupId
  /* String 6 first, ascending. Always six entries. */
  midi: readonly number[]
  /* Spelled out where the letters read cleanly, otherwise null and the name comes
   * from labelKey instead — Eb standard would spell D♯G♯C♯F♯A♯D♯, and the open
   * tunings are known by name rather than by their letters. */
  label: string | null
  labelKey: string | null
}

export const DEFAULT_GUITAR_TUNING_ID: GuitarTuningId = 'standard'

export const GUITAR_TUNINGS: Record<GuitarTuningId, GuitarTuning> = {
  standard: {
    id: 'standard',
    group: 'standard',
    midi: [40, 45, 50, 55, 59, 64], // E2 A2 D3 G3 B3 E4
    label: 'EADGBE',
    labelKey: null,
  },
  ebStandard: {
    id: 'ebStandard',
    group: 'standard',
    midi: [39, 44, 49, 54, 58, 63], // D♯2 G♯2 C♯3 F♯3 A♯3 D♯4 — a semitone flat
    label: null,
    labelKey: 'tuner.tuningItems.ebStandard',
  },
  dropD: {
    id: 'dropD',
    group: 'drop',
    midi: [38, 45, 50, 55, 59, 64], // D2 A2 D3 G3 B3 E4 — string 6 only
    label: 'DADGBE',
    labelKey: null,
  },
  dropC: {
    id: 'dropC',
    group: 'drop',
    midi: [36, 43, 48, 53, 57, 62], // C2 G2 C3 F3 A3 D4
    label: 'CGCFAD',
    labelKey: null,
  },
  openG: {
    id: 'openG',
    group: 'open',
    midi: [38, 43, 50, 55, 59, 62], // D2 G2 D3 G3 B3 D4
    label: null,
    labelKey: 'tuner.tuningItems.openG',
  },
  openD: {
    id: 'openD',
    group: 'open',
    midi: [38, 45, 50, 54, 57, 62], // D2 A2 D3 F♯3 A3 D4
    label: null,
    labelKey: 'tuner.tuningItems.openD',
  },
  openC: {
    id: 'openC',
    group: 'open',
    midi: [36, 43, 48, 55, 60, 64], // C2 G2 C3 G3 C4 E4
    label: null,
    labelKey: 'tuner.tuningItems.openC',
  },
  dadgad: {
    id: 'dadgad',
    group: 'alternate',
    midi: [38, 45, 50, 55, 57, 62], // D2 A2 D3 G3 A3 D4
    label: 'DADGAD',
    labelKey: null,
  },
}

/* Guards a persisted or user-supplied id — an unknown one would leave the
 * fretboard with no strings to draw. */
export function isGuitarTuningId(value: unknown): value is GuitarTuningId {
  return GUITAR_TUNING_IDS.includes(value as GuitarTuningId)
}

export type GuitarTuningString = { note: NoteName; octave: number }

/**
 * Open strings 6→1 as note/octave pairs, which is how the guitar sampler is
 * keyed. Already ascending by pitch, so no sorting is needed downstream.
 */
export function guitarTuningStrings(id: GuitarTuningId): GuitarTuningString[] {
  return GUITAR_TUNINGS[id].midi.map((midi) => {
    /* .note is the raw name ('C#'); .label is glyph-ified ('C♯') and would never
     * match a sample key. */
    const { note, octave } = midiToNoteLabel(midi)

    return { note, octave }
  })
}

/**
 * The tuner's headstock diagram, which straddles a photo of a guitar head:
 * the inline-start column holds strings 4, 5, 6 top to bottom and the inline-end
 * column strings 3, 2, 1.
 */
export function guitarTuningStringPairs(id: GuitarTuningId): {
  left: GuitarTuningString[]
  right: GuitarTuningString[]
} {
  const strings = guitarTuningStrings(id)

  return {
    left: [strings[2], strings[1], strings[0]],
    right: [strings[3], strings[4], strings[5]],
  }
}

/** Display name: the spelled-out letters where there are some, else the translated name. */
export function guitarTuningLabel(
  tuning: GuitarTuning,
  t: (key: string) => string,
): string {
  if (tuning.label) return tuning.label

  return tuning.labelKey ? t(tuning.labelKey) : tuning.id
}

export type GuitarTuningOption = { label: string; value: GuitarTuningId }
export type GuitarTuningOptionGroup = {
  label: string
  items: GuitarTuningOption[]
}

const GUITAR_TUNING_GROUP_ORDER: GuitarTuningGroupId[] = [
  'standard',
  'drop',
  'open',
  'alternate',
]

/**
 * Grouped options for a PrimeSelect, shared by the tuner and the fretboard so
 * both list the same tunings under the same headings.
 *
 * Takes the translate function rather than calling useI18n itself — this is a
 * plain module, not a composable, so it must stay callable outside a component
 * setup scope (and inside a computed, so the list follows a locale change).
 */
export function buildGuitarTuningGroups(
  t: (key: string) => string,
): GuitarTuningOptionGroup[] {
  return GUITAR_TUNING_GROUP_ORDER.map((group) => ({
    label: t(`tuner.tuningGroups.${group}`),
    items: GUITAR_TUNING_IDS.filter((id) => GUITAR_TUNINGS[id].group === group)
      .map((id) => GUITAR_TUNINGS[id])
      .map((tuning) => ({
        label: guitarTuningLabel(tuning, t),
        value: tuning.id,
      })),
  }))
}
