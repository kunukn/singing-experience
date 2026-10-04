<script setup lang="ts">
import {
  measureMusicWidth,
  STAFF_LABEL_FONT,
  STAFF_LYRIC_FONT,
} from '@/components/grace-kelly/graceKellyStaffRender'
import { useDebounceFn, useResizeObserver } from '@vueuse/core'
import { renderAbc } from 'abcjs'

type Props = {
  abc: string
  /* Index into the drawn heads/rests (SheetPiece order) to highlight. */
  activePieceIndex: number | null
  /* Keeps the scroll at the end after playback ran out instead of resetting. */
  isDone?: boolean
  /* While recording: follow the newest bar instead of the highlight. */
  followEnd?: boolean
}

const props = defineProps<Props>()

const SANS_FONTS = {
  composerfont: STAFF_LABEL_FONT,
  vocalfont: STAFF_LYRIC_FONT,
} as const

/* Same probe-then-fit two-pass render as NotesSheet: a generous first width
 * keeps abcjs on one line, the second pass trims the SVG to the music. A bar
 * of 4/4 eighths needs roughly this much room. */
const PROBE_WIDTH_PER_BAR = 260 // px
const MIN_PROBE_WIDTH = 900 // px
const TRAILING_MARGIN = 24 // px

const containerRef = ref<HTMLDivElement | null>(null)
const scrollRef = ref<HTMLDivElement | null>(null)
const pieceElements = ref<Element[]>([])

function probeWidth(abc: string) {
  const barCount = abc.split('|').length

  return Math.max(MIN_PROBE_WIDTH, barCount * PROBE_WIDTH_PER_BAR)
}

function highlight(index: number | null) {
  for (const element of pieceElements.value) {
    element.classList.remove('piece-active')
  }

  if (index === null) return

  pieceElements.value[index]?.classList.add('piece-active')
}

async function renderSheet() {
  const container = containerRef.value
  /* Hidden (display:none) → nothing to measure; the resize observer renders
   * once it's laid out. */
  if (!container || container.offsetParent === null) return

  renderAbc(container, props.abc, {
    add_classes: true,
    staffwidth: probeWidth(props.abc),
    format: SANS_FONTS,
  })

  await nextTick()
  const musicWidth = measureMusicWidth(container)
  if (musicWidth > 0) {
    renderAbc(container, props.abc, {
      add_classes: true,
      staffwidth: Math.ceil(musicWidth) + TRAILING_MARGIN,
      format: SANS_FONTS,
    })
    await nextTick()
  }

  /* Heads and rests in reading order — the same order as SheetPiece. */
  pieceElements.value = [
    ...container.querySelectorAll('.abcjs-note, .abcjs-rest'),
  ]
  highlight(props.activePieceIndex)

  if (props.followEnd && scrollRef.value) {
    scrollRef.value.scrollLeft = scrollRef.value.scrollWidth
  }
}

onMounted(() => {
  void renderSheet()
})

const rerender = useDebounceFn(() => {
  void renderSheet()
}, 150)

watch(() => props.abc, rerender)

useResizeObserver(
  () => scrollRef.value?.parentElement ?? null,
  ([entry]) => {
    if (entry.contentRect.width > 0) rerender()
  },
)

watch(
  () => props.activePieceIndex,
  (index) => {
    highlight(index)

    if (index === null) {
      if (!props.isDone && scrollRef.value) scrollRef.value.scrollLeft = 0

      return
    }

    pieceElements.value[index]?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    })
  },
)
</script>

<template>
  <div class="mx-auto w-fit max-w-full">
    <div
      ref="scrollRef"
      class="w-full overflow-x-auto rounded border border-(--p-content-border-color)"
      data-testid="song-recorder-sheet"
      :data-piece-count="pieceElements.length"
      :data-active-piece="activePieceIndex ?? ''"
    >
      <div ref="containerRef" class="min-w-max py-0.5" />
    </div>
  </div>
</template>

<style scoped>
:deep(.piece-active path),
:deep(.piece-active rect) {
  fill: var(--p-primary-color);
}

/* Lift the tempo marking (`Q:` → "♩=90") clear of the staff, as NotesSheet. */
:deep(.abcjs-tempo) {
  transform: translateY(-20px);
}
</style>
