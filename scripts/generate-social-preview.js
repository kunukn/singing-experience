/*
 * Regenerates public/social-preview.png, the 1280×640 card that link shares
 * show (og:image / twitter:image in index.html), from the real app: it starts
 * Vite, opens the Pitch Detector in headless Chromium, sings it a short
 * synthesized melody through a fake microphone, screenshots the page and lays
 * it into the card beside the title.
 *
 * Run after a visible change to the Pitch Detector or the brand mark:
 *   npm run social-preview
 *
 * It also stamps the image's content hash into index.html
 * (`social-preview.png?v=<hash>`). Share previews are cached by URL, so a
 * new URL makes X, Facebook, LinkedIn and chat apps fetch the new card the
 * next time they read the page, instead of showing the old one for weeks.
 */
import { createHash } from 'node:crypto'
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import {
  WAVE_VIEWBOX_HEIGHT,
  WAVE_VIEWBOX_WIDTH,
  wavePath,
} from '../src/components/generic/ambientWave.ts'
import {
  VOICE_HEAD,
  VOICE_SHOULDERS_PATH,
  VOICE_WAVES,
  VOICE_WAVE_STROKE_WIDTH,
} from '../src/components/icons/voiceMark.ts'

const ROOT = join(import.meta.dirname, '..')
const OUTPUT_FILE = join(ROOT, 'public', 'social-preview.png')
const HTML_FILE = join(ROOT, 'index.html')
const TEMP_DIR = join(ROOT, '.temp')
const VOICE_FILE = join(TEMP_DIR, 'social-preview-voice.wav')

/* The og:image and twitter:image URLs, with or without a version. */
const IMAGE_URL = /social-preview\.png(\?v=[\w-]*)?"/g

const CARD = { width: 1280, height: 640 }

/* Where the app sits in the card. It runs off the bottom edge. */
const APP_FRAME = { x: 700, y: 44, width: 505 }
const APP_HEIGHT = CARD.height - APP_FRAME.y

/*
 * Narrow enough to fill the frame at near full size, wide enough to keep the
 * controls on one row. The chart fills the leftover height, so the height is
 * picked to end the chart, lowest note label included, just above the card's
 * bottom edge.
 */
const APP_VIEWPORT = { width: 560, height: 680 }

/* The tile behind the brand mark: theme-color in index.html, as on the PWA icon. */
const BRAND_COLOR = '#4f46e5'

const SAMPLE_RATE = 48000 // Hz, mono

/* Note name → MIDI number, for the notes the melody uses. */
const MIDI = { B3: 59, C4: 60, D4: 62, E4: 64, G4: 67 }

/*
 * What the fake singer sings: inside the default voice range (G3–G4), with
 * ups and downs, ending on a held high note. The chart shows the last 5 s
 * (HISTORY_WINDOW_MS), so the melody is a little shorter and starts just
 * inside the chart's left edge, where its first note label isn't cut off.
 */
const MELODY = [
  { note: 'B3', seconds: 0.55 },
  { note: 'D4', seconds: 0.8 },
  { note: 'B3', seconds: 0.45 },
  { note: 'C4', seconds: 0.45 },
  { note: 'E4', seconds: 0.8 },
  { note: 'D4', seconds: 0.45 },
  { note: 'G4', seconds: 1.2 },
]
const MELODY_SECONDS = MELODY.reduce((sum, { seconds }) => sum + seconds, 0)

/* Extra held time after the melody, so a slow start still ends on the last note. */
const HOLD_SECONDS = 3

const GLIDE_SECONDS = 0.07 // slide into each note, as a voice does
const VIBRATO_HZ = 5.5
const VIBRATO_SEMITONES = 0.18 // ±18 cents: visible on the chart, still "clean"
const VIBRATO_FADE_IN_SECONDS = 0.3 // singers settle on a note before it wobbles

/* Fundamental plus three overtones: closer to a voice than a pure sine. */
const HARMONIC_GAINS = [1, 0.5, 0.25, 0.12]
const PEAK_LEVEL = 0.6 // of full scale, well clear of clipping

/* The melody as 16-bit mono PCM, one continuous phase so notes don't click. */
function synthesizeMelody() {
  const notes = MELODY.map(({ note, seconds }, index) => ({
    midi: MIDI[note],
    seconds: index === MELODY.length - 1 ? seconds + HOLD_SECONDS : seconds,
  }))
  const totalSeconds = MELODY_SECONDS + HOLD_SECONDS
  const samples = new Int16Array(Math.round(totalSeconds * SAMPLE_RATE))
  const gainSum = HARMONIC_GAINS.reduce((sum, gain) => sum + gain, 0)

  let phase = 0
  let sampleIndex = 0
  let previousMidi = notes[0].midi

  for (const { midi, seconds } of notes) {
    const sampleCount = Math.round(seconds * SAMPLE_RATE)

    for (let i = 0; i < sampleCount && sampleIndex < samples.length; i++) {
      const time = i / SAMPLE_RATE
      const glide = Math.min(1, time / GLIDE_SECONDS)
      const vibrato =
        VIBRATO_SEMITONES *
        Math.sin(2 * Math.PI * VIBRATO_HZ * time) *
        Math.min(1, time / VIBRATO_FADE_IN_SECONDS)
      const currentMidi = previousMidi + (midi - previousMidi) * glide + vibrato
      // Equal temperament: A4 (MIDI 69) is 440 Hz, 12 semitones per octave
      const frequency = 440 * 2 ** ((currentMidi - 69) / 12)

      phase += (2 * Math.PI * frequency) / SAMPLE_RATE

      let value = 0
      for (const [harmonic, gain] of HARMONIC_GAINS.entries()) {
        value += gain * Math.sin((harmonic + 1) * phase)
      }

      samples[sampleIndex++] = Math.round(
        (value / gainSum) * PEAK_LEVEL * 32767, // 32767 = 16-bit full scale
      )
    }

    previousMidi = midi
  }

  return samples
}

/* Wraps PCM samples in a minimal 44-byte WAV header (PCM, mono, 16-bit). */
function encodeWav(samples) {
  const BYTES_PER_SAMPLE = 2
  const header = Buffer.alloc(44)

  header.write('RIFF', 0)
  header.writeUInt32LE(36 + samples.byteLength, 4)
  header.write('WAVEfmt ', 8)
  header.writeUInt32LE(16, 16) // fmt chunk size
  header.writeUInt16LE(1, 20) // format: PCM
  header.writeUInt16LE(1, 22) // channels
  header.writeUInt32LE(SAMPLE_RATE, 24)
  header.writeUInt32LE(SAMPLE_RATE * BYTES_PER_SAMPLE, 28) // byte rate
  header.writeUInt16LE(BYTES_PER_SAMPLE, 32) // block align
  header.writeUInt16LE(16, 34) // bits per sample
  header.write('data', 36)
  header.writeUInt32LE(samples.byteLength, 40)

  return Buffer.concat([header, Buffer.from(samples.buffer)])
}

/* Starts the detector, lets it hear the melody and screenshots the page. */
async function captureApp(page) {
  /*
   * Off: the coloured voice-type bars beside the note axis mean nothing
   * without their legend, and the page hides the legend at this width.
   */
  await page.getByRole('button', { name: 'Voice types', exact: true }).click()
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  // Chromium plays the file from its start when the microphone opens
  await page.waitForTimeout((MELODY_SECONDS + 0.2) * 1000)
  await page.mouse.move(0, 0)

  const scale = APP_FRAME.width / APP_VIEWPORT.width

  return page.screenshot({
    clip: {
      x: 0,
      y: 0,
      width: APP_VIEWPORT.width,
      height: Math.min(APP_VIEWPORT.height, APP_HEIGHT / scale),
    },
  })
}

/* Colours and counts the card shares with the app, read from the running page. */
function readAppFacts(page) {
  /*
   * programs.ts imports Vue components, so Node can't load it; the page gets
   * it from Vite instead. The URL is passed in as an argument because knip
   * reads a literal import() here as a path on disk and reports it unresolved.
   */
  return page.evaluate(async (programsUrl) => {
    const style = getComputedStyle(document.documentElement)
    const { tools, games } = await import(programsUrl)

    return {
      cleanColor: style.getPropertyValue('--pitch-clean').trim(),
      lowColor: style.getPropertyValue('--pitch-low').trim(),
      highColor: style.getPropertyValue('--pitch-high').trim(),
      accentColor: style.getPropertyValue('--p-primary-color').trim(),
      toolCount: tools.length,
      gameCount: games.length,
    }
  }, '/src/constants/programs.ts')
}

function voiceMarkSvg(size) {
  const waves = VOICE_WAVES.map(
    ({ d, opacity }) =>
      `<path d="${d}" stroke="#fff" stroke-width="${VOICE_WAVE_STROKE_WIDTH}" stroke-opacity="${opacity}"/>`,
  ).join('')

  return `<svg width="${size}" height="${size}" viewBox="0 0 40 40" fill="none" stroke-linecap="round"><circle cx="${VOICE_HEAD.cx}" cy="${VOICE_HEAD.cy}" r="${VOICE_HEAD.r}" fill="#fff"/><path d="${VOICE_SHOULDERS_PATH}" fill="#fff"/>${waves}</svg>`
}

/* The landing page's backdrop waves (AmbientWaves.vue), frozen: sharp on top. */
function backdropWaves(facts) {
  const waves = [
    { color: facts.highColor, periods: 5, amplitude: 16, top: 12 },
    { color: facts.cleanColor, periods: 3, amplitude: 22, top: 50 },
    { color: facts.lowColor, periods: 2, amplitude: 30, top: 90 },
  ]

  return waves
    .map(
      ({ color, periods, amplitude, top }) =>
        `<svg class="wave" style="top: ${top}%" viewBox="0 0 ${WAVE_VIEWBOX_WIDTH} ${WAVE_VIEWBOX_HEIGHT}" preserveAspectRatio="none" fill="none"><path d="${wavePath(periods, amplitude)}" stroke="${color}"/></svg>`,
    )
    .join('')
}

/* Points the meta tags at this exact image; returns the new version. */
function stampVersion(image) {
  const version = createHash('sha256').update(image).digest('hex').slice(0, 8)
  const html = readFileSync(HTML_FILE, 'utf8')
  const count = html.match(IMAGE_URL)?.length ?? 0
  if (count === 0) throw new Error('No social-preview.png URL in index.html')

  writeFileSync(
    HTML_FILE,
    html.replaceAll(IMAGE_URL, `social-preview.png?v=${version}"`),
  )

  return version
}

/* The card's own copy: marketing for link previews, English only. */
function cardHtml(appImage, facts) {
  const languageCount = readdirSync(join(ROOT, 'src', 'locales')).filter(
    (file) => file.endsWith('.json'),
  ).length
  const chips = [
    `${facts.toolCount} music tools`,
    `${facts.gameCount} singing games`,
    `${languageCount} languages`,
    'Free · no sign-up',
  ]
    .map((chip) => `<span class="chip">${chip}</span>`)
    .join('')

  return `<!doctype html>
<html><head><style>
  * { box-sizing: border-box; margin: 0; }
  body {
    width: ${CARD.width}px; height: ${CARD.height}px; overflow: hidden;
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    color: #f4f4f5;
    background:
      radial-gradient(640px 420px at 8% 0%, rgb(79 70 229 / 0.30), transparent 70%),
      radial-gradient(520px 320px at 20% 100%, rgb(52 211 153 / 0.10), transparent 70%),
      #0c0c12;
    position: relative;
  }
  /* Faint behind the text column, as AmbientWaves.vue is behind page content. */
  .waves {
    position: absolute; inset: 0;
    mask-image: linear-gradient(to right, #000, rgb(0 0 0 / 0.3) 6%, rgb(0 0 0 / 0.3) 50%, #000 56%);
  }
  .wave { position: absolute; left: 0; width: 200%; height: 120px; translate: 0 -50%; }
  .wave path { stroke-opacity: 0.22; stroke-width: 2px; vector-effect: non-scaling-stroke; }
  .text { position: absolute; left: 84px; top: 112px; width: 590px; }
  .brand { display: flex; align-items: center; gap: 22px; }
  .tile {
    flex: none; width: 116px; height: 116px; border-radius: 28px; background: ${BRAND_COLOR};
    display: grid; place-items: center;
    box-shadow: 0 0 40px rgb(79 70 229 / 0.45);
  }
  h1 { font-size: 62px; font-weight: 800; letter-spacing: -0.035em; line-height: 1; }
  .tagline { margin-top: 36px; font-size: 36px; font-weight: 700; line-height: 1.28; letter-spacing: -0.01em; }
  .accent { color: ${facts.accentColor}; }
  .legend { margin-top: 28px; display: flex; gap: 28px; font-size: 20px; color: #d4d4d8; }
  .legend span { display: flex; align-items: center; gap: 10px; }
  .dot { width: 20px; height: 20px; border-radius: 50%; }
  .chips { margin-top: 26px; display: flex; flex-wrap: wrap; gap: 8px; }
  .chip {
    padding: 6px 14px; border-radius: 999px; font-size: 16px; color: #e4e4e7;
    background: rgb(39 39 42 / 0.7); border: 1px solid rgb(82 82 91 / 0.6);
  }
  .url { margin-top: 30px; font-size: 24px; font-weight: 700; color: ${facts.accentColor}; }
  .app {
    position: absolute; left: ${APP_FRAME.x}px; top: ${APP_FRAME.y}px;
    width: ${APP_FRAME.width}px; height: ${APP_HEIGHT}px; overflow: hidden;
    border-radius: 16px 16px 0 0; border: 1px solid rgb(82 82 91 / 0.6);
    border-bottom: 0; box-shadow: 0 24px 64px rgb(0 0 0 / 0.6);
  }
  .app img { display: block; width: 100%; }
</style></head><body>
  <div class="waves">${backdropWaves(facts)}</div>
  <div class="text">
    <div class="brand"><div class="tile">${voiceMarkSvg(88)}</div><h1>Singing<br>Experience</h1></div>
    <p class="tagline">See the notes you sing,<br><span class="accent">right as you sing them</span>.</p>
    <div class="legend">
      <span><i class="dot" style="background: ${facts.cleanColor}"></i>In tune</span>
      <span><i class="dot" style="background: ${facts.highColor}"></i>Too high</span>
      <span><i class="dot" style="background: ${facts.lowColor}"></i>Too low</span>
    </div>
    <div class="chips">${chips}</div>
    <p class="url">syng.fun</p>
  </div>
  <div class="app"><img src="data:image/png;base64,${appImage.toString('base64')}"></div>
</body></html>`
}

mkdirSync(TEMP_DIR, { recursive: true })
writeFileSync(VOICE_FILE, encodeWav(synthesizeMelody()))

/* Keeps the click-to-source overlay out of the page, whatever .env says. */
process.env.VITE_CODE_INSPECTOR = '0'

const server = await createServer({
  root: ROOT,
  logLevel: 'error',
  server: { port: 5598, strictPort: false },
})
await server.listen()
const url = server.resolvedUrls?.local[0]
const browser = await chromium.launch({
  args: [
    // A fake microphone that plays the melody, and no permission prompt
    '--use-fake-device-for-media-stream',
    '--use-fake-ui-for-media-stream',
    `--use-file-for-fake-audio-capture=${VOICE_FILE}`,
  ],
})

try {
  if (!url) throw new Error("Vite didn't report a URL")

  const appPage = await browser.newPage({
    viewport: APP_VIEWPORT,
    deviceScaleFactor: 2,
    locale: 'en-US',
    colorScheme: 'dark',
    permissions: ['microphone'],
  })
  await appPage.goto(new URL('pitch-detector', url).href, {
    waitUntil: 'networkidle',
  })
  // The Vue DevTools button floats over every dev-server page
  await appPage.addStyleTag({
    content: '#__vue-devtools-container__ { display: none !important; }',
  })
  const facts = await readAppFacts(appPage)
  const appImage = await captureApp(appPage)

  const cardPage = await browser.newPage({ viewport: CARD })
  await cardPage.setContent(cardHtml(appImage, facts))
  await cardPage.evaluate(() => document.fonts.ready)
  const image = await cardPage.screenshot()
  writeFileSync(OUTPUT_FILE, image)
  const version = stampVersion(image)
  console.log(
    `Wrote public/social-preview.png; index.html now points at ?v=${version}`,
  )
} finally {
  await browser.close()
  await server.close()
}
