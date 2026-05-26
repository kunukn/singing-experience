import { useHead } from '@unhead/vue'

type DocumentMeta = {
  title: string
  description: string
}

const SITE_ORIGIN = 'https://www.syng.fun'

const DEFAULT_TITLE =
  'Singing Experience — Pitch Trainer, DO RE MI Game & Tuners'
const DEFAULT_DESCRIPTION =
  'Real-time vocal pitch detector, DO RE MI singing game across 40+ scale modes, plus a chromatic guitar tuner (Standard, Drop D, Drop C, DADGAD, Open G/D/C, Eb) and ukulele tuner (High-G, Low-G). Free, private, works offline.'

/*
 * Per-route document metadata. Keyed by router path so the lookup is
 * independent of file-based route names. Pages without an entry fall back
 * to the defaults — covers test pages, redirects, and the 404 catch-all.
 */
const ROUTE_META: Record<string, DocumentMeta> = {
  '/': {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  '/pitch-detector': {
    title: 'Real-Time Vocal Pitch Detector',
    description:
      'Sing into your microphone and see your pitch, note, octave, and cents deviation update live. Free, runs entirely in your browser.',
  },
  '/tools': {
    title: 'Singing Tools',
    description:
      'Singing tools — real-time pitch detector, vocal warm-up, instrument tuner, and polyphonic tone detector. Free, runs in your browser.',
  },
  '/games': {
    title: 'Singing Games',
    description:
      'Three browser-based singing games — DO RE MI scale practice, sing-the-tone matching, and pitch challenges. Free, runs in your browser.',
  },
  '/do-re-mi': {
    title: 'DO RE MI Game',
    description:
      'Sing through DO RE MI FA SO LA TI DO across 40+ scale modes — Church, Melodic/Harmonic Minor, Jazz, Blues, Pentatonic, World, Symmetric. Hold each note to advance.',
  },
  '/sing-tone': {
    title: 'Sing Tone Game',
    description:
      'Match random tones with your voice across multiple rounds. Practice ear training and pitch accuracy in this browser-based singing game.',
  },
  '/tuner': {
    title: 'Instrument Tuner',
    description:
      'Free online chromatic guitar tuner with Standard, Drop D, Drop C, DADGAD, Open G, Open D, Open C, and Eb Standard tunings. Real-time pitch and cents-deviation feedback in your browser.',
  },
  '/tone-detector': {
    title: 'Polyphonic Tone Detector',
    description:
      'Detect multiple simultaneous tones in real time across C2–C7. Sing a harmony or play a chord and see each note displayed live.',
  },
}

/*
 * Call once at the app root. Watches the active route and updates
 * document.title, meta description, OpenGraph/Twitter tags, and the
 * canonical link on every navigation. Reactive refs ensure @unhead
 * patches the existing tags instead of recreating them.
 */
export function useDocumentMeta() {
  const route = useRoute()

  const meta = computed(
    () =>
      ROUTE_META[route.path] ?? {
        title: DEFAULT_TITLE,
        description: DEFAULT_DESCRIPTION,
      },
  )

  const canonical = computed(() => `${SITE_ORIGIN}${route.path}`)

  useHead({
    title: () => meta.value.title,
    link: [
      {
        rel: 'canonical',
        href: () => canonical.value,
      },
    ],
    meta: [
      {
        name: 'description',
        content: () => meta.value.description,
      },
      {
        property: 'og:title',
        content: () => meta.value.title,
      },
      {
        property: 'og:description',
        content: () => meta.value.description,
      },
      {
        property: 'og:url',
        content: () => canonical.value,
      },
      {
        name: 'twitter:title',
        content: () => meta.value.title,
      },
      {
        name: 'twitter:description',
        content: () => meta.value.description,
      },
    ],
  })
}
