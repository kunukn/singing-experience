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
 * Grace Kelly sheet, which scrolls horizontally and wants all the space).
 *
 * The wrapper is a growing flex column and stretches its single `[data-page]`
 * child to the same — so a page's own `grow`/`mt-auto` (e.g. the landing
 * footer) has the full viewport height to work against. Without this, height
 * stops propagating here and bottom-aligned content collapses upward. */
const contentLayout =
  'flex grow flex-col [&>[data-page]]:flex [&>[data-page]]:grow [&>[data-page]]:flex-col'
const contentClass = computed(() =>
  route.meta.fullWidth
    ? `${contentLayout} w-full`
    : `${contentLayout} mx-auto w-full max-w-3xl`,
)
</script>

<template>
  <div class="relative flex w-full flex-1 grow flex-col px-0 py-0">
    <canvas
      ref="confettiCanvas"
      data-confetti-canvas
      class="pointer-events-none absolute inset-0 z-50 mx-auto h-full w-full max-w-3xl"
    />
    <TopBar class="mx-auto w-full max-w-3xl" />
    <div :class="contentClass">
      <RouterView />
    </div>
    <ErrorToast class="mx-auto max-w-3xl" />
  </div>
</template>
