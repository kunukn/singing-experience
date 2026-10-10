<script setup lang="ts">
import {
  measureMusicWidth,
  STAFF_LABEL_FONT,
  STAFF_LYRIC_FONT,
} from '@/components/grace-kelly/graceKellyStaffRender'
import type { ClefKey } from '@/components/notes/notesConstants'
import { formatNoteLabelWithCents } from '@/utils/noteUtils'
import { useDebounceFn, useResizeObserver } from '@vueuse/core'
import { renderAbc } from 'abcjs'
import type { LiveNoteKind } from './liveRecordingNotes'
import { staffPitchY } from './staffPitch'

type Props = {
  abc: string
  /* Index into the drawn heads/rests (SheetPiece order) to highlight. */
  activePieceIndex: number | null
  /* Keeps the scroll at the end after playback ran out instead of resetting. */
  isDone?: boolean
  /* During a take (count-in and recording): follow the playhead slot instead
   * of the playback highlight, and redraw on every change without debounce. */
  isLive?: boolean
  /* Live sheet only: kind of each drawn piece (template slots and the ghost
   * note are faded) and the piece under the playhead. */
  pieceKinds?: LiveNoteKind[] | null
  nowPieceIndex?: number | null
  clef: ClefKey
  /* "See your voice": continuous MIDI of the live pitch; null hides the line. */
  sungMidi?: number | null
  /* De-flickered note label riding the line, with its cents deviation. */
  sungToneLabel?: string | null
  sungToneCents?: number | null
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

/* Room inside the SVG above and below the staff so the voice line has space
 * beyond it — about ten staff steps (~1.4 octaves) each way at abcjs's default
 * scale, instead of pinning at the box edge as soon as the singer leaves the
 * staff (a low voice on an empty treble staff). */
const STAFF_PADDING = 40 // px

const rootRef = ref<HTMLDivElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const scrollRef = ref<HTMLDivElement | null>(null)
const pieceElements = ref<Element[]>([])

function probeWidth(abc: string) {
  const barCount = abc.split('|').length

  return Math.max(MIN_PROBE_WIDTH, barCount * PROBE_WIDTH_PER_BAR)
}

/* Where the staff is drawn, in rootRef coordinates — measured after each
 * render. Anchoring on the staff lines (not noteheads) works on an empty sheet. */
const staffGeometry = ref<{ topLineY: number; lineSpacing: number } | null>(
  null,
)
const rootHeight = ref(0)

function measureStaff() {
  const staff = containerRef.value?.querySelector('.abcjs-staff')
  if (!rootRef.value || !staff) {
    staffGeometry.value = null

    return
  }

  /* The staff group spans top line to bottom line: four line gaps. */
  const STAFF_GAPS = 4
  const rootRect = rootRef.value.getBoundingClientRect()
  const staffRect = staff.getBoundingClientRect()
  rootHeight.value = rootRef.value.clientHeight
  staffGeometry.value = {
    topLineY: staffRect.top - rootRect.top,
    lineSpacing: staffRect.height / STAFF_GAPS,
  }
}

/* Vertical position of the live pitch line, clamped inside the sheet box. */
const pitchLineTop = computed(() => {
  const geometry = staffGeometry.value
  if (props.sungMidi == null || !geometry) return null

  const y = staffPitchY(
    props.sungMidi,
    props.clef,
    geometry.topLineY,
    geometry.lineSpacing,
  )
  const EDGE_MARGIN = 2 // px — keep the 3px line fully visible at the edges

  return Math.max(EDGE_MARGIN, Math.min(rootHeight.value - EDGE_MARGIN, y))
})

const { colorForCents } = usePitchPreviewColor()

/* Same cents colouring as every idle preview: green when in tune, shading off
 * as the pitch drifts. Line alpha matches NotesSheet's /50. */
const pitchLineStyle = computed(() => {
  if (props.sungToneCents == null) return null

  return {
    line: { borderColor: colorForCents(props.sungToneCents, 0.5) },
    chip: { color: colorForCents(props.sungToneCents) },
  }
})

/* ±40¢ — audibly off; below this the cents suffix is noise. */
const SUNG_CENTS_THRESHOLD = 40

const sungToneText = computed(() => {
  if (!props.sungToneLabel) return null

  return formatNoteLabelWithCents(
    props.sungToneLabel,
    props.sungToneCents ?? 0,
    SUNG_CENTS_THRESHOLD,
  )
})

function applyPieceClasses() {
  pieceElements.value.forEach((element, index) => {
    const kind = props.pieceKinds?.[index]
    element.classList.toggle('piece-active', index === props.activePieceIndex)
    element.classList.toggle('piece-now', index === props.nowPieceIndex)
    element.classList.toggle('piece-template', kind === 'template')
    element.classList.toggle('piece-ghost', kind === 'ghost')
  })
}

/* Where the playhead slot sits in the visible box while recording: a third in
 * from the start, so the template bars ahead stay in view. */
const PLAYHEAD_VIEW_RATIO = 1 / 3

function followPlayhead() {
  const scroller = scrollRef.value
  const index = props.nowPieceIndex
  const element = index == null ? null : pieceElements.value[index]
  if (!scroller || !element) return

  const elementLeft =
    element.getBoundingClientRect().left -
    scroller.getBoundingClientRect().left +
    scroller.scrollLeft
  scroller.scrollTo({
    left: elementLeft - scroller.clientWidth * PLAYHEAD_VIEW_RATIO,
    behavior: 'smooth',
  })
}

async function drawSheet() {
  const container = containerRef.value
  /* Hidden (display:none) → nothing to measure; the resize observer renders
   * once it's laid out. */
  if (!container || container.offsetParent === null) return

  renderAbc(container, props.abc, {
    add_classes: true,
    staffwidth: probeWidth(props.abc),
    paddingtop: STAFF_PADDING,
    paddingbottom: STAFF_PADDING,
    format: SANS_FONTS,
  })

  await nextTick()
  const musicWidth = measureMusicWidth(container)
  if (musicWidth > 0) {
    renderAbc(container, props.abc, {
      add_classes: true,
      staffwidth: Math.ceil(musicWidth) + TRAILING_MARGIN,
      paddingtop: STAFF_PADDING,
      paddingbottom: STAFF_PADDING,
      format: SANS_FONTS,
    })
    await nextTick()
  }

  /* Heads and rests in reading order — the same order as SheetPiece. */
  pieceElements.value = [
    ...container.querySelectorAll('.abcjs-note, .abcjs-rest'),
  ]
  applyPieceClasses()
  measureStaff()

  if (props.isLive) followPlayhead()
}

/* drawSheet awaits between its two passes; a second call meanwhile would
 * interleave with it, so it's queued and run once the current one ends. */
let isRendering = false
let isRenderQueued = false

async function renderSheet() {
  if (isRendering) {
    isRenderQueued = true

    return
  }

  isRendering = true
  try {
    await drawSheet()
  } finally {
    isRendering = false
  }

  if (isRenderQueued) {
    isRenderQueued = false
    void renderSheet()
  }
}

onMounted(() => {
  void renderSheet()
})

const rerender = useDebounceFn(() => {
  void renderSheet()
}, 150)

/* The live sheet changes once per grid step — under 150 ms at a fast tempo on
 * the 1/16 grid — so a trailing debounce would never fire mid-take. */
watch(
  () => [props.abc, props.clef],
  () => {
    if (props.isLive) void renderSheet()
    else rerender()
  },
)

useResizeObserver(
  () => scrollRef.value?.parentElement ?? null,
  ([entry]) => {
    if (entry.contentRect.width > 0) rerender()
  },
)

watch(
  () => props.nowPieceIndex,
  () => {
    applyPieceClasses()
    if (props.isLive) followPlayhead()
  },
)

watch(
  () => props.activePieceIndex,
  (index) => {
    applyPieceClasses()

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
  <div ref="rootRef" class="relative mx-auto w-fit max-w-full">
    <div
      ref="scrollRef"
      class="w-full overflow-x-auto rounded border border-(--p-content-border-color)"
      data-testid="song-recorder-sheet"
      :data-piece-count="pieceElements.length"
      :data-active-piece="activePieceIndex ?? ''"
    >
      <div ref="containerRef" class="min-w-max py-0.5" />
    </div>

    <!--
      Live pitch line — pinned to the root, not the scroll box, so scrolling the
      staff never moves it sideways; only its height follows the voice.
    -->
    <div
      v-if="pitchLineTop !== null"
      class="pointer-events-none absolute inset-x-2 h-0 border-t-3 border-dashed border-(--p-orange-400)/50 transition-colors duration-100"
      :style="{ top: `${pitchLineTop}px`, ...pitchLineStyle?.line }"
      data-testid="song-recorder-pitch-line"
    />

    <div
      v-if="pitchLineTop !== null && sungToneText"
      class="pointer-events-none absolute inset-x-2 z-20 flex -translate-y-1/2 justify-center"
      :style="{ top: `${pitchLineTop}px` }"
    >
      <span
        class="rounded bg-(--p-content-background) px-0.5 text-xs leading-none font-semibold text-(--p-orange-400) tabular-nums transition-colors duration-100"
        :style="pitchLineStyle?.chip"
      >
        {{ sungToneText }}
      </span>
    </div>
  </div>
</template>

<style scoped>
:deep(.piece-active path),
:deep(.piece-active rect) {
  fill: var(--p-primary-color);
}

/* Live sheet: empty slots ahead of the singer, and the note still sounding. */
:deep(.piece-template) {
  opacity: 0.25;
}

:deep(.piece-ghost) {
  opacity: 0.5;
}

:deep(.piece-ghost path),
:deep(.piece-now path),
:deep(.piece-now rect) {
  fill: var(--p-primary-color);
}

:deep(.piece-now.piece-template) {
  opacity: 1;
}

/* Lift the tempo marking (`Q:` → "♩=90") clear of the staff, as NotesSheet. */
:deep(.abcjs-tempo) {
  transform: translateY(-20px);
}
</style>
