<script setup lang="ts">
import { useConfettiStore } from '@/stores/useConfettiStore'

const confettiCanvas = ref<HTMLCanvasElement | null>(null)
const { fireConfetti } = useConfetti(confettiCanvas)

useConfettiStore().registerFireConfetti(fireConfetti)
useDocumentDirection()
useDocumentMeta()
useFaviconPermissionColor()
</script>

<template>
  <div class="relative mx-auto flex w-full max-w-3xl grow flex-col px-0 py-0">
    <canvas
      ref="confettiCanvas"
      class="pointer-events-none absolute inset-0 z-50 h-full w-full max-w-3xl"
    />
    <TopBar />
    <RouterView />
    <ErrorToast />
  </div>
</template>
