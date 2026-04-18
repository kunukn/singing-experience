<script setup lang="ts">
import { useConfettiStore } from '@/stores/useConfettiStore'

const confettiCanvas = ref<HTMLCanvasElement | null>(null)
const { fireConfetti } = useConfetti(confettiCanvas)

useConfettiStore().registerFireConfetti(fireConfetti)
;(window as CustomWindow).fireConfetti = fireConfetti // Expose to global for testing purposes.
</script>

<template>
  <div class="relative mx-auto flex w-full max-w-3xl grow flex-col px-4 py-4">
    <canvas
      ref="confettiCanvas"
      class="pointer-events-none absolute inset-0 z-50 h-full w-full"
    />
    <TopBar />
    <RouterView />
  </div>
</template>
