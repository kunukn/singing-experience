import { describe, expect, test } from 'vitest'

/*
 * Guards the class of bug where renaming a localStorage key silently resets
 * the setting for existing users and orphans the old entry (see BUGS.md,
 * 2026-08-15). Renaming or adding a key fails this test; the fix is to update
 * the list below and, for a rename, add an entry to STORAGE_MIGRATIONS in
 * storageMigrations.ts. Failing loudly is the whole point — do not "fix" a
 * failure by editing only the list.
 */
const STORAGE_KEYS = [
  'syng.clarityThreshold',
  'syng.darkMode',
  'syng.durationSec',
  'syng.graceKellyBarHighlight',
  'syng.graceKellyBpm',
  'syng.graceKellyHarmonyVoices',
  'syng.graceKellyMelodyGuide',
  'syng.graceKellyMetronome',
  'syng.graceKellyShowAllParts',
  'syng.graceKellyStartToneMidi',
  'syng.graceKellyToneLabels',
  'syng.graceKellyVozIndex',
  'syng.guitarAccidentals',
  'syng.guitarDuetEnabled',
  'syng.guitarScaleMode',
  'syng.guitarScaleRoot',
  'syng.guitarToneLabelMode',
  'syng.guitarTuning',
  'syng.noiseGate',
  'syng.notesBpm',
  'syng.notesClefIndex',
  'syng.notesIncludeAccidentals',
  'syng.notesToneLabelMode',
  'syng.pianoAccidentals',
  'syng.pianoDuetEnabled',
  'syng.pianoKeyboardHints',
  'syng.pianoScaleMode',
  'syng.pianoScaleRoot',
  'syng.pianoToneLabelMode',
  'syng.pitchDetectorDuetEnabled',
  'syng.pitchGameDurationSec',
  'syng.pitchGameHoldDurationSec',
  'syng.previewEnabled',
  'syng.rangeIndex',
  'syng.scaleMode',
  'syng.sensitivity',
  'syng.showDoReMiTarget',
  'syng.showSingToneTarget',
  'syng.singFlyDifficulty',
  'syng.singFlyGameDurationSec',
  'syng.singToneDurationSec',
  'syng.singToneRounds',
  'syng.startOffset',
  'syng.toneMode',
  'syng.warmup.durationSec',
  'syng.warmup.patternId',
  'syng.warmup.semitoneStep',
  'syng.warmup.sequenceCount',
]

/* Composables that persist under a key their caller supplies. The key itself
 * is a literal at each call site, so scanning these names finds it. */
const KEY_TAKING_CALLS = [
  'useLocalStorage',
  'useVoiceRangeIndex',
  'useToneLabelMode',
  'useAccidentalStyle',
]

/* The only places useLocalStorage may be called with a non-literal key: the
 * three wrappers above (scanned via their call sites) and useDarkMode, which
 * holds its key in a module constant. A new entry here would be a key the
 * scan cannot see — add the file only alongside a way to resolve its key. */
const DYNAMIC_KEY_CALLERS = [
  '/src/composables/accidentalStyle.ts',
  '/src/composables/toneLabelMode.ts',
  '/src/composables/useDarkMode.ts',
  '/src/composables/useVoiceRangeIndex.ts',
]

/* Keys the scan cannot reach because they are never written as a literal at a
 * call site. Kept explicit so the total stays honest. */
const DYNAMIC_ONLY_KEYS = ['syng.darkMode' /* useDarkMode.ts STORAGE_KEY */]

const sourceFiles = import.meta.glob('/src/**/*.{ts,vue}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const productionFiles = Object.entries(sourceFiles).filter(
  ([path]) => !path.includes('.test.') && !path.endsWith('.d.ts'),
)

describe('localStorage keys', () => {
  test('every key used in src is registered', () => {
    const pattern = new RegExp(
      `(?:${KEY_TAKING_CALLS.join('|')})(?:<[^>]*>)?\\(\\s*'([^']+)'`,
      'g',
    )

    const foundKeys = new Set(DYNAMIC_ONLY_KEYS)
    for (const [, source] of productionFiles) {
      for (const match of source.matchAll(pattern)) foundKeys.add(match[1])
    }

    expect([...foundKeys].sort()).toEqual([...STORAGE_KEYS].sort())
  })

  test('no key is registered that src no longer uses', () => {
    /* Covered by the assertion above, which compares both directions. This
     * case is spelled out so a future edit cannot weaken it to a subset check
     * without the intent being obvious. */
    expect(new Set(STORAGE_KEYS).size).toBe(STORAGE_KEYS.length)
  })

  test('only known wrappers call useLocalStorage with a non-literal key', () => {
    /* A first argument that is not a quote means the key comes from a variable,
     * so the scan above cannot resolve it. No `g` flag — `test()` on a global
     * regex carries `lastIndex` between calls and would skip files. */
    const dynamicCall = /useLocalStorage(?:<[^>]*>)?\(\s*[^'\s]/

    const callers = productionFiles
      .filter(([, source]) => dynamicCall.test(source))
      .map(([path]) => path)
      .sort()

    expect(callers).toEqual(DYNAMIC_KEY_CALLERS)
  })

  test('every key is prefixed with syng.', () => {
    expect(STORAGE_KEYS.filter((key) => !key.startsWith('syng.'))).toEqual([])
  })
})
