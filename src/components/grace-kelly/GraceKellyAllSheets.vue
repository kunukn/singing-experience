<script setup lang="ts">
import { renderAbc } from 'abcjs'
import { VOZ_MELODIES } from './graceKellyMelodies'
import { vozMelodyToAbcString, estimateStaffWidth } from './graceKellyAbc'
import { measureMusicWidth } from './graceKellyStaffRender'

type Props = {
  activeNoteIndex: number | null
  startToneMidi: number
  /* Part labels ordered by VOZ_MELODIES index (used as each staff's title). */
  vozLabels: string[]
}

const props = defineProps<Props>()

/* Compact vertical layout for the stacked all-parts view: a smaller title
 * font and trimmed top/bottom padding shrink each staff's height without
 * scaling the notes. */
const COMPACT_RENDER = {
  add_classes: true,
  paddingtop: 4,
  paddingbottom: 4,
  format: { titlefont: 'serif 13' },
} as const

const scrollRef = ref<HTMLDivElement | null>(null)
const staffContainers = ref<HTMLElement[]>([])
/* Note elements per staff, indexed [staffIndex][noteIndex] — all melodies share
 * the same 34-note rhythm, so a single activeNoteIndex maps onto every staff. */
const noteElementsByStaff = ref<Element[][]>([])

async function renderSheets() {
  const containers = staffContainers.value
  if (containers.length < VOZ_MELODIES.length) return

  const abcStrings = VOZ_MELODIES.map((melody, index) =>
    /* Pass showTempo=false so the BPM header is hidden on the combined sheet. */
    vozMelodyToAbcString(
      melody,
      props.vozLabels[index] ?? '',
      props.startToneMidi,
      undefined,
      false,
    ),
  )

  /* Pass 1 — render each staff at an oversized width so abcjs keeps it on one
   * line, then measure each staff's natural music width. */
  const probeWidth = estimateStaffWidth(VOZ_MELODIES[0].notes.length)
  for (let index = 0; index < VOZ_MELODIES.length; index++) {
    renderAbc(containers[index], abcStrings[index], {
      ...COMPACT_RENDER,
      staffwidth: probeWidth,
    })
  }

  await nextTick()

  /* Pass 2 — re-render every staff at one shared width (the widest measured) so
   * the bars line up column-for-column across all six parts. */
  const TRAILING_MARGIN = 24
  const sharedWidth =
    Math.ceil(Math.max(...containers.map(measureMusicWidth))) + TRAILING_MARGIN
  for (let index = 0; index < VOZ_MELODIES.length; index++) {
    renderAbc(containers[index], abcStrings[index], {
      ...COMPACT_RENDER,
      staffwidth: sharedWidth,
    })
  }

  await nextTick()
  noteElementsByStaff.value = containers.map((container) => [
    ...container.querySelectorAll('.abcjs-note'),
  ])
}

onMounted(() => {
  void renderSheets()
})

watch(
  () => [props.vozLabels, props.startToneMidi],
  () => {
    void renderSheets()
  },
  { deep: true },
)

watch(
  () => props.activeNoteIndex,
  (index) => {
    for (const staff of noteElementsByStaff.value) {
      for (const element of staff) element.classList.remove('note-active')
    }

    if (index === null) {
      if (scrollRef.value) scrollRef.value.scrollLeft = 0

      return
    }

    for (const staff of noteElementsByStaff.value) {
      staff[index]?.classList.add('note-active')
    }

    /* Center the active column with a manual horizontal scroll (the top staff's
     * note is representative since all staves are aligned). scrollIntoView is
     * avoided so the tall stack does not jump vertically. */
    const note = noteElementsByStaff.value[0]?.[index]
    if (note && scrollRef.value) {
      const containerRect = scrollRef.value.getBoundingClientRect()
      const noteRect = note.getBoundingClientRect()
      const left =
        noteRect.left -
        containerRect.left +
        scrollRef.value.scrollLeft -
        containerRect.width / 2 +
        noteRect.width / 2
      scrollRef.value.scrollTo({ left, behavior: 'smooth' })
    }
  },
)
</script>

<template>
  <div
    ref="scrollRef"
    class="mx-auto w-fit max-w-full overflow-x-auto rounded border border-(--p-content-border-color)"
  >
    <div class="flex min-w-max flex-col gap-2 py-2">
      <div
        v-for="index in VOZ_MELODIES.length"
        :key="index"
        :ref="
          (el) => {
            if (el) staffContainers[index - 1] = el as HTMLElement
          }
        "
      />
    </div>
  </div>
</template>

<style scoped>
:deep(.note-active path),
:deep(.note-active rect) {
  fill: var(--p-primary-color);
}
</style>
