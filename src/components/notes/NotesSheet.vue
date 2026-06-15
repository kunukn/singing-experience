<script setup lang="ts">
import {
  buildPitchToY,
  type PitchSample,
} from '@/components/grace-kelly/graceKellySingPitch'
import {
  measureMusicWidth,
  STAFF_LABEL_FONT,
  STAFF_LYRIC_FONT,
} from '@/components/grace-kelly/graceKellyStaffRender'
import { formatNoteLabelWithCents, midiToNoteLabel } from '@/utils/noteUtils'
import { useDebounceFn, useResizeObserver } from '@vueuse/core'
import { renderAbc } from 'abcjs'
import { estimateNotesStaffWidth, noteScaleToAbcString } from './notesAbc'
import type { ClefKey } from './notesConstants'

type Props = {
  /* Absolute MIDI notes drawn left to right (one eighth note each). */
  midis: number[]
  clef: ClefKey
  bpm: number
  activeNoteIndex: number | null
  /* True once the sequence finished on its own — keeps the scroll parked at the
   * end instead of resetting to the start. A stop/restart leaves this false. */
  isDone?: boolean
  /* Sounding pitch of the active note, drawn as a label floating above it;
   * omit/null to hide. */
  currentToneLabel?: string | null
  /* Singer's de-flickered live note label, stacked above the target label;
   * green when it matches currentToneLabel, orange otherwise. */
  sungToneLabel?: string | null
  /* Signed cents between the live pitch and sungToneLabel's semitone; appended
   * to the chip (e.g. "C3 -35¢") once audibly off. omit/null to hide. */
  sungToneCents?: number | null
  /* Continuous MIDI of the singer's live pitch (raw, not rounded); null when
   * silent. Drives the vertical position of the pitch line. */
  sungMidi?: number | null
  /* True when the sung pitch is within tolerance of the active note — turns the
   * pitch line green. */
  isOnPitch?: boolean
  /* When true, draws a muted note-name label above every note. */
  showToneLabels?: boolean
  /* When false, omits the BPM tempo marking from the staff; defaults to shown. */
  showTempo?: boolean
}

/* showTempo defaults true ("defaults to shown" above). Without an explicit
 * default, Vue's Boolean-prop casting resolves an absent prop to `false`, which
 * would silently hide the tempo whenever a parent omits it. */
const props = withDefaults(defineProps<Props>(), { showTempo: true })

/* Green only when the singer's note label reads the same as the target's, so
 * the color always agrees with the two stacked labels on screen. */
const isSungMatch = computed(
  () =>
    props.sungToneLabel != null &&
    props.sungToneLabel === props.currentToneLabel,
)

/* ±40¢ — audibly off; below this the cents suffix is noise. */
const SUNG_CENTS_THRESHOLD = 40

/* Chip text: the sung label, plus the exact cents deviation once out of tune. */
const sungToneText = computed(() => {
  if (!props.sungToneLabel) return null

  return formatNoteLabelWithCents(
    props.sungToneLabel,
    props.sungToneCents ?? 0,
    SUNG_CENTS_THRESHOLD,
  )
})

const SANS_FONTS = {
  composerfont: STAFF_LABEL_FONT,
  vocalfont: STAFF_LYRIC_FONT,
} as const

/* Top space (px) reserved inside the SVG above the highest notehead so the
 * note-name chips — drawn ~28px above each note as HTML overlays — aren't clipped
 * by the scroll box (overflow-x:auto also clips the y-axis). Needed because
 * ledger-line notes (e.g. C4 on the bass staff) sit right at the staff top. */
const STAFF_PADDING_TOP = 30

const rootRef = ref<HTMLDivElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const scrollRef = ref<HTMLDivElement | null>(null)
const noteElements = ref<Element[]>([])

/* Nudge applied to every floating tone label so it sits slightly inset from and
 * above the note it annotates. TONE_LABEL_STACK_LIFT raises the singer's live
 * note one row higher than the target label it stacks on top of. */
const TONE_LABEL_OFFSET_X = 5 // px — inset from the note's left edge
const TONE_LABEL_OFFSET_Y = -6 // px — lift above the note
const TONE_LABEL_STACK_LIFT = -18 // px — extra lift for the stacked live-note row

/* Absolute-positioning style for a tone label at the given content-space position.
 * Pass an extra vertical lift to stack one label above another. */
function toneLabelStyle(
  position: { left: number; top: number } | null | undefined,
  stackLift = 0,
) {
  return {
    left: `${(position?.left ?? 0) + TONE_LABEL_OFFSET_X}px`,
    top: `${(position?.top ?? 0) + TONE_LABEL_OFFSET_Y + stackLift}px`,
  }
}

/* Pixel offset of the floating tone label within the scrolling content, centered
 * above the active note; null hides it. */
const toneLabelPosition = ref<{ left: number; top: number } | null>(null)

/* Linear MIDI→Y mapping calibrated from the rendered noteheads; rebuilt on every
 * render. Y is measured in rootRef coordinates so the pitch line stays correct
 * regardless of horizontal scroll. */
const pitchToY = shallowRef<(midi: number) => number>(() => 0)
const staffHeight = ref(0)

/* Vertical position of the live pitch line in rootRef coords, clamped to the
 * staff; null hides the line (no clean pitch detected). */
const pitchLineTop = computed(() => {
  if (props.sungMidi === null || props.sungMidi === undefined) return null

  const raw = pitchToY.value(props.sungMidi)
  const EDGE_MARGIN = 2 // px — keep the 2px line fully visible at the edges
  return Math.max(EDGE_MARGIN, Math.min(staffHeight.value - EDGE_MARGIN, raw))
})

/* Muted note-name chips above every note, shown when `showToneLabels` is on. */
const allToneLabels = ref<{ left: number; top: number; text: string }[]>([])

/* Tone-name chips to render: all when the toggle is on, none when it's off. */
const visibleToneLabels = computed(() =>
  props.showToneLabels ? allToneLabels.value : [],
)

function updateAllToneLabels() {
  if (!containerRef.value) {
    allToneLabels.value = []

    return
  }

  const containerRect = containerRef.value.getBoundingClientRect()
  allToneLabels.value = noteElements.value.flatMap((element, index) => {
    const midi = props.midis[index]
    if (midi === undefined) return []

    const noteRect = element.getBoundingClientRect()
    return [
      {
        left: noteRect.left - containerRect.left + noteRect.width / 2,
        top: noteRect.top - containerRect.top,
        text: midiToNoteLabel(midi).label,
      },
    ]
  })
}

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
 * the MIDI→Y mapping. noteElements[i] is the i-th note in reading order, so its
 * absolute pitch is midis[i] (no transposition — the start tone is fixed). */
function calibratePitchToY() {
  if (!rootRef.value) return

  const rootRect = rootRef.value.getBoundingClientRect()
  staffHeight.value = rootRef.value.clientHeight

  const samples: PitchSample[] = []
  noteElements.value.forEach((element, index) => {
    const midi = props.midis[index]
    if (midi === undefined) return

    /* Sample the notehead glyph itself (abcjs tags it) for the true staff
     * position; fall back to the group if absent. */
    const head = element.querySelector('.abcjs-notehead') ?? element
    const rect = head.getBoundingClientRect()
    samples.push({
      midi,
      y: rect.top - rootRect.top + rect.height / 2,
    })
  })

  pitchToY.value = buildPitchToY(samples)
}

async function renderSheet() {
  if (!containerRef.value) return

  /* Skip while the panel is hidden (display:none → offsetParent null). abcjs would
   * render at the oversized probe width, then — with every rect width measuring 0 —
   * skip the fit-to-content pass below, leaving a too-wide SVG that visibly snaps
   * back when the tab is first revealed. The resize observer re-renders on reveal,
   * once the container has a real width to measure against. */
  if (containerRef.value.offsetParent === null) return

  const abcString = noteScaleToAbcString(
    props.midis,
    props.clef,
    props.bpm,
    props.showTempo !== false,
  )

  /* Pass 1 — render at an oversized width so abcjs keeps everything on one line
   * (it wraps only when staffwidth is smaller than the music needs). */
  const probeWidth = estimateNotesStaffWidth(props.midis.length)
  renderAbc(containerRef.value, abcString, {
    add_classes: true,
    staffwidth: probeWidth,
    paddingtop: STAFF_PADDING_TOP,
    format: SANS_FONTS,
  })

  /* Pass 2 — measure the music's natural width and re-render at that width so the
   * SVG canvas (and the scroll area) matches the notes, with a small margin. */
  await nextTick()
  const musicWidth = measureMusicWidth(containerRef.value)
  if (musicWidth > 0) {
    const TRAILING_MARGIN = 24
    renderAbc(containerRef.value, abcString, {
      add_classes: true,
      staffwidth: Math.ceil(musicWidth) + TRAILING_MARGIN,
      paddingtop: STAFF_PADDING_TOP,
      format: SANS_FONTS,
    })
    await nextTick()
  }

  noteElements.value = [
    ...(containerRef.value?.querySelectorAll('.abcjs-note') ?? []),
  ]

  /* A re-render (resize / tab reveal) rebuilds the elements, so re-apply any
   * active highlight the watchers set before this render replaced the SVG. */
  const noteIndex = props.activeNoteIndex
  if (noteIndex !== null)
    noteElements.value[noteIndex]?.classList.add('note-active')

  updateToneLabelPosition(noteIndex)
  updateAllToneLabels()
  calibratePitchToY()
}

onMounted(() => {
  void renderSheet()
})

/* abcjs bakes a fixed pixel width into the SVG at render time. Re-render when the
 * available width changes — on window resize, and (critically) when the staff is
 * first laid out with a real width after its tab panel becomes visible. Observing
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
  () => [props.midis, props.clef, props.bpm],
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

      /* Sequence ended naturally → leave the scroll at the end. Stop/restart
       * clears the highlight with isDone false, so it snaps back to the start. */
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
</script>

<template>
  <div ref="rootRef" class="relative mx-auto w-fit max-w-full">
    <div
      ref="scrollRef"
      class="w-full overflow-x-auto rounded border border-(--p-content-border-color)"
    >
      <div class="relative min-w-max">
        <div ref="containerRef" class="relative z-10 py-0.5" />

        <!--
          Muted note-name label above each note, shown only when the toggle is on.
          The green active chip below renders later in the DOM with an opaque bg, so
          it cleanly overlays the matching muted label during playback.
        -->
        <span
          v-for="(label, index) in visibleToneLabels"
          :key="index"
          class="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded bg-(--p-content-background) px-0.5 text-xs leading-none font-semibold text-(--p-text-muted-color) tabular-nums"
          :style="toneLabelStyle(label)"
        >
          {{ label.text }}
        </span>

        <span
          v-if="currentToneLabel && toneLabelPosition"
          class="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded bg-(--p-content-background) px-0.5 text-xs leading-none font-semibold text-(--p-primary-color) tabular-nums"
          :style="toneLabelStyle(toneLabelPosition)"
        >
          {{ currentToneLabel }}
        </span>

        <!--
          Singer's live note, stacked above the target label (extra 18px lift).
          Green when it matches the target label, orange otherwise.
        -->
        <span
          v-if="sungToneLabel && toneLabelPosition"
          class="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded bg-(--p-content-background) px-0.5 text-xs leading-none font-semibold tabular-nums transition-colors duration-100"
          :class="
            isSungMatch ? 'text-(--p-primary-color)' : 'text-(--p-orange-400)'
          "
          :style="toneLabelStyle(toneLabelPosition, TONE_LABEL_STACK_LIFT)"
        >
          {{ sungToneText }}
        </span>
      </div>
    </div>

    <!--
      Live pitch line — pinned to the root (not the scroll box) so horizontal
      auto-scroll of the staff never shifts it sideways; only its vertical
      position tracks the singer's pitch. Solid green on the target note, orange
      dashed otherwise.
    -->
    <div
      v-if="pitchLineTop !== null"
      class="pointer-events-none absolute inset-x-2 h-0 border-t-3 transition-colors duration-100"
      :class="
        isOnPitch
          ? 'border-solid border-(--p-green-400)'
          : 'border-dashed border-(--p-orange-400)/50'
      "
      :style="{ top: `${pitchLineTop}px` }"
    />

    <!--
      Note-name label riding the live pitch line: centered horizontally, tracking
      the singer's pitch vertically. Color matches the line it rides.
    -->
    <div
      v-if="pitchLineTop !== null && sungToneText"
      class="pointer-events-none absolute inset-x-2 z-20 flex -translate-y-1/2 justify-center"
      :style="{ top: `${pitchLineTop}px` }"
    >
      <span
        class="rounded bg-(--p-content-background) px-0.5 text-xs leading-none font-semibold tabular-nums transition-colors duration-100"
        :class="isOnPitch ? 'text-(--p-green-400)' : 'text-(--p-orange-400)'"
      >
        {{ sungToneText }}
      </span>
    </div>
  </div>
</template>

<style scoped>
:deep(.note-active path),
:deep(.note-active rect) {
  fill: var(--p-primary-color);
}

/* Dim the staff title to match the muted aesthetic; SVG text color is `fill`. */
:deep(.abcjs-title) {
  fill: var(--p-text-muted-color);
}

/* Lift the tempo marking (`Q:` → "♩=120") above where abcjs places it.
 * SVG `<g>`, so move it with transform, not top/margin. */
:deep(.abcjs-tempo) {
  transform: translateY(-20px);
}
</style>
