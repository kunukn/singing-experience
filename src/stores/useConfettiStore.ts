import { defineStore } from 'pinia'

type FireConfetti = () => void

export const useConfettiStore = defineStore('confetti', () => {
  /*
   * Register/Provider pattern — decouples confetti consumers from the UI
   * component that owns the confetti animation. The ref starts as a no-op
   * stub; the provider component calls registerFireConfetti() at mount time
   * to inject the real implementation. Other code triggers fireConfetti()
   * without knowing which component provides the effect.
   */
  const _fire = ref<FireConfetti>(() => {
    console.warn('useConfettiStore: no confetti provider registered')
  })

  function registerFireConfetti(fn: FireConfetti) {
    _fire.value = fn
  }

  function fireConfetti() {
    _fire.value()
  }

  return { registerFireConfetti, fireConfetti }
})
