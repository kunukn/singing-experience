/*
 * Pure data, no Vue or auto-imports: vite.config.ts imports this file to
 * build sitemap.xml, so every route listed here is also a sitemap entry.
 */

export type DocumentMeta = {
  title: string
  description: string
}

/* Keep in sync with <title>, description, og:* and twitter:* in index.html */
export const DEFAULT_TITLE =
  'Singing Experience — Pitch Detector, Singing Games & Music Tools'
export const DEFAULT_DESCRIPTION =
  'Free singing app in your browser: real-time pitch detector, vocal warm-up, tuner, piano, guitar, and singing games like DO RE MI and Sing the Keys. Private, works offline.'

/*
 * Per-route document metadata. Keyed by router path so the lookup is
 * independent of file-based route names. Pages without an entry fall back
 * to the defaults — covers test pages, redirects, and the 404 catch-all.
 */
export const ROUTE_META: Record<string, DocumentMeta> = {
  '/': {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  '/tools': {
    title: 'Music Tools',
    description:
      'Pitch detector, vocal warm-up, notes on the staff, guitar and ukulele tuner, playable piano and guitar, scale detector, song recorder and polyphonic tone detector. Free, runs in your browser.',
  },
  '/games': {
    title: 'Singing Games',
    description:
      'Singing games that train your ear and voice — Sing Tone, DO RE MI, Sing the Keys, the Grace Kelly Challenge, Singfly and the Pitch Game. Free, runs in your browser.',
  },
  '/pitch-detector': {
    title: 'Real-Time Vocal Pitch Detector',
    description:
      'Sing into your microphone and see your pitch, note, octave, and cents deviation update live. Free, runs entirely in your browser.',
  },
  '/warm-up': {
    title: 'Vocal Warm-Up Exercises',
    description:
      'Warm up your voice with guided pitch sequences that transpose up a half step each round. Hold each note to advance — free, in your browser.',
  },
  '/notes': {
    title: 'Music Notes on the Staff',
    description:
      'See every note on the staff with its name, tap to hear it, and sing it back. Learn to read music in your browser.',
  },
  '/tuner': {
    title: 'Instrument Tuner',
    description:
      'Free online chromatic guitar tuner with Standard, Drop D, Drop C, DADGAD, Open G, Open D, Open C, and Eb Standard tunings. Real-time pitch and cents-deviation feedback in your browser.',
  },
  '/piano': {
    title: 'Playable Piano Keyboard',
    description:
      'Play a piano keyboard in your browser and see your singing voice mapped onto the keys in real time.',
  },
  '/guitar': {
    title: 'Playable Guitar Fretboard',
    description:
      'Play a guitar fretboard in your browser and see your singing voice mapped onto the strings in real time.',
  },
  '/scale-detector': {
    title: 'Scale Detector — Find the Key You Sing In',
    description:
      'Sing or play a few notes and see which scales fit — major, minor, pentatonic, blues and the church modes — plus the twin scales that share the same notes.',
  },
  '/song-recorder': {
    title: 'Song Recorder — Sing to Sheet Music',
    description:
      'Sing a melody to a metronome and see it written as sheet music. Play it back and copy the ABC notation.',
  },
  '/tone-detector': {
    title: 'Polyphonic Tone Detector',
    description:
      'Detect multiple simultaneous tones in real time across C2–C7. Sing a harmony or play a chord and see each note displayed live.',
  },
  '/sing-tone': {
    title: 'Sing Tone Game',
    description:
      'Match random tones with your voice across multiple rounds. Practice ear training and pitch accuracy in this browser-based singing game.',
  },
  '/do-re-mi': {
    title: 'DO RE MI Game',
    description:
      'Sing through DO RE MI FA SO LA TI DO across 40+ scale modes — Church, Melodic/Harmonic Minor, Jazz, Blues, Pentatonic, World, Symmetric. Hold each note to advance.',
  },
  '/sing-the-keys': {
    title: 'Sing the Keys Game',
    description:
      'Notes fall onto a piano keyboard like a piano tutorial — sing each one as it lands. Twinkle Twinkle, Happy Birthday, Amazing Grace, Für Elise and more, in any key.',
  },
  '/grace-kelly-challenge': {
    title: 'Grace Kelly Singing Challenge',
    description:
      'Sing along to MIKA\'s "Grace Kelly" with real sheet music. Pick a harmony part, follow the tones, and see how close you get.',
  },
  '/singfly': {
    title: 'Singfly — Voice-Controlled Flying Game',
    description:
      'Your voice is the controller: sing higher or lower to fly the bird through the gaps. A playful pitch-control game in your browser.',
  },
  '/pitch-game': {
    title: 'Pitch Game — Sing the Target Notes',
    description:
      'Target notes scroll in — sing each one and hold it to score. Race the clock and hit as many as you can.',
  },
}
