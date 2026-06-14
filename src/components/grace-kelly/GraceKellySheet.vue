<script setup lang="ts">
import { useDebounceFn, useResizeObserver } from '@vueuse/core'
import { renderAbc } from 'abcjs'
import ActiveBarHighlight from './ActiveBarHighlight.vue'
import { estimateStaffWidth, vozMelodyToAbcString } from './graceKellyAbc'
import type { VozMelody } from './graceKellyMelodies'
import {
  measureMusicWidth,
  STAFF_LABEL_FONT,
  STAFF_LYRIC_FONT,
} from './graceKellyStaffRender'

type Props = {
  melody: VozMelody
  vozLabel: string
  startToneMidi: number
  bpm: number
  activeNoteIndex: number | null
  /* True once the song finished on its own — keeps the scroll parked at the end
   * instead of resetting to the start. A stop/restart leaves this false. */
  isDone?: boolean
  /* ABC `w:` lyric line drawn under the staff; omit to render notes only. */
  lyrics?: string
  /* Flat reading-order index of the syllable to highlight; -1/null = none. */
  activeSyllableIndex?: number | null
  /* Sounding pitch of the active note, drawn as a label floating above it;
   * omit/null to hide. */
  currentToneLabel?: string | null
  /* When false, hides the active-bar highlight box; defaults to shown. */
  showBarHighlight?: boolean
}

const props = defineProps<Props>()

/* Sans-serif for the composer credit and the lyric line under the staff. */
const SANS_FONTS = {
  composerfont: STAFF_LABEL_FONT,
  vocalfont: STAFF_LYRIC_FONT,
} as const

const containerRef = ref<HTMLDivElement | null>(null)
const scrollRef = ref<HTMLDivElement | null>(null)
const noteElements = ref<Element[]>([])
const lyricElements = ref<Element[]>([])

/* Pixel offset of the floating tone label within the scrolling content, centered
 * above the active note; null hides it. Lives in content coordinates so it scrolls
 * with the staff for free. */
const toneLabelPosition = ref<{ left: number; top: number } | null>(null)

/* Left/width (in scrolling-content coordinates) of the translucent box behind the
 * active note's bar; null hides it. Container-relative like toneLabelPosition, so
 * it scrolls horizontally with the staff for free. */
const activeBarPosition = ref<{ left: number; width: number } | null>(null)

function updateToneLabelPosition(index: number | null) {
  if (index === null || !containerRef.value) {
    toneLabelPosition.value = null

    return
  }

  const element = noteElements.value[index]
  if (!element) {
    toneLabelPosition.value = null

    return
  }

  const noteRect = element.getBoundingClientRect()
  const containerRect = containerRef.value.getBoundingClientRect()
  toneLabelPosition.value = {
    left: noteRect.left - containerRect.left + noteRect.width / 2,
    top: noteRect.top - containerRect.top,
  }
}

/* Position the translucent box over the *measure* containing the active note —
 * barline-to-barline, not hugging the noteheads — so wide lyrics sit inside it and
 * the final measure's box covers its trailing rests too. The active note's x picks
 * which barline interval to span; coordinates are container-relative so the box
 * scrolls with the staff. */
function updateActiveBar(index: number | null) {
  if (index === null || !containerRef.value) {
    activeBarPosition.value = null

    return
  }

  const element = noteElements.value[index]
  if (!element) {
    activeBarPosition.value = null

    return
  }

  const container = containerRef.value
  const containerLeft = container.getBoundingClientRect().left
  const centerX = (rect: DOMRect) => rect.left - containerLeft + rect.width / 2

  /* Sample the notehead glyph (not the stem/beam group bbox) so the x falls
   * cleanly inside the note's measure. */
  const head = element.querySelector('.abcjs-notehead') ?? element
  const noteX = centerX(head.getBoundingClientRect())

  /* Barline centers in reading order — the measure boundaries. */
  const barlineCenters = [...container.querySelectorAll('.abcjs-bar')]
    .map((bar) => centerX(bar.getBoundingClientRect()))
    .sort((a, b) => a - b)

  /* Right edge = the barline closing the active measure. The final partial measure
   * has no closing barline, so fall back to the rightmost drawn content (notes,
   * rests, barlines) — this is what extends the box across the trailing rests. */
  const rightBoundary =
    barlineCenters.find((x) => x > noteX) ??
    Math.max(
      ...[
        ...container.querySelectorAll('.abcjs-note, .abcjs-rest, .abcjs-bar'),
      ].map((item) => item.getBoundingClientRect().right - containerLeft),
    )

  /* Left edge = the barline opening the active measure. The pickup / first measure
   * has none, so fall back to the leftmost notehead minus a small pad (starts the
   * box at the first note, not over the clef / key / time signature). */
  const EDGE_PAD = 8 // px — gap before the first note when there's no opening barline
  const leftBarlines = barlineCenters.filter((x) => x < noteX)
  const leftBoundary =
    leftBarlines.length > 0
      ? leftBarlines[leftBarlines.length - 1]
      : Math.min(
          ...noteElements.value.map(
            (note) => note.getBoundingClientRect().left - containerLeft,
          ),
        ) - EDGE_PAD

  /* Inset slightly inside the barlines so their glyphs stay visible. */
  const INNER_GAP = 3 // px
  const left = Math.max(0, leftBoundary + INNER_GAP)
  const width = rightBoundary - INNER_GAP - left
  activeBarPosition.value = width > 0 ? { left, width } : null
}

async function renderSheet() {
  if (!containerRef.value) return

  const baseAbcString = vozMelodyToAbcString(
    props.melody,
    props.vozLabel,
    props.startToneMidi,
    props.bpm,
    true,
    props.lyrics,
  )

  /* The voice title (`vozLabel`) is shown outside this component as plain HTML,
   * so drop the builder's `T:` line from the sheet and swap in the `C:` (composer)
   * credit, which abcjs draws right-aligned at the top. Scoped to this component,
   * leaving the shared ABC builder untouched. */
  const abcString = baseAbcString.replace(/^T:.*$/m, 'C:Music by MIKA')

  /* Pass 1 — render at an oversized width so abcjs keeps everything on one
   * line (it wraps only when staffwidth is smaller than the music needs). */
  const probeWidth = estimateStaffWidth(props.melody.notes.length)
  renderAbc(containerRef.value, abcString, {
    add_classes: true,
    staffwidth: probeWidth,
    format: SANS_FONTS,
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
      format: SANS_FONTS,
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

  /* A re-render (resize / tab reveal) rebuilds the elements, so re-apply any
   * active highlight the watchers set before this render replaced the SVG. */
  const noteIndex = props.activeNoteIndex
  if (noteIndex !== null)
    noteElements.value[noteIndex]?.classList.add('note-active')

  updateToneLabelPosition(noteIndex)
  updateActiveBar(noteIndex)

  const syllableIndex = props.activeSyllableIndex
  if (
    syllableIndex !== null &&
    syllableIndex !== undefined &&
    syllableIndex >= 0
  ) {
    lyricElements.value[syllableIndex]?.classList.add('syllable-active')
  }
}

onMounted(() => {
  void renderSheet()
})

/* abcjs bakes a fixed pixel width into the SVG at render time. Re-render when the
 * available width changes — on window resize, and (critically) when the staff is
 * first laid out with a real width after its tab panel becomes visible, since a
 * render measured at width 0 stays stuck at the oversized probe width. Observing
 * the parent (not the w-fit scroll box) avoids a content-driven feedback loop. */
const rerenderOnResize = useDebounceFn(() => {
  void renderSheet()
}, 150)

useResizeObserver(
  () => scrollRef.value?.parentElement ?? null,
  ([entry]) => {
    if (entry.contentRect.width > 0) rerenderOnResize()
  },
)

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
      updateToneLabelPosition(null)
      updateActiveBar(null)

      /* Song ended naturally → leave the scroll at the end. Stop/restart clears
       * the highlight with isDone false, so it still snaps back to the start. */
      if (!props.isDone && scrollRef.value) scrollRef.value.scrollLeft = 0

      return
    }

    const element = noteElements.value[index]
    if (!element) return

    element.classList.add('note-active')
    updateToneLabelPosition(index)
    updateActiveBar(index)
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

/* Scroll the staff so the lyric'd note matching the given flat syllable index is
 * centered. The flat index lines up with `lyricElements` reading order (the same
 * index used by activeSyllableIndex), so callers can hand over a lyric index
 * directly. No-op when the staff doesn't overflow (e.g. desktop, no scrollbar). */
function scrollToSyllable(index: number) {
  lyricElements.value[index]?.scrollIntoView({
    behavior: 'smooth',
    inline: 'center',
    block: 'nearest',
  })
}

defineExpose({ scrollToSyllable })
</script>

<template>
  <div
    ref="scrollRef"
    class="mx-auto w-fit max-w-full overflow-x-auto rounded border border-(--p-content-border-color)"
  >
    <div class="relative min-w-max">
      <ActiveBarHighlight
        :position="activeBarPosition"
        :show="showBarHighlight !== false"
      />
      <div ref="containerRef" class="relative z-10 py-0.5" />
      <span
        v-if="currentToneLabel && toneLabelPosition"
        class="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded bg-(--p-content-background) px-0.5 text-sm leading-none font-semibold text-(--p-primary-color) tabular-nums"
        :style="{
          left: `${toneLabelPosition.left + 5}px`,
          top: `${toneLabelPosition.top - 14}px`,
        }"
      >
        {{ currentToneLabel }}
      </span>
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

/* Dim the staff part-title to match the stacked sheet view; SVG text color is
 * `fill`, not `color`. */
:deep(.abcjs-title) {
  fill: var(--p-text-muted-color);
}
</style>
