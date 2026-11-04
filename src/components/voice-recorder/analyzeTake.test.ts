import { describe, expect, test } from 'vitest'

import { analyzeTake } from './analyzeTake'
import { createSyntheticTake, type SyntheticPresetName } from './syntheticTake'

const cache = new Map<SyntheticPresetName, ReturnType<typeof analyzeTake>>()

function analyzePreset(name: SyntheticPresetName) {
  const existing = cache.get(name)
  if (existing) return existing

  const analysis = analyzeTake(createSyntheticTake(name))
  cache.set(name, analysis)

  return analysis
}

const SCALE_MIDIS = [60, 62, 64, 65, 67, 69, 71, 72]

describe('analyzeTake - notes', () => {
  test('finds every note of a clean scale at the right time', async () => {
    const { notes, key } = await analyzePreset('steadyScale')

    expect(notes).toHaveLength(28)
    expect(notes.slice(0, 8).map((note) => note.midi)).toEqual(SCALE_MIDIS)
    /* Second note starts one 700 ms tone plus an 80 ms gap in. */
    expect(Math.abs(notes[1].startMs - 780)).toBeLessThanOrEqual(30)
    expect(key?.pitchClasses.has(0)).toBe(true)
    expect(key?.pitchClasses.has(1)).toBe(false)
    expect(key?.pitchClasses.size).toBe(7)
  })

  test('lists notes used from highest to lowest', async () => {
    const { notesUsed } = await analyzePreset('steadyScale')
    const midis = notesUsed.map((use) => use.midi)

    expect(midis).toEqual(midis.toSorted((a, b) => b - a))
  })

  test('folds brief octave glitches back into the note', async () => {
    const { notes } = await analyzePreset('octaveGlitches')

    expect(notes).toHaveLength(28)
    expect(notes.slice(0, 8).map((note) => note.midi)).toEqual(SCALE_MIDIS)
  })

  test('does not split notes with centred vibrato', async () => {
    const { notes } = await analyzePreset('vibrato')

    expect(notes).toHaveLength(14)
    expect(notes[0].vibrato?.rateHz).toBeCloseTo(5.5, 0)
  })

  test('reads the right notes through off-centre vibrato', async () => {
    const { notes, key, tuning } = await analyzePreset('wideVibratoOffCenter')

    expect(notes).toHaveLength(14)
    expect(notes.slice(0, 8).map((note) => note.midi)).toEqual(SCALE_MIDIS)
    expect(key?.pitchClasses.has(1)).toBe(false)
    expect(Math.abs(tuning.offsetCents - 25)).toBeLessThanOrEqual(5)
  })

  test('reads vibrato as tuned, not half a semitone off', async () => {
    const { tuning } = await analyzePreset('vibrato')

    expect(Math.abs(tuning.offsetCents)).toBeLessThanOrEqual(5)
  })

  test('folds a slide into the note it was heading for', async () => {
    const { notes, key } = await analyzePreset('portamento')

    expect(notes.slice(0, 8).map((note) => note.midi)).toEqual(SCALE_MIDIS)
    expect(notes).toHaveLength(28)
    expect(notes.filter((note) => note.hasSlideIn).length).toBeGreaterThan(20)
    expect(key?.pitchClasses.has(1)).toBe(false)
  })

  test('counts clean starts relative to the singer, not to A=440', async () => {
    const flat = await analyzePreset('flatTuning')
    const slides = await analyzePreset('portamento')

    expect(flat.rating!.cleanStartShare).toBeGreaterThan(0.9)
    expect(slides.rating!.cleanStartShare).toBeLessThan(0.3)
  })
})

describe('analyzeTake - tuning', () => {
  test('reads a flat singer as flat without marking the notes wrong', async () => {
    const flat = await analyzePreset('flatTuning')
    const clean = await analyzePreset('steadyScale')

    expect(Math.abs(flat.tuning.offsetCents + 35)).toBeLessThanOrEqual(3)
    expect(flat.notes.slice(0, 8).map((note) => note.midi)).toEqual(SCALE_MIDIS)
    expect(flat.rating!.centring).toBeCloseTo(clean.rating!.centring, 1)
  })

  test('tracks drift without doubling notes at the semitone crossing', async () => {
    const { notes, tuning } = await analyzePreset('drift')

    expect(notes).toHaveLength(60)
    expect(tuning.driftCents).toBeLessThan(-30)
    expect(tuning.driftCents).toBeGreaterThan(-60)
  })
})

describe('analyzeTake - profile', () => {
  test('recognises one repeated note as monotonic', async () => {
    const { profile, key } = await analyzePreset('monotone')

    expect(profile?.words).toContain('monotonic')
    expect(key).toBeNull()
  })

  test('does not call one held note romantic, vibrato or not', async () => {
    const { profile } = await analyzePreset('heldVibratoNote')

    expect(profile?.words).toContain('monotonic')
    expect(profile?.words).not.toContain('romantic')
  })

  test('reads short detached notes as fast and choppy', async () => {
    const { notes, profile } = await analyzePreset('staccato')
    const axis = (key: string) =>
      profile!.axes.find((item) => item.key === key)!.value

    expect(notes.length).toBeGreaterThan(90)
    expect(axis('tempo')).toBeGreaterThan(0.6)
    expect(axis('choppy')).toBeGreaterThan(0.3)
  })

  test('reads a melody with range as melodic', async () => {
    const { profile } = await analyzePreset('steadyScale')

    expect(profile?.words).toContain('melodic')
  })

  test('reads held loud and soft notes as dramatic', async () => {
    const { profile } = await analyzePreset('dramaticBallad')

    expect(profile?.words).toContain('dramatic')
  })

  test('reads quick unpitched syllables as rap-like', async () => {
    const { profile } = await analyzePreset('speechLike')

    expect(profile?.words).toContain('rapLike')
  })

  test('hides the dynamics reading when auto gain was on', async () => {
    const analysis = await analyzeTake(createSyntheticTake('steadyScale'), {
      hasAutoGain: true,
    })

    expect(analysis.profile?.axes.map((axis) => axis.key)).not.toContain(
      'dramatic',
    )
  })
})

describe('analyzeTake - rating', () => {
  test('scores clean singing highly', async () => {
    const { rating } = await analyzePreset('steadyScale')

    expect(rating!.overall).toBeGreaterThan(0.9)
    expect(rating!.level).toBe('pitchPerfect')
  })

  test('does not reward vibrato absence or punish its presence', async () => {
    const { rating } = await analyzePreset('vibrato')

    expect(rating!.steadiness).toBeGreaterThan(0.8)
    expect(rating!.vibratoShare).toBeGreaterThan(0.8)
  })

  test('scores random pitches close to zero for centring', async () => {
    const { rating } = await analyzePreset('offKey')

    expect(rating!.centring).toBeLessThan(0.3)
  })

  test.each<SyntheticPresetName>(['tooShort', 'silence'])(
    'gives no rating to %s',
    async (name) => {
      const { rating } = await analyzePreset(name)

      expect(rating).toBeNull()
    },
  )
})

describe('analyzeTake - quality', () => {
  test('warns about clipping', async () => {
    const { quality } = await analyzePreset('clipped')

    expect(quality.isClipped).toBe(true)
  })

  test('warns about a very quiet take', async () => {
    const { quality } = await analyzePreset('tooQuiet')

    expect(quality.isTooQuiet).toBe(true)
  })

  test('finds no notes in silence', async () => {
    const { notes, notesUsed, key } = await analyzePreset('silence')

    expect(notes).toEqual([])
    expect(notesUsed).toEqual([])
    expect(key).toBeNull()
  })

  test('stops when cancelled', async () => {
    const controller = new AbortController()
    controller.abort()

    await expect(
      analyzeTake(createSyntheticTake('tooShort'), {
        signal: controller.signal,
      }),
    ).rejects.toThrow()
  })
})
