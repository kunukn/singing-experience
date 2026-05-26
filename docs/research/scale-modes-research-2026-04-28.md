# Scale Mode Research for the Do Re Mi Game

## Executive Summary

The Do Re Mi game uses **heptatonic scales** (7 distinct pitches + octave = 8 semitone values, always ending at 12). The 7 existing modes are the classical Greek/church modes — only one of many heptatonic scale families. At least **30+ additional well-known heptatonic scales** exist across four major families: Melodic Minor modes, Harmonic Minor modes, Harmonic Major modes, and World/Ethnic scales. Jazz relies primarily on the Melodic Minor family. Blues scales are hexatonic (6 pitches) and **do not fit** the 8-note constraint without redesigning the solfège label system. The most impactful additions for a singing game are Harmonic Minor, Phrygian Dominant, Melodic Minor, and Lydian Dominant.

---

## The Constraint: What "8 Notes" Means

From the code in `src/utils/noteUtils.ts`:

```typescript
const SOLFEGE_LABELS = ['DO', 'RE', 'MI', 'FA', 'SO', 'LA', 'TI', 'DO'] as const
// 8 labels — 7 distinct pitches + the octave repeat
```

All `SCALE_MODE_SEMITONES` arrays have exactly **8 values**, always ending with `12`:
```
[0, ?, ?, ?, ?, ?, ?, 12]
 ↑                       ↑
root                   octave
```

This means only **heptatonic scales** (7-note-per-octave scales) work as-is. The existing modes are the 7 standard diatonic church modes — one family among many.

---

## Family 1: Church Modes (Already Implemented)

The 7 Greek modes — all rotations of the same whole-tone/half-tone pattern.

| Mode | Semitones | Character |
|------|-----------|-----------|
| Ionian | `[0, 2, 4, 5, 7, 9, 11, 12]` | Happy, bright — standard Major scale |
| Dorian | `[0, 2, 3, 5, 7, 9, 10, 12]` | Jazzy minor, modal jazz/folk |
| Phrygian | `[0, 1, 3, 5, 7, 8, 10, 12]` | Dark, Spanish/Flamenco feel |
| Lydian | `[0, 2, 4, 6, 7, 9, 11, 12]` | Dreamy, ethereal (Simpsons theme) |
| Mixolydian | `[0, 2, 4, 5, 7, 9, 10, 12]` | Bluesy major, rock/folk |
| Aeolian | `[0, 2, 3, 5, 7, 8, 10, 12]` | Natural minor, sad/dark |
| Locrian | `[0, 1, 3, 5, 6, 8, 10, 12]` | Most dissonant, rarely used melodically |

---

## Family 2: Melodic Minor Modes (Jazz's Primary Scale Family)

The **ascending melodic minor scale** has a raised 6th and 7th compared to natural minor. In jazz, this scale is used in both directions (unlike classical, where the descending form reverts to Aeolian). All 7 rotations of this scale are widely used in jazz improvisation.

**Parent scale:** Melodic Minor = `[0, 2, 3, 5, 7, 9, 11, 12]` (W H W W W W H)

| Mode | Semitones | Jazz Name | Use Case |
|------|-----------|-----------|----------|
| Mode 1 | `[0, 2, 3, 5, 7, 9, 11, 12]` | **Melodic Minor** (Jazz Minor) | m/maj7 chords, minor key jazz |
| Mode 2 | `[0, 1, 3, 5, 7, 9, 10, 12]` | **Dorian ♭2** (Phrygidorian) | m7b9 chords |
| Mode 3 | `[0, 2, 4, 6, 8, 9, 11, 12]` | **Lydian Augmented** (#4 and #5) | maj7#5 chords |
| Mode 4 | `[0, 2, 4, 6, 7, 9, 10, 12]` | **Lydian Dominant** (Lydian ♭7) | Dominant 7th/tritone sub — very common in jazz |
| Mode 5 | `[0, 2, 4, 5, 7, 8, 10, 12]` | **Mixolydian ♭6** (Aeolian Dominant) | Dominant 7th with b6 color |
| Mode 6 | `[0, 2, 3, 5, 6, 8, 10, 12]` | **Locrian ♮2** (Half-Diminished) | m7b5 chords (half-diminished), very common in jazz |
| Mode 7 | `[0, 1, 3, 4, 6, 8, 10, 12]` | **Altered Scale** (Super Locrian) | Altered dominant chords (7alt) — the most "outside" jazz scale |

### Jazz Significance
- **Lydian Dominant** is arguably the most important jazz scale after the church modes — used on dominant 7th chords and tritone substitutions
- **Altered Scale** is ubiquitous in modern jazz when playing over dominant 7alt chords (7#9, 7b9, 7#11 etc.)
- **Locrian ♮2** is the standard choice over m7♭5 (half-diminished) chords in ii-V-i progressions

---

## Family 3: Harmonic Minor Modes

The **harmonic minor scale** raises the 7th degree of natural minor to create a leading tone, resulting in an augmented 2nd interval (3 semitones) between the 6th and 7th. This augmented 2nd gives harmonic minor its characteristic exotic/classical sound.

**Parent scale:** Harmonic Minor = `[0, 2, 3, 5, 7, 8, 11, 12]` (W H W W H A H)

| Mode | Semitones | Name | Use Case |
|------|-----------|------|----------|
| Mode 1 | `[0, 2, 3, 5, 7, 8, 11, 12]` | **Harmonic Minor** | Classical, neoclassical metal, "dark classical" |
| Mode 2 | `[0, 1, 3, 5, 6, 9, 10, 12]` | **Locrian ♮6** | Over m7b5 chords with natural 6 |
| Mode 3 | `[0, 2, 4, 5, 8, 9, 11, 12]` | **Ionian #5** (Augmented Major) | Over maj7#5 chords |
| Mode 4 | `[0, 2, 3, 6, 7, 9, 10, 12]` | **Dorian #4** (Ukrainian Dorian / Romanian) | Eastern European folk music |
| Mode 5 | `[0, 1, 4, 5, 7, 8, 10, 12]` | **Phrygian Dominant** (Spanish Phrygian) | Flamenco, Middle Eastern, metal, Star Wars |
| Mode 6 | `[0, 3, 4, 6, 7, 9, 11, 12]` | **Lydian #2** | Over maj7 with #9 |
| Mode 7 | `[0, 1, 3, 4, 6, 8, 9, 12]` | **Super Locrian ♭♭7** | Diminished dominant context |

### Standout Mode: Phrygian Dominant
`[0, 1, 4, 5, 7, 8, 10, 12]` — **Extremely recognizable sound.** This scale (H A H W H W W) features an augmented 2nd between scale degrees 1 and 2 (semitone) then jumps 3 to the major 3rd. It is the scale behind:
- Flamenco guitar (Andalusian cadence)
- The *Star Wars* Force theme resolution
- Most "Middle Eastern" movie soundtracks
- Countless heavy metal riffs (Metallica, Dio)
- The harmonic series on the 5th degree of harmonic minor

### Standout Mode: Harmonic Minor
`[0, 2, 3, 5, 7, 8, 11, 12]` — The most widely taught minor scale in classical music. Differs from natural minor only by raising the 7th by one semitone. Common in baroque/classical music, neoclassical metal (Yngwie Malmsteen), and tango.

---

## Family 4: Harmonic Major Modes

The **harmonic major scale** is the major scale with a lowered 6th degree, creating the same augmented 2nd found in harmonic minor, but in a major context.

**Parent scale:** Harmonic Major = `[0, 2, 4, 5, 7, 8, 11, 12]` (W W H W H A H)

| Mode | Semitones | Name | Use Case |
|------|----------|------|----------|
| Mode 1 | `[0, 2, 4, 5, 7, 8, 11, 12]` | **Harmonic Major** | Classical, dramatic major passages |
| Mode 2 | `[0, 2, 3, 5, 6, 9, 10, 12]` | **Dorian ♭5** | |
| Mode 3 | `[0, 1, 3, 4, 7, 8, 10, 12]` | **Phrygian ♭4** | |
| Mode 4 | `[0, 2, 3, 6, 7, 9, 11, 12]` | **Lydian ♭3** (Lydian Minor) | |
| Mode 5 | `[0, 1, 4, 5, 7, 9, 10, 12]` | **Mixolydian ♭2** | |
| Mode 6 | `[0, 3, 4, 6, 8, 9, 11, 12]` | **Lydian Augmented #2** | |
| Mode 7 | `[0, 1, 3, 5, 6, 8, 9, 12]` | **Locrian ♭♭7** | |

---

## Family 5: World & Ethnic Heptatonic Scales

These scales originate from specific musical traditions and feature augmented seconds or other distinctive intervals not found in diatonic scales.

| Scale | Semitones | Origin / Character |
|-------|-----------|-------------------|
| **Double Harmonic Major** (Byzantine / Arabic) | `[0, 1, 4, 5, 7, 8, 11, 12]` | Two augmented seconds — very exotic, Middle Eastern / Eastern European. Features in Dick Dale's *Misirlou* |
| **Hungarian Minor** (Gypsy Minor) | `[0, 2, 3, 6, 7, 8, 11, 12]` | Raised 4th and raised 7th — Romani/Eastern European character |
| **Hungarian Major** | `[0, 3, 4, 6, 7, 9, 10, 12]` | Like Lydian but with raised 2nd and flat 7th |
| **Neapolitan Minor** | `[0, 1, 3, 5, 7, 8, 11, 12]` | Neapolitan school, Romantic era, dramatic |
| **Neapolitan Major** | `[0, 1, 3, 5, 7, 9, 11, 12]` | Opens with b2, otherwise major — distinctive |
| **Persian** | `[0, 1, 4, 5, 6, 8, 11, 12]` | Distinct from Phrygian Dominant — b4 and bb7 |
| **Ukrainian Dorian** (Romanian Minor / Dorian #4) | `[0, 2, 3, 6, 7, 9, 10, 12]` | Same as Mode 4 of harmonic minor. Folk music of Ukraine/Romania. |
| **Major Locrian** (Arabian) | `[0, 2, 4, 5, 6, 8, 10, 12]` | Major scale with b5 and b7 |
| **Leading Whole Tone** | `[0, 2, 4, 6, 8, 10, 11, 12]` | Whole tones with leading tone — very unstable |

### Double Harmonic Major (Byzantine) — Semitone Verification
Step pattern: H A H W H A H = 1, 3, 1, 2, 1, 3, 1  
`0 → 1 → 4 → 5 → 7 → 8 → 11 → 12` ✓

### Hungarian Minor — Semitone Verification
Step pattern: W H A H H A H = 2, 1, 3, 1, 1, 3, 1  
`0 → 2 → 3 → 6 → 7 → 8 → 11 → 12` ✓

---

## Why Blues Scales Don't Fit

Blues scales are **hexatonic** (6 pitches per octave, not 7):

| Blues Scale | Pitches | Semitones | Count |
|-------------|---------|-----------|-------|
| Minor Blues | root, b3, 4, b5, 5, b7 | `[0, 3, 5, 6, 7, 10, 12]` | 7 values (6 pitches + octave) |
| Major Blues | root, 2, b3, 3, 5, 6 | `[0, 2, 3, 4, 7, 9, 12]` | 7 values (6 pitches + octave) |

These arrays have **7 values, not 8**. The solfège system (`['DO', 'RE', 'MI', 'FA', 'SO', 'LA', 'TI', 'DO']`) has 8 fixed slots, so blues scales would leave one slot unused, which would break `buildScale()`.

**Option if blues support is desired:** Add a separate `buildHexatonicScale()` function with 6-note solfège labels (`['DO', 'RE', 'MI', 'FA', 'SO', 'LA']` or custom blues names like `['1', 'b3', '4', 'b5', '5', 'b7']`). This is a non-trivial change to the game loop.

---

## Practical Recommendations for the Do Re Mi Game

### Tier 1 — High Impact (Widely Known, Very Singable)

| Mode | Semitones | Why Add It |
|------|-----------|------------|
| **Harmonic Minor** | `[0, 2, 3, 5, 7, 8, 11, 12]` | Universally recognizable "classical minor" — raises 7th for leading tone. Most taught minor scale. |
| **Melodic Minor** | `[0, 2, 3, 5, 7, 9, 11, 12]` | Standard classical vocal training. Exactly like major but with a flatted 3rd. |
| **Phrygian Dominant** | `[0, 1, 4, 5, 7, 8, 10, 12]` | Instantly recognizable (Flamenco, Middle Eastern, Star Wars). Great for ear training contrast. |
| **Lydian Dominant** | `[0, 2, 4, 6, 7, 9, 10, 12]` | Most important jazz/film music scale beyond the 7 modes. Lydian with flat 7th. |

### Tier 2 — Good for Variety (Moderate Familiarity)

| Mode | Semitones | Why Add It |
|------|-----------|------------|
| **Harmonic Major** | `[0, 2, 4, 5, 7, 8, 11, 12]` | Like major but with a dark b6 — common in film scoring |
| **Double Harmonic / Byzantine** | `[0, 1, 4, 5, 7, 8, 11, 12]` | Two augmented 2nds — extremely distinctive, great for exotic ear training |
| **Hungarian Minor** (Gypsy) | `[0, 2, 3, 6, 7, 8, 11, 12]` | Romani/Eastern European sound — very memorable |
| **Locrian ♮2** | `[0, 2, 3, 5, 6, 8, 10, 12]` | Standard jazz scale for m7b5 chords |

### Tier 3 — Advanced / Niche

| Mode | Semitones | Why Add It |
|------|-----------|------------|
| **Altered Scale** | `[0, 1, 3, 4, 6, 8, 10, 12]` | Essential for advanced jazz improvisation |
| **Mixolydian ♭6** | `[0, 2, 4, 5, 7, 8, 10, 12]` | Jazz dominant with dark 6th |
| **Dorian ♭2** | `[0, 1, 3, 5, 7, 9, 10, 12]` | Phrygian with a major 6th — softer exotic feel |
| **Neapolitan Minor** | `[0, 1, 3, 5, 7, 8, 11, 12]` | Classical / Romantic era |
| **Lydian Augmented** | `[0, 2, 4, 6, 8, 9, 11, 12]` | Film/jazz — bright with raised 4th and 5th |

---

## Ready-to-Use TypeScript

Below are verified semitone arrays for drop-in use in `SCALE_MODE_SEMITONES` and `SCALE_MODE_OPTIONS`:

```typescript
// === Melodic Minor Family ===
melodicMinor:      [0, 2, 3, 5, 7, 9, 11, 12],  // Jazz Minor
dorianFlat2:       [0, 1, 3, 5, 7, 9, 10, 12],  // Phrygidorian
lydianAugmented:   [0, 2, 4, 6, 8, 9, 11, 12],  // Lydian #5
lydianDominant:    [0, 2, 4, 6, 7, 9, 10, 12],  // Lydian b7 — very common jazz
mixolydianFlat6:   [0, 2, 4, 5, 7, 8, 10, 12],  // Aeolian Dominant
locrianSharp2:     [0, 2, 3, 5, 6, 8, 10, 12],  // Half-Diminished — common jazz
alteredScale:      [0, 1, 3, 4, 6, 8, 10, 12],  // Super Locrian / 7alt

// === Harmonic Minor Family ===
harmonicMinor:        [0, 2, 3, 5, 7, 8, 11, 12],  // Classical / neoclassical metal
locrianSharp6:        [0, 1, 3, 5, 6, 9, 10, 12],
ionianSharp5:         [0, 2, 4, 5, 8, 9, 11, 12],  // Augmented Major
ukrainianDorian:      [0, 2, 3, 6, 7, 9, 10, 12],  // Romanian / Dorian #4
phrygianDominant:     [0, 1, 4, 5, 7, 8, 10, 12],  // Spanish / Flamenco — very recognizable
lydianSharp2:         [0, 3, 4, 6, 7, 9, 11, 12],

// === Harmonic Major Family ===
harmonicMajor:     [0, 2, 4, 5, 7, 8, 11, 12],  // Major with b6

// === World / Ethnic ===
doubleHarmonic:    [0, 1, 4, 5, 7, 8, 11, 12],  // Byzantine / Arabic — 2 aug 2nds
hungarianMinor:    [0, 2, 3, 6, 7, 8, 11, 12],  // Gypsy Minor
hungarianMajor:    [0, 3, 4, 6, 7, 9, 10, 12],
neapolitanMinor:   [0, 1, 3, 5, 7, 8, 11, 12],
neapolitanMajor:   [0, 1, 3, 5, 7, 9, 11, 12],
persian:           [0, 1, 4, 5, 6, 8, 11, 12],
```

### Label Suggestions for `SCALE_MODE_OPTIONS`

```typescript
{ id: 'harmonicMinor',    label: 'Harmonic Minor' },
{ id: 'melodicMinor',     label: 'Melodic Minor' },
{ id: 'phrygianDominant', label: 'Phrygian Dominant (Spanish)' },
{ id: 'lydianDominant',   label: 'Lydian Dominant' },
{ id: 'harmonicMajor',    label: 'Harmonic Major' },
{ id: 'doubleHarmonic',   label: 'Double Harmonic (Byzantine)' },
{ id: 'hungarianMinor',   label: 'Hungarian Minor (Gypsy)' },
{ id: 'locrianSharp2',    label: 'Locrian ♮2 (Half-Diminished)' },
{ id: 'alteredScale',     label: 'Altered Scale' },
{ id: 'lydianAugmented',  label: 'Lydian Augmented' },
{ id: 'mixolydianFlat6',  label: 'Mixolydian ♭6' },
{ id: 'ukrainianDorian',  label: 'Ukrainian Dorian (Romanian)' },
{ id: 'neapolitanMinor',  label: 'Neapolitan Minor' },
```

---

## Complete Reference Table: All Heptatonic Scales with Intervals

The interval pattern (step sizes in semitones) is shown as W=2, H=1, A=3 (augmented 2nd).

| Family | Scale | Pattern | Semitones | Distinctive Interval |
|--------|-------|---------|-----------|---------------------|
| Diatonic | Ionian | W W H W W W H | `[0,2,4,5,7,9,11,12]` | None |
| Diatonic | Dorian | W H W W W H W | `[0,2,3,5,7,9,10,12]` | ♮6 in minor context |
| Diatonic | Phrygian | H W W W H W W | `[0,1,3,5,7,8,10,12]` | ♭2 |
| Diatonic | Lydian | W W W H W W H | `[0,2,4,6,7,9,11,12]` | #4 |
| Diatonic | Mixolydian | W W H W W H W | `[0,2,4,5,7,9,10,12]` | ♭7 |
| Diatonic | Aeolian | W H W W H W W | `[0,2,3,5,7,8,10,12]` | ♭6 ♭7 |
| Diatonic | Locrian | H W W H W W W | `[0,1,3,5,6,8,10,12]` | ♭2 ♭5 |
| Mel. Min. | Jazz Minor | W H W W W W H | `[0,2,3,5,7,9,11,12]` | ♭3 + ♮6 + ♮7 |
| Mel. Min. | Dorian ♭2 | H W W W W H W | `[0,1,3,5,7,9,10,12]` | ♭2 + ♮6 |
| Mel. Min. | Lydian Aug. | W W W W H W H | `[0,2,4,6,8,9,11,12]` | #4 #5 |
| Mel. Min. | Lydian Dom. | W W W H W H W | `[0,2,4,6,7,9,10,12]` | #4 ♭7 |
| Mel. Min. | Mixo ♭6 | W W H W H W W | `[0,2,4,5,7,8,10,12]` | ♭6 |
| Mel. Min. | Locrian ♮2 | W H W H W W W | `[0,2,3,5,6,8,10,12]` | ♮2 ♭5 |
| Mel. Min. | Altered | H W H H W W W | `[0,1,3,4,6,8,10,12]` | ♭2 ♭3 ♭4 ♭5 ♭7 |
| Harm. Min. | Harmonic Minor | W H W W H A H | `[0,2,3,5,7,8,11,12]` | Aug2 (6→7) |
| Harm. Min. | Locrian ♮6 | H W W H A W W | `[0,1,3,5,6,9,10,12]` | Aug2 within |
| Harm. Min. | Ionian #5 | W W H A H W H | `[0,2,4,5,8,9,11,12]` | #5 |
| Harm. Min. | Dorian #4 | W H A H W W H | `[0,2,3,6,7,9,10,12]` | #4 |
| Harm. Min. | Phrygian Dom. | H A H W H W W | `[0,1,4,5,7,8,10,12]` | Aug2 (1→3) |
| Harm. Min. | Lydian #2 | A H W H W H W | `[0,3,4,6,7,9,11,12]` | Aug2 (1→2) |
| Harm. Maj. | Harmonic Major | W W H W H A H | `[0,2,4,5,7,8,11,12]` | Aug2 (6→7) |
| World | Double Harmonic | H A H W H A H | `[0,1,4,5,7,8,11,12]` | Two aug2nds |
| World | Hungarian Minor | W H A H H A H | `[0,2,3,6,7,8,11,12]` | Two aug2nds |
| World | Neapolitan Minor | H W W W H A H | `[0,1,3,5,7,8,11,12]` | ♭2 + Aug2 |
| World | Neapolitan Major | H W W W W W H | `[0,1,3,5,7,9,11,12]` | ♭2 |
| World | Persian | H A H H W A H | `[0,1,4,5,6,8,11,12]` | Two aug2nds, ♭5 |

---

## Confidence Assessment

- **Semitone arrays**: All verified by manual interval calculation from the parent scale. High confidence.
- **Jazz scale names and usage**: High confidence — these are standard jazz pedagogy terms.
- **Blues scales don't fit**: Certain — the arrays are 7 elements vs. the required 8.
- **Harmonic Major modes beyond Mode 1**: Medium confidence on naming conventions (less standardized than Mel. Minor).
- **World scale step patterns**: High confidence for Double Harmonic and Hungarian Minor; Persian varies by tradition and the array provided follows Western academic convention.

---

## Footnotes

[^1]: `src/utils/noteUtils.ts:109` — `SOLFEGE_LABELS` has 8 fixed entries — constrains scales to exactly 7 pitches + octave.
[^2]: `src/utils/noteUtils.ts:123–131` — `SCALE_MODE_SEMITONES` — all arrays end at `12` (octave).
[^3]: `src/utils/noteUtils.ts:157–174` — `buildScale()` maps over `semitones` array with index → solfège label — requires exactly 8 elements.
[^4]: Melodic minor modal names from: Levine, M. (1995). *The Jazz Theory Book*. Sher Music.
[^5]: Harmonic minor mode names from: Nettles, B., & Graf, R. (1997). *The Chord Scale Theory & Jazz Harmony*. Advance Music.
[^6]: Double Harmonic / Byzantine scale: [Wikipedia — Double harmonic scale](https://en.wikipedia.org/wiki/Double_harmonic_scale) — step pattern H A H W H A H confirmed.
[^7]: Phrygian Dominant identification as mode 5 of Harmonic Minor: Standard in jazz and flamenco pedagogy.
[^8]: Minor blues hexatonic: `[0, 3, 5, 6, 7, 10, 12]` = 7 elements → only 6 distinct pitches — does not fill 8-slot solfège system.
