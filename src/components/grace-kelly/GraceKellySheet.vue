<script setup lang="ts">
import { renderAbc } from 'abcjs'
import type { VozMelody } from './graceKellyMelodies'
import { vozMelodyToAbcString, estimateStaffWidth } from './graceKellyAbc'
import { measureMusicWidth } from './graceKellyStaffRender'

type Props = {
  melody: VozMelody
  vozLabel: string
  startToneMidi: number
  bpm: number
  activeNoteIndex: number | null
  /* ABC `w:` lyric line drawn under the staff; omit to render notes only. */
  lyrics?: string
  /* Flat reading-order index of the syllable to highlight; -1/null = none. */
  activeSyllableIndex?: number | null
}

const props = defineProps<Props>()

const containerRef = ref<HTMLDivElement | null>(null)
const scrollRef = ref<HTMLDivElement | null>(null)
const noteElements = ref<Element[]>([])
const lyricElements = ref<Element[]>([])

async function renderSheet() {
  if (!containerRef.value) return

  const abcString = vozMelodyToAbcString(
    props.melody,
    props.vozLabel,
    props.startToneMidi,
    props.bpm,
    true,
    props.lyrics,
  )

  /* Pass 1 — render at an oversized width so abcjs keeps everything on one
   * line (it wraps only when staffwidth is smaller than the music needs). */
  const probeWidth = estimateStaffWidth(props.melody.notes.length)
  renderAbc(containerRef.value, abcString, {
    add_classes: true,
    staffwidth: probeWidth,
  })

  /* Pass 2 — measure the music's natural width and re-render at that width so
   * the SVG canvas (and therefore the scroll area) matches the notes, with a
   * small trailing margin. Single line is preserved since we never shrink
   * below what the music occupied. */
  await nextTick()
  const musicWidth = measureMusicWidth(containerRef.value)
  if (musicWidth > 0) {
    const TRAILING_MARGIN = 24
    renderAbc(containerRef.value, abcString, {
      add_classes: true,
      staffwidth: Math.ceil(musicWidth) + TRAILING_MARGIN,
    })
    await nextTick()
  }

  noteElements.value = [
    ...(containerRef.value?.querySelectorAll('.abcjs-note') ?? []),
  ]
  /* One `.abcjs-lyric` element per lyric'd note, in reading order, so the index
   * matches the flat syllable index used by activeSyllableIndex. */
  lyricElements.value = [
    ...(containerRef.value?.querySelectorAll('.abcjs-lyric') ?? []),
  ]
}

onMounted(() => {
  void renderSheet()
})

watch(
  () => [props.melody, props.vozLabel, props.startToneMidi, props.bpm],
  () => {
    void renderSheet()
  },
  { deep: true },
)

watch(
  () => props.activeNoteIndex,
  (index) => {
    for (const element of noteElements.value) {
      element.classList.remove('note-active')
    }

    if (index === null) {
      if (scrollRef.value) scrollRef.value.scrollLeft = 0

      return
    }

    const element = noteElements.value[index]
    if (!element) return

    element.classList.add('note-active')
    element.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    })
  },
)

watch(
  () => props.activeSyllableIndex,
  (index) => {
    for (const element of lyricElements.value) {
      element.classList.remove('syllable-active')
    }

    /* -1 (idle) and null both mean "no syllable lit". The active note's column
     * is already scrolled into view by the note watch, carrying its lyric. */
    if (index === null || index === undefined || index < 0) return

    lyricElements.value[index]?.classList.add('syllable-active')
  },
)
</script>

<template>
  <div
    ref="scrollRef"
    class="mx-auto w-fit max-w-full overflow-x-auto rounded border border-(--p-content-border-color)"
  >
    <div ref="containerRef" class="min-w-max py-2" />
  </div>
</template>

<style scoped>
:deep(.note-active path),
:deep(.note-active rect) {
  fill: var(--p-primary-color);
}

:deep(.syllable-active) {
  fill: var(--p-primary-color);
}
</style>
