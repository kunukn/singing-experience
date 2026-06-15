<script setup lang="ts">
import { midiToNoteLabel } from '@/utils/noteUtils'
import { useDebounceFn, useResizeObserver } from '@vueuse/core'
import { renderAbc } from 'abcjs'
import { estimateStaffWidth, vozMelodyToAbcString } from './graceKellyAbc'
import { GRACE_KELLY_LYRIC_ABC } from './graceKellyLyrics'
import { VOZ_MELODIES } from './graceKellyMelodies'
import {
  measureMusicWidth,
  STAFF_LABEL_FONT,
  STAFF_LYRIC_FONT,
} from './graceKellyStaffRender'

type Props = {
  activeNoteIndex: number | null
  /* True once the song finished on its own — keeps the scroll parked at the end
   * instead of resetting to the start. A stop/restart leaves this false. */
  isDone?: boolean
  /* Flat reading-order index of the syllable to highlight; -1/null = none. */
  activeSyllableIndex?: number | null
  startToneMidi: number
  /* Part labels ordered by VOZ_MELODIES index (used as each staff's title). */
  vozLabels: string[]
  /* Which voices to render, by VOZ_MELODIES index, in display order. Defaults to
   * all six — the harmony tab passes a filtered subset to show/hide parts. */
  vozIndices?: number[]
  /* When true, draws a muted note-name label above every note on every staff (the
   * green active chip overlays its note during playback). When off, only the first
   * note's label shows per staff — the start-tone cue, always visible. Defaults off. */
  showToneLabels?: boolean
}

const props = defineProps<Props>()

/* Resolved voices to render — the given subset, or all six by default. */
const renderedVozIndices = computed(
  () => props.vozIndices ?? VOZ_MELODIES.map((_, index) => index),
)

/* Compact vertical layout for the stacked all-parts view: a smaller title
 * font and trimmed top/bottom padding shrink each staff's height without
 * scaling the notes. */
const COMPACT_RENDER = {
  add_classes: true,
  paddingtop: 4,
  paddingbottom: 4,
  /* Sans-serif for the staff title and the lyric line under each staff. */
  format: { titlefont: STAFF_LABEL_FONT, vocalfont: STAFF_LYRIC_FONT },
} as const

const scrollRef = ref<HTMLDivElement | null>(null)
const staffContainers = ref<HTMLElement[]>([])
/* Note elements per staff, indexed [staffIndex][noteIndex] — all melodies share
 * the same 34-note rhythm, so a single activeNoteIndex maps onto every staff. */
const noteElementsByStaff = ref<Element[][]>([])
/* Lyric elements per staff, indexed [staffIndex][syllableIndex] — every staff
 * shares one lyric mapping, so a single activeSyllableIndex maps onto each. */
const lyricElementsByStaff = ref<Element[][]>([])

/* Nudge applied to each staff's floating tone chip so it sits slightly inset from
 * and above the note it annotates. */
const TONE_LABEL_OFFSET_X = 5 // px — inset from the note's left edge
const TONE_LABEL_OFFSET_Y = -10 // px — lift above the note

/* Absolute-positioning style for a tone chip at the given staff-space position. */
function toneLabelStyle(
  position: { left: number; top: number } | null | undefined,
) {
  return {
    left: `${(position?.left ?? 0) + TONE_LABEL_OFFSET_X}px`,
    top: `${(position?.top ?? 0) + TONE_LABEL_OFFSET_Y}px`,
  }
}

/* Pixel offset (in each staff container's coords) of the green tone chip floating
 * above that staff's active note; one slot per rendered staff, null hides it.
 * Container-relative so the chips scroll horizontally with the staves for free. */
const toneLabelByStaff = ref<({ left: number; top: number } | null)[]>([])

/* Muted note-name chips above every note, per rendered staff. Each entry pairs a
 * container-relative position with that note's sounding pitch (start tone transposes
 * the melody). Measured on every render; the template gates display so toggling
 * needs no re-render. Mirrors SingSheet's allToneLabels, looped over the staves. */
const allToneLabelsByStaff = ref<
  { left: number; top: number; text: string }[][]
>([])

/* Tone-name chips to render per staff: all of them when the toggle is on, otherwise
 * just the first note's — the start-tone cue is always visible so the singer knows
 * what note each voice begins on. */
const visibleToneLabelsByStaff = computed(() =>
  allToneLabelsByStaff.value.map((labels) =>
    props.showToneLabels ? labels : labels.slice(0, 1),
  ),
)

/* Measure every note's position on every rendered staff, mirroring SingSheet's
 * updateAllToneLabels but looped over the stacked staves. */
function updateAllToneLabels() {
  const vozIndices = renderedVozIndices.value
  const containers = staffContainers.value.slice(0, vozIndices.length)
  allToneLabelsByStaff.value = vozIndices.map((vozIndex, staffIndex) => {
    const container = containers[staffIndex]
    const elements = noteElementsByStaff.value[staffIndex]
    if (!container || !elements) return []

    const containerRect = container.getBoundingClientRect()
    return elements.flatMap((element, noteIndex) => {
      const note = VOZ_MELODIES[vozIndex].notes[noteIndex]
      if (!note) return []

      const noteRect = element.getBoundingClientRect()
      return [
        {
          left: noteRect.left - containerRect.left + noteRect.width / 2,
          top: noteRect.top - containerRect.top,
          text: midiToNoteLabel(props.startToneMidi + note.midiOffset).label,
        },
      ]
    })
  })
}

/* Measure each staff's active-note position, mirroring SingSheet's
 * updateToneLabelPosition but looped over the stacked staves. */
function updateToneLabelPositions(index: number | null) {
  if (index === null) {
    toneLabelByStaff.value = []

    return
  }

  const containers = staffContainers.value.slice(
    0,
    renderedVozIndices.value.length,
  )
  toneLabelByStaff.value = containers.map((container, staffIndex) => {
    const element = noteElementsByStaff.value[staffIndex]?.[index]
    if (!container || !element) return null

    const noteRect = element.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    return {
      left: noteRect.left - containerRect.left + noteRect.width / 2,
      top: noteRect.top - containerRect.top,
    }
  })
}

/* Green note-name chip per staff: the sounding pitch of that voice's active note
 * (start tone transposes the melody) paired with its measured position. null per
 * staff when idle or unmeasured. */
const staffLabels = computed(() =>
  renderedVozIndices.value.map((vozIndex, staffIndex) => {
    const index = props.activeNoteIndex
    if (index === null) return null

    const note = VOZ_MELODIES[vozIndex].notes[index]
    const position = toneLabelByStaff.value[staffIndex]
    if (!note || !position) return null

    return {
      text: midiToNoteLabel(props.startToneMidi + note.midiOffset).label,
      left: position.left,
      top: position.top,
    }
  }),
)

async function renderSheets() {
  const vozIndices = renderedVozIndices.value
  /* Containers are positional (one per rendered voice); slice to the active
   * count so a freshly-toggled subset doesn't measure stale trailing staves. */
  const containers = staffContainers.value.slice(0, vozIndices.length)
  if (containers.length < vozIndices.length) return

  /* Skip while the panel is hidden (display:none → offsetParent null). abcjs would
   * render at the oversized probe width, then — with every rect width measuring 0 —
   * skip the fit-to-content pass below, leaving too-wide SVGs that visibly snap back
   * when the tab is first revealed. The resize observer re-renders on reveal, once
   * the staves have a real width to measure against. */
  if (containers[0]?.offsetParent === null) return

  const abcStrings = vozIndices.map((vozIndex) =>
    /* Pass showTempo=false so the BPM header is hidden on the combined sheet;
     * the shared lyric line draws under every staff. */
    vozMelodyToAbcString(
      VOZ_MELODIES[vozIndex],
      props.vozLabels[vozIndex] ?? '',
      props.startToneMidi,
      undefined,
      false,
      GRACE_KELLY_LYRIC_ABC,
    ),
  )

  /* Pass 1 — render each staff at an oversized width so abcjs keeps it on one
   * line, then measure each staff's natural music width. */
  const probeWidth = estimateStaffWidth(VOZ_MELODIES[0].notes.length)
  for (let index = 0; index < containers.length; index++) {
    renderAbc(containers[index], abcStrings[index], {
      ...COMPACT_RENDER,
      staffwidth: probeWidth,
    })
  }

  await nextTick()

  /* Pass 2 — re-render every staff at one shared width (the widest measured) so
   * the bars line up column-for-column across the rendered parts. */
  const TRAILING_MARGIN = 24
  const sharedWidth =
    Math.ceil(Math.max(...containers.map(measureMusicWidth))) + TRAILING_MARGIN
  for (let index = 0; index < containers.length; index++) {
    renderAbc(containers[index], abcStrings[index], {
      ...COMPACT_RENDER,
      staffwidth: sharedWidth,
    })
  }

  await nextTick()
  noteElementsByStaff.value = containers.map((container) => [
    ...container.querySelectorAll('.abcjs-note'),
  ])
  lyricElementsByStaff.value = containers.map((container) => [
    ...container.querySelectorAll('.abcjs-lyric'),
  ])

  /* A re-render (resize / tab reveal) rebuilds the elements, so re-apply any
   * active highlight the watchers set before this render replaced the SVGs. */
  const noteIndex = props.activeNoteIndex
  if (noteIndex !== null) {
    for (const staff of noteElementsByStaff.value) {
      staff[noteIndex]?.classList.add('note-active')
    }
  }

  const syllableIndex = props.activeSyllableIndex
  if (
    syllableIndex !== null &&
    syllableIndex !== undefined &&
    syllableIndex >= 0
  ) {
    for (const staff of lyricElementsByStaff.value) {
      staff[syllableIndex]?.classList.add('syllable-active')
    }
  }

  updateToneLabelPositions(props.activeNoteIndex)
  updateAllToneLabels()
}

onMounted(() => {
  void renderSheets()
})

/* abcjs bakes a fixed pixel width into each staff's SVG at render time. Re-render
 * when the available width changes — on window resize, and (critically) when the
 * stack is first laid out with a real width after its tab panel becomes visible,
 * since a render measured at width 0 stays stuck at the oversized probe width.
 * Observing the parent (not the w-fit scroll box) avoids a feedback loop. */
const rerenderOnResize = useDebounceFn(() => {
  void renderSheets()
}, 150)

useResizeObserver(
  () => scrollRef.value?.parentElement ?? null,
  ([entry]) => {
    if (entry.contentRect.width > 0) rerenderOnResize()
  },
)

watch(
  () => [props.vozLabels, props.startToneMidi, renderedVozIndices.value],
  async () => {
    /* Wait for the v-for to add/remove staff containers before re-rendering so
     * a newly-toggled subset measures against the right number of staves. */
    await nextTick()
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
      updateToneLabelPositions(null)

      /* Song ended naturally → leave the scroll at the end. Stop/restart clears
       * the highlight with isDone false, so it still snaps back to the start. */
      if (!props.isDone && scrollRef.value) scrollRef.value.scrollLeft = 0

      return
    }

    for (const staff of noteElementsByStaff.value) {
      staff[index]?.classList.add('note-active')
    }

    updateToneLabelPositions(index)

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

watch(
  () => props.activeSyllableIndex,
  (index) => {
    for (const staff of lyricElementsByStaff.value) {
      for (const element of staff) element.classList.remove('syllable-active')
    }

    /* -1 (idle) and null both mean "no syllable lit". The active note's column
     * is already centered by the note watch, carrying its lyric. */
    if (index === null || index === undefined || index < 0) return

    for (const staff of lyricElementsByStaff.value) {
      staff[index]?.classList.add('syllable-active')
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
        v-for="(vozIndex, position) in renderedVozIndices"
        :key="vozIndex"
        class="relative"
      >
        <div
          :ref="
            (el) => {
              if (el) staffContainers[position] = el as HTMLElement
            }
          "
        />
        <!--
          Muted note-name label above each note on this staff. With the toggle on,
          every note; with it off, only the first (the start-tone cue). The green
          active chip below renders later in the DOM with an opaque bg and higher z,
          so it cleanly overlays the matching muted label during playback.
        -->
        <span
          v-for="(label, noteIndex) in visibleToneLabelsByStaff[position] ?? []"
          :key="noteIndex"
          class="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded bg-(--p-content-background) px-0.5 text-xs leading-none font-semibold text-(--p-text-muted-color) tabular-nums"
          :style="toneLabelStyle(label)"
        >
          {{ label.text }}
        </span>

        <span
          v-if="staffLabels[position]"
          class="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded bg-(--p-content-background) px-0.5 text-xs leading-none font-semibold text-(--p-primary-color) tabular-nums"
          :style="toneLabelStyle(staffLabels[position])"
        >
          {{ staffLabels[position]?.text }}
        </span>
      </div>
    </div>
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

/* Dim the staff part-titles ("Melody", "Really high", …) so the stacked sheet
 * reads as less busy; SVG text color is `fill`, not `color`. */
:deep(.abcjs-title) {
  fill: var(--p-text-muted-color);
}
</style>
