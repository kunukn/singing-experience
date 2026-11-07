import { describe, expect, test } from 'vitest'
import en from './en.json'

/*
 * A missing key falls back to English, and a key copied from en.json without
 * translating looks just as complete to every other check. Both show English
 * text inside a translated page, so this compares every locale with English.
 */
const localeModules = import.meta.glob<{ default: Record<string, unknown> }>(
  './*.json',
  { eager: true },
)
const messagesByLocale = Object.fromEntries(
  Object.entries(localeModules).map(([path, module]) => [
    path.match(/([a-z]+)\.json$/)![1],
    module.default,
  ]),
)

/* Greenlandic keeps newer features in English while it waits for a native speaker */
const LOCALES_PENDING_TRANSLATION = new Set(['en', 'kl'])

/* Symbols, number formats and proper names read the same in every language */
const LANGUAGE_NEUTRAL_KEYS = new Set([
  'generic.previewButton',
  'generic.hz',
  'generic.voiceTypeSpan',
  'generic.voiceTypeSpanCoverage',
  'home.programs.doReMi.name',
  'doReMi.doReMiButton',
  'circleOfFifths.singDoMiSo',
  'scaleDetector.scaleName',
  'scaleDetector.chords.quality.add9',
  'tuner.referencePitch.chip',
  'tuner.referencePitch.estimate',
  'tuner.referencePitch.readout',
  'glossary.hz.name',
  'glossary.bpm.name',
  'glossary.solfege.name',
])
const LANGUAGE_NEUTRAL_PREFIXES = ['singTheKeys.songs.']

/* Words a language spells exactly like English — cognates and music terms */
const COGNATES_BY_LOCALE: Record<string, string[]> = {
  da: [
    'voiceRecorder.quality.standard',
    'generic.start',
    'generic.stop',
    'generic.pause',
    'generic.difficulty_normal',
    'generic.score',
    'generic.tempo',
    'generic.melodyGuide',
    'settings.version',
    'sounds.keyboard',
    'home.programs.guitar.name',
    'pitchDetector.focus.auto',
    'voiceRanges.tenor',
    'tuner.guitar',
    'tuner.ukulele',
    'tuner.tuningGroups.standard',
    'tuner.tuningGroups.drop',
    'tuner.tuningItems.ebStandard',
    'circleOfFifths.findLa',
    'voiceRanges.mezzoSopranoShort',
  ],
  de: [
    'voiceRecorder.quality.standard',
    'voiceRecorder.quality.studio',
    'generic.start',
    'generic.pause',
    'generic.difficulty_normal',
    'generic.tempo',
    'generic.sing',
    'settings.version',
    'sounds.keyboard',
    'sounds.bass',
    'home.programs.graceKelly.name',
    'warmUp.patterns.echo',
    'pitchDetector.focus.auto',
    'voiceRanges.tenor',
    'voiceRanges.bass',
    'voiceRanges.bassToTenor',
    'tuner.ukulele',
    'tuner.tuningGroups.standard',
    'tuner.tuningGroups.drop',
    'glossary.note.name',
    'voiceRangeFinder.slots.name',
    'voiceRanges.mezzoSopranoShort',
  ],
  es: [
    'tools.sections.experimental',
    'games.sections.experimental',
    'generic.difficulty_normal',
    'generic.cents',
    'generic.tempo',
    'home.programs.piano.name',
    'warmUp.patterns.yodel',
    'pitchDetector.focus.auto',
    'voiceRanges.tenorToSoprano',
    'voiceRanges.soprano',
    'voiceRanges.tenor',
    'tuner.tuningGroups.drop',
    'melodyWriter.inputPiano',
    'melodyWriter.pianoLabel',
    'glossary.cents.name',
    'voiceRanges.mezzoSopranoShort',
  ],
  fr: [
    'tools.sections.instruments',
    'voiceRecorder.quality.standard',
    'voiceRecorder.quality.studio',
    'generic.pause',
    'generic.difficulty_normal',
    'generic.octave',
    'generic.score',
    'generic.cents',
    'generic.melodyGuide',
    'generic.scoreCorrect',
    'settings.version',
    'home.programs.piano.name',
    'home.programs.notes.name',
    'warmUp.patterns.trampoline',
    'warmUp.patterns.yodel',
    'pitchDetector.tabs.focus',
    'pitchDetector.focus.auto',
    'voiceRanges.altoToSoprano',
    'voiceRanges.soprano',
    'voiceRanges.alto',
    'tuner.tuningGroups.standard',
    'tuner.tuningGroups.drop',
    'tuner.tuningItems.ebStandard',
    'melodyWriter.inputPiano',
    'melodyWriter.pianoLabel',
    'circleOfFifths.mode',
    'glossary.note.name',
    'glossary.octave.name',
    'glossary.cents.name',
    'voiceRanges.mezzoSopranoShort',
  ],
  id: [
    'voiceRecorder.quality.studio',
    'generic.difficulty_normal',
    'generic.tempo',
    'sounds.keyboard',
    'sounds.bass',
    'home.programs.piano.name',
    'warmUp.patterns.yodel',
    'warmUp.patterns.rollerCoaster',
    'voiceRanges.alto',
    'voiceRanges.tenor',
    'voiceRanges.bass',
    'voiceRanges.bassToTenor',
    'scaleDetector.chords.quality.minor',
    'scaleDetector.chords.quality.diminished',
    'scaleDetector.chords.quality.augmented',
    'tuner.ukulele',
    'tuner.tuningGroups.drop',
    'melodyWriter.inputPiano',
    'melodyWriter.pianoLabel',
    'scale.scaleModes.aeolian',
    'scale.scaleModes.dorian',
    'scale.scaleModes.lydian',
    'scale.scaleModes.mixolydian',
    'circleOfFifths.mode',
    'circleOfFifths.relativeMinor',
    'voiceRanges.mezzoSopranoShort',
  ],
  pt: [
    'tools.sections.experimental',
    'games.sections.experimental',
    'generic.difficulty_normal',
    'generic.cents',
    'generic.tempo',
    'home.programs.piano.name',
    'warmUp.patterns.yodel',
    'pitchDetector.focus.auto',
    'voiceRanges.tenorToSoprano',
    'voiceRanges.soprano',
    'voiceRanges.tenor',
    'tuner.ukulele',
    'tuner.tuningGroups.drop',
    'melodyWriter.inputPiano',
    'melodyWriter.pianoLabel',
    'glossary.cents.name',
    'voiceRanges.mezzoSopranoShort',
  ],
  sw: [
    'voiceRecorder.quality.studio',
    'generic.tempo',
    'home.programs.piano.name',
    'warmUp.patterns.yodel',
    'voiceRanges.altoToSoprano',
    'voiceRanges.soprano',
    'voiceRanges.mezzoSoprano',
    'voiceRanges.alto',
    'tuner.ukulele',
    'tuner.tuningGroups.drop',
    'melodyWriter.inputPiano',
    'melodyWriter.pianoLabel',
    'circleOfFifths.relativeMinor',
    'voiceRanges.mezzoSopranoShort',
  ],
}

function flatten(node: unknown, prefix = ''): [string, unknown][] {
  if (typeof node !== 'object' || node === null) return [[prefix, node]]

  return Object.entries(node).flatMap(([key, value]) =>
    flatten(value, prefix ? `${prefix}.${key}` : key),
  )
}

const englishEntries = flatten(en)
const translatedLocales = Object.keys(messagesByLocale).filter(
  (locale) => !LOCALES_PENDING_TRANSLATION.has(locale),
)

function isLanguageNeutral(key: string) {
  return (
    LANGUAGE_NEUTRAL_KEYS.has(key) ||
    LANGUAGE_NEUTRAL_PREFIXES.some((prefix) => key.startsWith(prefix))
  )
}

describe('locale completeness', () => {
  test.each(translatedLocales)(
    'should have every English key in %s',
    (locale) => {
      const keys = new Set(
        flatten(messagesByLocale[locale]).map(([key]) => key),
      )
      const missing = englishEntries
        .map(([key]) => key)
        .filter((key) => !keys.has(key))

      expect(missing).toEqual([])
    },
  )

  test.each(translatedLocales)(
    'should translate every string in %s',
    (locale) => {
      const values = new Map(flatten(messagesByLocale[locale]))
      const cognates = new Set(COGNATES_BY_LOCALE[locale] ?? [])
      const untranslated = englishEntries
        .filter(([key, value]) => values.get(key) === value)
        .map(([key]) => key)
        .filter((key) => !isLanguageNeutral(key) && !cognates.has(key))

      expect(untranslated).toEqual([])
    },
  )

  /* A stale allowlist entry would hide the next untranslated copy of that key */
  test.each(Object.keys(COGNATES_BY_LOCALE))(
    'should list only cognates that still match English in %s',
    (locale) => {
      const values = new Map(flatten(messagesByLocale[locale]))
      const english = new Map(englishEntries)
      const stale = COGNATES_BY_LOCALE[locale].filter(
        (key) => values.get(key) !== english.get(key),
      )

      expect(stale).toEqual([])
    },
  )
})
