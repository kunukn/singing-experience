<script setup lang="ts">
import { useConfettiStore } from '@/stores/useConfettiStore'

const confettiCanvas = ref<HTMLCanvasElement | null>(null)
const { fireConfetti } = useConfetti(confettiCanvas)

useConfettiStore().registerFireConfetti(fireConfetti)
useDocumentDirection()
useDocumentMeta()
useFaviconPermissionColor()

const route = useRoute()
/* Pages default to a centered max-w-3xl column; a page can opt into the full
 * viewport width via `definePage({ meta: { fullWidth: true } })` (e.g. the
 * Grace Kelly sheet, which scrolls horizontally and wants all the space). */
const contentClass = computed(() =>
  route.meta.fullWidth ? 'w-full' : 'mx-auto w-full max-w-3xl',
)
</script>

<template>
  <div class="relative flex w-full grow flex-col px-0 py-0">
    <canvas
      ref="confettiCanvas"
      class="pointer-events-none absolute inset-0 z-50 mx-auto h-full w-full max-w-3xl"
    />
    <TopBar class="mx-auto w-full max-w-3xl" />
    <div :class="contentClass">
      <RouterView />
    </div>
    <ErrorToast class="mx-auto max-w-3xl" />
  </div>
</template>
