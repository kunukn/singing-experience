<script setup lang="ts">
import { useDebounceFn, useResizeObserver } from '@vueuse/core'
import { renderAbc } from 'abcjs'
import { estimateStaffWidth, vozMelodyToAbcString } from './graceKellyAbc'
import type { VozMelody } from './graceKellyMelodies'
import { measureMusicWidth } from './graceKellyStaffRender'
import { buildPitchToY, type PitchSample } from './graceKellySingPitch'

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
  /* Continuous MIDI value of the singer's live pitch (raw, not rounded); null
   * when silent. Drives the vertical position of the pitch line. */
  sungMidi?: number | null
  /* True when the sung pitch is within tolerance of the active note — turns the
   * pitch line green. */
  isOnPitch?: boolean
}

const props = defineProps<Props>()

/* abcjs font strings are '<family> <size>'. Sans-serif for the composer credit
 * and the lyric line under the staff. */
const SANS_FONTS = {
  composerfont: 'sans-serif 13',
  vocalfont: 'sans-serif 13',
} as const

const rootRef = ref<HTMLDivElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const scrollRef = ref<HTMLDivElement | null>(null)
const noteElements = ref<Element[]>([])
const lyricElements = ref<Element[]>([])

/* Pixel offset of the floating tone label within the scrolling content, centered
 * above the active note; null hides it. Lives in content coordinates so it scrolls
 * with the staff for free. */
const toneLabelPosition = ref<{ left: number; top: number } | null>(null)

/* Linear MIDI→Y mapping calibrated from the rendered noteheads; rebuilt on every
 * render. Y is measured in rootRef coordinates so the pitch line, pinned to the
 * root, stays correct regardless of horizontal scroll. */
const pitchToY = shallowRef<(midi: number) => number>(() => 0)
const staffHeight = ref(0)

/* Vertical position of the live pitch line in rootRef coords, clamped to the
 * staff so a very high/low voice parks at the edge instead of flying off; null
 * hides the line (no clean pitch detected). */
const pitchLineTop = computed(() => {
  if (props.sungMidi === null || props.sungMidi === undefined) return null

  const raw = pitchToY.value(props.sungMidi)
  const EDGE_MARGIN = 2 // px — keep the 2px line fully visible at the edges
  return Math.max(EDGE_MARGIN, Math.min(staffHeight.value - EDGE_MARGIN, raw))
})

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

/* Sample each notehead's pitch and its center-Y (in rootRef coords) and build
 * the MIDI→Y mapping. noteElements[i] is the i-th melody note in reading order,
 * so its absolute pitch is startTone + that note's offset. */
function calibratePitchToY() {
  if (!rootRef.value) return

  const rootRect = rootRef.value.getBoundingClientRect()
  staffHeight.value = rootRef.value.clientHeight

  const samples: PitchSample[] = []
  noteElements.value.forEach((element, index) => {
    const note = props.melody.notes[index]
    if (!note) return

    const rect = element.getBoundingClientRect()
    samples.push({
      midi: props.startToneMidi + note.midiOffset,
      y: rect.top - rootRect.top + rect.height / 2,
    })
  })

  pitchToY.value = buildPitchToY(samples)
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
  calibratePitchToY()

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

      /* Song ended naturally → leave the scroll at the end. Stop/restart clears
       * the highlight with isDone false, so it still snaps back to the start. */
      if (!props.isDone && scrollRef.value) scrollRef.value.scrollLeft = 0

      return
    }

    const element = noteElements.value[index]
    if (!element) return

    element.classList.add('note-active')
    updateToneLabelPosition(index)
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
  <div ref="rootRef" class="relative mx-auto w-fit max-w-full">
    <div
      ref="scrollRef"
      class="w-full overflow-x-auto rounded border border-(--p-content-border-color)"
    >
      <div class="relative min-w-max">
        <div ref="containerRef" class="py-0.5" />
        <span
          v-if="currentToneLabel && toneLabelPosition"
          class="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded bg-(--p-content-background) px-0.5 text-sm leading-none font-semibold text-(--p-primary-color) tabular-nums"
          :style="{
            left: `${toneLabelPosition.left + 5}px`,
            top: `${toneLabelPosition.top - 14}px`,
          }"
        >
          {{ currentToneLabel }}
        </span>
      </div>
    </div>

    <!--
      Live pitch line — pinned to the root (not the scroll box) so horizontal
      auto-scroll of the staff never shifts it sideways; only its vertical
      position tracks the singer's pitch. Green when on the target note, yellow
      otherwise.
    -->
    <div
      v-if="pitchLineTop !== null"
      class="pointer-events-none absolute inset-x-2 h-0.5 transition-colors duration-100"
      :class="isOnPitch ? 'bg-(--p-green-400)' : 'bg-(--p-yellow-400)'"
      :style="{ top: `${pitchLineTop}px` }"
    />
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
