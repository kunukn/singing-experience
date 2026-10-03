import type { CreateTypes } from 'canvas-confetti'
import confetti from 'canvas-confetti'
import type { Ref } from 'vue'

/* ms — how long the fireworks run, and how often a new pair of shells goes up. */
const FIREWORKS_DURATION_MS = 3500
const FIREWORKS_INTERVAL_MS = 250

/* Hex, not theme variables: the library paints on a canvas and takes literal
 * colours. Gold first, so a perfect run does not look like the ordinary
 * confetti's default mix. */
const FIREWORK_COLORS = [
  '#fde047',
  '#facc15',
  '#fb923c',
  '#f472b6',
  '#38bdf8',
  '#4ade80',
]

/* The music notes are drawn at twice the size of a confetti piece, so they
 * still read as notes. */
const NOTE_SCALAR = 2

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min)
}

export function useConfetti(canvasRef?: Ref<HTMLCanvasElement | null>) {
  let scopedConfetti: CreateTypes | null = null
  let fireworksTimer: ReturnType<typeof setInterval> | null = null
  let noteShape: confetti.Shape | null = null

  function ensureScopedConfetti(): CreateTypes | null {
    if (scopedConfetti) return scopedConfetti

    const canvas = canvasRef?.value
    if (canvas) {
      scopedConfetti = confetti.create(canvas, { resize: true })
    }

    return scopedConfetti
  }

  function fire(opts: confetti.Options) {
    const scoped = ensureScopedConfetti()
    if (scoped) {
      scoped(opts)
    } else {
      confetti(opts)
    }
  }

  function fireConfetti() {
    const end = Date.now() + 1500 // 1.5 s total burst duration

    /*
     * Dual-cannon effect: left and right origins fire 3 particles each frame.
     * angle 60/120 = angled inward; spread 55° = moderate cone; y 0.6 = 60% down the viewport.
     */
    const burstFrame = () => {
      fire({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
      })
      fire({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
      })

      if (Date.now() < end) {
        requestAnimationFrame(burstFrame)
      }
    }

    burstFrame()
  }

  function stopFireworks() {
    if (fireworksTimer === null) return

    clearInterval(fireworksTimer)
    fireworksTimer = null
  }

  /* Drawn once, on first use: the shape needs a canvas, which is not there at
   * import time. */
  function getNoteShape(): confetti.Shape {
    noteShape ??= confetti.shapeFromText({
      text: '🎵',
      scalar: NOTE_SCALAR,
    })

    return noteShape
  }

  /*
   * The celebration for a perfect run, a clear step above fireConfetti: an
   * opening salvo of gold stars from both sides, then shells bursting across
   * the sky for a few seconds while music notes drift down through them.
   */
  function fireFireworks() {
    stopFireworks()
    const endsAt = Date.now() + FIREWORKS_DURATION_MS

    /* angle 60/120 = angled inward, as in fireConfetti, but 80 stars at once
     * and thrown harder (velocity 55) so they reach the top of the screen. */
    for (const cannon of [
      { angle: 60, x: 0 },
      { angle: 120, x: 1 },
    ]) {
      fire({
        particleCount: 80,
        angle: cannon.angle,
        spread: 70,
        startVelocity: 55,
        origin: { x: cannon.x, y: 0.7 },
        shapes: ['star'],
        colors: FIREWORK_COLORS,
        scalar: 1.2,
        disableForReducedMotion: true,
      })
    }

    fireworksTimer = setInterval(() => {
      const remainingMs = endsAt - Date.now()
      if (remainingMs <= 0) {
        stopFireworks()

        return
      }

      /* 60 particles a shell at the start, thinning to 10, so the show fades
       * out rather than stopping dead. */
      const particleCount =
        10 + Math.round(50 * (remainingMs / FIREWORKS_DURATION_MS))

      /* One shell in each half of the sky, so two never stack on one spot.
       * spread 360 = a full round burst; y 0.15–0.5 = the upper half. */
      for (const [minX, maxX] of [
        [0.1, 0.4],
        [0.6, 0.9],
      ] as const) {
        fire({
          particleCount,
          spread: 360,
          startVelocity: 30,
          ticks: 70,
          origin: { x: randomBetween(minX, maxX), y: randomBetween(0.15, 0.5) },
          shapes: ['star', 'circle'],
          colors: FIREWORK_COLORS,
          disableForReducedMotion: true,
        })
      }

      /* Low gravity and a long life (120 ticks) let the notes float; flat
       * keeps them upright instead of tumbling edge-on. */
      fire({
        particleCount: 3,
        spread: 120,
        startVelocity: 20,
        gravity: 0.6,
        ticks: 120,
        origin: { x: randomBetween(0.2, 0.8), y: 0.3 },
        shapes: [getNoteShape()],
        scalar: NOTE_SCALAR,
        flat: true,
        disableForReducedMotion: true,
      })
    }, FIREWORKS_INTERVAL_MS)
  }

  /* Small, quick celebratory burst for per-note success.
   * scalar 0.5 = half-size particles; ticks 30 = very short lifetime;
   * gravity 1.5 = fast drop so it doesn't linger; green palette matches "correct" UI color. */
  function fireMicroConfetti(
    origin: { x: number; y: number } = { x: 0.5, y: 0.5 },
  ) {
    fire({
      particleCount: 15,
      spread: 60,
      startVelocity: 15,
      gravity: 1.5,
      ticks: 30,
      origin,
      scalar: 0.5,
      colors: ['#4ade80', '#22c55e', '#86efac'],
      disableForReducedMotion: true,
    })
  }

  onUnmounted(() => {
    stopFireworks()
    if (scopedConfetti) {
      scopedConfetti.reset()
    } else {
      confetti.reset()
    }
  })

  return { fireConfetti, fireFireworks, fireMicroConfetti }
}
