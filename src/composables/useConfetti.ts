import type { CreateTypes } from 'canvas-confetti'
import confetti from 'canvas-confetti'
import type { Ref } from 'vue'

export function useConfetti(canvasRef?: Ref<HTMLCanvasElement | null>) {
  let scopedConfetti: CreateTypes | null = null

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
    if (scopedConfetti) {
      scopedConfetti.reset()
    } else {
      confetti.reset()
    }
  })

  return { fireConfetti, fireMicroConfetti }
}
