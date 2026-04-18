import { defineStore } from 'pinia'

type FireConfetti = () => void

export const useConfettiStore = defineStore('confetti', () => {
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
