type Fire = () => void

export const useConfettiStore = defineStore('confetti', () => {
  /*
   * Register/Provider pattern — decouples confetti consumers from the UI
   * component that owns the confetti animation. The refs start as no-op
   * stubs; the provider component calls the register functions at mount time
   * to inject the real implementations. Other code triggers fireConfetti() or
   * fireFireworks() without knowing which component provides the effect.
   */
  const _fire = ref<Fire>(() => {
    console.warn('useConfettiStore: no confetti provider registered')
  })
  const fireworksProvider = ref<Fire>(() => {
    console.warn('useConfettiStore: no fireworks provider registered')
  })

  function registerFireConfetti(fn: Fire) {
    _fire.value = fn
  }

  function registerFireFireworks(fn: Fire) {
    fireworksProvider.value = fn
  }

  function fireConfetti() {
    _fire.value()
  }

  /* The bigger celebration, for a perfect run. */
  function fireFireworks() {
    fireworksProvider.value()
  }

  return {
    registerFireConfetti,
    registerFireFireworks,
    fireConfetti,
    fireFireworks,
  }
})
