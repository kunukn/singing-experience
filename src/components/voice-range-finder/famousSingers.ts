export type FamousSinger = {
  id: string
  /* A proper name, so it reads the same in every language */
  name: string
  /* Shown instead of `name` while the chart is narrow */
  shortName: string
  midiMin: number
  midiMax: number
}

/*
 * Rough estimates of the notes each singer regularly sang in their songs, not
 * the extremes published online. Published figures conflict by more than an
 * octave and include falsetto and whistle notes, and clipped to the chart they
 * nearly fill it, so every bar would look the same. Written from memory and
 * still to be checked against sheet music: see the sources and what they say in
 * docs/research/famous-singer-ranges-2026-11-03.md.
 *
 * Every range stays inside E2–C6, the Explore chart's voice span, so the axis
 * never rescales. High to low by midpoint, per "Vertical Ordering" in
 * design-rules.md. Guarded by famousSingers.test.ts.
 */
export const FAMOUS_SINGERS: readonly FamousSinger[] = [
  {
    id: 'mariahCarey',
    name: 'Mariah Carey',
    shortName: 'Carey',
    midiMin: 57, // A3
    midiMax: 84, // C6
  },
  {
    id: 'whitneyHouston',
    name: 'Whitney Houston',
    shortName: 'Houston',
    midiMin: 55, // G3
    midiMax: 82, // A♯5
  },
  {
    id: 'michaelJackson',
    name: 'Michael Jackson',
    shortName: 'Jackson',
    midiMin: 48, // C3
    midiMax: 81, // A5
  },
  {
    id: 'adele',
    name: 'Adele',
    shortName: 'Adele',
    midiMin: 48, // C3
    midiMax: 77, // F5
  },
  {
    id: 'freddieMercury',
    name: 'Freddie Mercury',
    shortName: 'Mercury',
    midiMin: 41, // F2
    midiMax: 77, // F5
  },
  {
    id: 'elvisPresley',
    name: 'Elvis Presley',
    shortName: 'Presley',
    midiMin: 43, // G2
    midiMax: 69, // A4
  },
  {
    id: 'frankSinatra',
    name: 'Frank Sinatra',
    shortName: 'Sinatra',
    midiMin: 43, // G2
    midiMax: 65, // F4
  },
  {
    id: 'johnnyCash',
    name: 'Johnny Cash',
    shortName: 'Cash',
    midiMin: 40, // E2
    midiMax: 62, // D4
  },
]
