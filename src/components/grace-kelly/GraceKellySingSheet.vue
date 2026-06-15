<script setup lang="ts">
import { formatNoteLabelWithCents, midiToNoteLabel } from '@/utils/noteUtils'
import { useDebounceFn, useResizeObserver } from '@vueuse/core'
import { renderAbc } from 'abcjs'
import ActiveBarHighlight from './ActiveBarHighlight.vue'
import {
  estimateStaffWidth,
  groupNoteHeads,
  vozMelodyToAbcString,
} from './graceKellyAbc'
import type { VozMelody } from './graceKellyMelodies'
import { buildPitchToY, type PitchSample } from './graceKellySingPitch'
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
  /* Reading-order indices of notes the singer got right, painted green in the
   * result state. Empty/omitted during play and idle. */
  correctNoteIndices?: number[]
  /* Sounding pitch of the active note, drawn as a label floating above it;
   * omit/null to hide. */
  currentToneLabel?: string | null
  /* Singer's de-flickered live note label, stacked above the target label;
   * green (--p-primary-color) when it matches currentToneLabel, orange
   * otherwise. omit/null to hide. */
  sungToneLabel?: string | null
  /* Signed cents between the live pitch and sungToneLabel's semitone; appended
   * to the chip (e.g. "C3 -35¢") once audibly off (±30¢). omit/null to hide. */
  sungToneCents?: number | null
  /* Continuous MIDI value of the singer's live pitch (raw, not rounded); null
   * when silent. Drives the vertical position of the pitch line. */
  sungMidi?: number | null
  /* True when the sung pitch is within tolerance of the active note — turns the
   * pitch line green. */
  isOnPitch?: boolean
  /* When true, draws a muted note-name label above every note (the green active
   * chip overlays its note during playback). Defaults to off. */
  showToneLabels?: boolean
  /* When false, hides the active-bar highlight box; defaults to shown. */
  showBarHighlight?: boolean
}

const props = defineProps<Props>()

/* Green only when the singer's note label reads the same as the target's, so
 * the color always agrees with the two stacked labels on screen. */
const isSungMatch = computed(
  () =>
    props.sungToneLabel != null &&
    props.sungToneLabel === props.currentToneLabel,
)

/* ±40¢ — audibly off; below this the cents suffix is noise. */
const SUNG_CENTS_THRESHOLD = 40

/* Chip text: the sung label, plus the exact cents deviation once out of tune
 * (e.g. "C3 -35¢") so the singer sees how far off they are. */
const sungToneText = computed(() => {
  if (!props.sungToneLabel) return null

  return formatNoteLabelWithCents(
    props.sungToneLabel,
    props.sungToneCents ?? 0,
    SUNG_CENTS_THRESHOLD,
  )
})

/* Sans-serif for the composer credit and the lyric line under the staff. */
const SANS_FONTS = {
  composerfont: STAFF_LABEL_FONT,
  vocalfont: STAFF_LYRIC_FONT,
} as const

const rootRef = ref<HTMLDivElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const scrollRef = ref<HTMLDivElement | null>(null)
const noteElements = ref<Element[]>([])
const lyricElements = ref<Element[]>([])

/* A note that straddles a 6/8 beat is engraved as several tied noteheads, so the
 * flat `.abcjs-note` list is longer than melody.notes. This buckets the flat list
 * into one entry per melody note (each holding that note's piece(s) in reading
 * order), keeping every melody-index lookup aligned. Rebuilt on each render. */
const noteGroups = ref<Element[][]>([])

/* The leading notehead for a melody note — its position/pitch anchor. */
function noteHeadFor(index: number): Element | undefined {
  return noteGroups.value[index]?.[0]
}

/* Paint every rendered piece of a melody note active (a tied, beat-split note has
 * more than one notehead, so highlighting only the first would leave its tail
 * uncolored). */
function paintNoteActive(index: number) {
  for (const element of noteGroups.value[index] ?? []) {
    element.classList.add('note-active')
  }
}

/* Nudge applied to every floating tone label so it sits slightly inset from and
 * above the note it annotates. TONE_LABEL_STACK_LIFT raises the singer's live
 * note one row higher than the target label it stacks on top of. */
const TONE_LABEL_OFFSET_X = 5 // px — inset from the note's left edge
const TONE_LABEL_OFFSET_Y = -6 // px — lift above the note
const TONE_LABEL_STACK_LIFT = -18 // px — extra lift for the stacked live-note row

/* Absolute-positioning style for a tone label at the given content-space position.
 * Pass an extra vertical lift to stack one label above another. */
function toneLabelStyle(
  position: { left: number; top: number },
  stackLift = 0,
) {
  return {
    left: `${position.left + TONE_LABEL_OFFSET_X}px`,
    top: `${position.top + TONE_LABEL_OFFSET_Y + stackLift}px`,
  }
}

/* Pixel offset of the floating tone label within the scrolling content, centered
 * above the active note; null hides it. Lives in content coordinates so it scrolls
 * with the staff for free. */
const toneLabelPosition = ref<{ left: number; top: number } | null>(null)

/* Left/width (in scrolling-content coordinates) of the translucent box behind the
 * active note's bar; null hides it. Container-relative like toneLabelPosition, so
 * it scrolls horizontally with the staff for free. */
const activeBarPosition = ref<{ left: number; width: number } | null>(null)

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

/* Muted note-name chips above every note, shown when `showToneLabels` is on. Each
 * entry pairs a container-relative position with that note's sounding pitch (start
 * tone transposes the melody). Measured on every render; the template gates display
 * so toggling needs no re-render. */
const allToneLabels = ref<{ left: number; top: number; text: string }[]>([])

/* Tone-name chips to render: all of them when the toggle is on, otherwise just
 * the first note's — the start-tone cue is always visible so the singer knows
 * what note to begin on. */
const visibleToneLabels = computed(() =>
  props.showToneLabels ? allToneLabels.value : allToneLabels.value.slice(0, 1),
)

function updateAllToneLabels() {
  if (!containerRef.value) {
    allToneLabels.value = []

    return
  }

  const containerRect = containerRef.value.getBoundingClientRect()
  allToneLabels.value = noteGroups.value.flatMap((group, index) => {
    const note = props.melody.notes[index]
    const element = group[0]
    if (!note || !element) return []

    const noteRect = element.getBoundingClientRect()
    return [
      {
        left: noteRect.left - containerRect.left + noteRect.width / 2,
        top: noteRect.top - containerRect.top,
        text: midiToNoteLabel(props.startToneMidi + note.midiOffset).label,
      },
    ]
  })
}

function updateToneLabelPosition(index: number | null) {
  if (index === null || !containerRef.value) {
    toneLabelPosition.value = null

    return
  }

  const element = noteHeadFor(index)
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

  const element = noteHeadFor(index)
  if (!element) {
    activeBarPosition.value = null

    return
  }

  const container = containerRef.value
  const containerLeft = container.getBoundingClientRect().left
  const centerX = (rect: DOMRect) => rect.left - containerLeft + rect.width / 2

  /* Sample the notehead glyph (not the stem/beam group bbox), matching
   * calibratePitchToY, so the x falls cleanly inside the note's measure. */
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

/* Paint the given notes green (result-state correctness feedback) and clear any
 * previous green. Reuses the per-index notehead access the active-highlight uses. */
function applyCorrectNotes(indices: number[] | undefined) {
  for (const element of noteElements.value) {
    element.classList.remove('note-correct')
  }

  if (!indices) return

  for (const index of indices) {
    for (const element of noteGroups.value[index] ?? []) {
      element.classList.add('note-correct')
    }
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
  noteGroups.value.forEach((group, index) => {
    const note = props.melody.notes[index]
    const element = group[0]
    if (!note || !element) return

    /* The .abcjs-note group bbox spans the stem + beam, so its center drifts off
     * the notehead by a pitch- and note-type-dependent amount (a beamed eighth
     * vs a dotted quarter of the same pitch land at different Ys), which skews
     * the MIDI→Y fit and throws the pitch line off — badly once extrapolated an
     * octave beyond the melody's range. Sample the notehead glyph itself (abcjs
     * tags it) for the true staff position; fall back to the group if absent. */
    const head = element.querySelector('.abcjs-notehead') ?? element
    const rect = head.getBoundingClientRect()
    samples.push({
      midi: props.startToneMidi + note.midiOffset,
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
  noteGroups.value = groupNoteHeads(noteElements.value, props.melody)
  /* One `.abcjs-lyric` element per lyric'd note, in reading order, so the index
   * matches the flat syllable index used by activeSyllableIndex. */
  lyricElements.value = [
    ...(containerRef.value?.querySelectorAll('.abcjs-lyric') ?? []),
  ]

  /* A re-render (resize / tab reveal) rebuilds the elements, so re-apply any
   * active highlight the watchers set before this render replaced the SVG. */
  const noteIndex = props.activeNoteIndex
  if (noteIndex !== null) paintNoteActive(noteIndex)

  applyCorrectNotes(props.correctNoteIndices)

  updateToneLabelPosition(noteIndex)
  updateActiveBar(noteIndex)
  updateAllToneLabels()
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
      updateActiveBar(null)

      /* Song ended naturally → leave the scroll at the end. Stop/restart clears
       * the highlight with isDone false, so it still snaps back to the start. */
      if (!props.isDone && scrollRef.value) scrollRef.value.scrollLeft = 0

      return
    }

    const element = noteHeadFor(index)
    if (!element) return

    paintNoteActive(index)
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

watch(
  () => props.correctNoteIndices,
  (indices) => {
    applyCorrectNotes(indices)
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
        <ActiveBarHighlight
          :position="activeBarPosition"
          :show="showBarHighlight !== false"
        />
        <div ref="containerRef" class="relative z-10 py-0.5" />

        <!--
          Muted note-name label above each note. With the toggle on, every note;
          with it off, only the first (the start-tone cue, always visible so the
          singer knows what note to begin on). The green active chip below renders
          later in the DOM with an opaque bg, so it cleanly overlays the matching
          muted label during playback.
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
      position tracks the singer's pitch. Solid green when on the target note,
      orange dashed otherwise (matching the DoReMi / PitchDetector preview line).
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
      Note-name label riding the orange preview line: centered horizontally on the
      line, vertically centered on it so it tracks the singer's pitch. Color matches
      the line it rides — green on-pitch, else orange.
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

/* Result-state correctness feedback — noteheads the singer got right. */
:deep(.note-correct path),
:deep(.note-correct rect) {
  fill: var(--p-green-400);
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
