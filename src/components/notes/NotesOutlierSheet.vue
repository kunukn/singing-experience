<script setup lang="ts">
import {
  measureMusicWidth,
  STAFF_LABEL_FONT,
} from '@/components/grace-kelly/graceKellyStaffRender'
import { midiToFlatLabel, midiToNoteLabel } from '@/utils/noteUtils'
import { useDebounceFn, useResizeObserver } from '@vueuse/core'
import { renderAbc } from 'abcjs'
import {
  estimateNotesStaffWidth,
  outlierScalesToTwoVoiceAbcString,
} from './notesAbc'

type Props = {
  /* Treble (V:1) outliers: low (lower-ledger) then high (upper-ledger) cluster. */
  trebleLowMidis: number[]
  trebleHighMidis: number[]
  /* Bass (V:2) outliers: low then high cluster. */
  bassLowMidis: number[]
  bassHighMidis: number[]
  /* When true, draws a muted note-name label above every note on both staves. */
  showToneLabels?: boolean
}

const props = defineProps<Props>()

type ToneLabel = {
  left: number
  top: number
  text: string
  flatText: string | null
}

/* Top space (px) reserved inside the SVG above the highest notehead so the
 * note-name chips (sharp label ~28px up, plus the flat-enharmonic row another
 * ~13px above) aren't clipped by the scroll box (overflow-x:auto clips y too). */
const STAFF_PADDING_TOP = 44

/* Nudge applied to every floating tone label so it sits slightly inset from and
 * above the note it annotates; the flat enharmonic stacks one compact row higher. */
const TONE_LABEL_OFFSET_X = 5 // px — inset from the note's left edge
const TONE_LABEL_OFFSET_Y = -6 // px — lift above the note
const FLAT_LABEL_STACK_LIFT = -13 // px — one compact row above the sharp label

/* Absolute-positioning style for a tone label, with an optional extra vertical
 * lift to stack the flat enharmonic above the sharp label. */
function toneLabelStyle(label: ToneLabel, stackLift = 0) {
  return {
    left: `${label.left + TONE_LABEL_OFFSET_X}px`,
    top: `${label.top + TONE_LABEL_OFFSET_Y + stackLift}px`,
  }
}

const containerRef = ref<HTMLDivElement | null>(null)
const scrollRef = ref<HTMLDivElement | null>(null)

/* Muted note-name chips above every note, per staff (treble then bass). Built on
 * every render; the template gates display so toggling needs no re-render. */
const toneLabelsByStaff = ref<ToneLabel[][]>([[], []])

const SANS_FONTS = { composerfont: STAFF_LABEL_FONT } as const

const RENDER_OPTIONS = {
  add_classes: true,
  paddingtop: STAFF_PADDING_TOP,
  format: SANS_FONTS,
} as const

/* Tone-name chips to render: all when the toggle is on, none when it's off. */
const visibleToneLabelsByStaff = computed(() =>
  props.showToneLabels ? toneLabelsByStaff.value : [[], []],
)

/* Each voice's noteheads in reading order, low cluster then high cluster, so
 * index i maps to that staff's i-th `.abcjs-note` element. */
const staffMidis = computed(() => [
  [...props.trebleLowMidis, ...props.trebleHighMidis],
  [...props.bassLowMidis, ...props.bassHighMidis],
])

/* Measure each note's position per staff. Voice 0 (treble) and voice 1 (bass)
 * notes carry abcjs's `abcjs-v0`/`abcjs-v1` classes, so a single combined SVG
 * splits cleanly into the two staves; index i maps to that staff's midis[i]. */
function updateToneLabels() {
  if (!containerRef.value) {
    toneLabelsByStaff.value = [[], []]

    return
  }

  const containerRect = containerRef.value.getBoundingClientRect()
  toneLabelsByStaff.value = staffMidis.value.map((midis, voiceIndex) => {
    const notes = [
      ...(containerRef.value?.querySelectorAll(
        `.abcjs-note.abcjs-v${voiceIndex}`,
      ) ?? []),
    ]
    return notes.flatMap((element, index) => {
      const midi = midis[index]
      if (midi === undefined) return []

      const noteRect = element.getBoundingClientRect()
      return [
        {
          left: noteRect.left - containerRect.left + noteRect.width / 2,
          top: noteRect.top - containerRect.top,
          text: midiToNoteLabel(midi).label,
          flatText: midiToFlatLabel(midi),
        },
      ]
    })
  })
}

async function renderSheet() {
  if (!containerRef.value) return

  /* Skip while hidden (display:none → offsetParent null); abcjs would render at
   * the probe width and, with every rect width 0, skip the shrink pass below. The
   * resize observer re-renders on reveal once a real width is measurable. */
  if (containerRef.value.offsetParent === null) return

  const abcString = outlierScalesToTwoVoiceAbcString(
    props.trebleLowMidis,
    props.trebleHighMidis,
    props.bassLowMidis,
    props.bassHighMidis,
  )

  /* Pass 1 — oversized width so abcjs keeps the system on one line. Probe against
   * the wider staff so neither voice wraps. */
  const probeWidth = estimateNotesStaffWidth(
    Math.max(staffMidis.value[0].length, staffMidis.value[1].length),
  )
  renderAbc(containerRef.value, abcString, {
    ...RENDER_OPTIONS,
    staffwidth: probeWidth,
  })

  /* Pass 2 — shrink to the music's natural width so the SVG hugs the notes. */
  await nextTick()
  const musicWidth = measureMusicWidth(containerRef.value)
  if (musicWidth > 0) {
    const TRAILING_MARGIN = 24
    renderAbc(containerRef.value, abcString, {
      ...RENDER_OPTIONS,
      staffwidth: Math.ceil(musicWidth) + TRAILING_MARGIN,
    })
    await nextTick()
  }

  updateToneLabels()
}

onMounted(() => {
  void renderSheet()
})

/* abcjs bakes a fixed pixel width into the SVG at render time. Re-render when the
 * available width changes — on resize and (critically) when first laid out with a
 * real width after the tab panel becomes visible. Observing the parent (not the
 * w-fit scroll box) avoids a content-driven feedback loop. */
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
  () => [
    props.trebleLowMidis,
    props.trebleHighMidis,
    props.bassLowMidis,
    props.bassHighMidis,
  ],
  () => {
    void renderSheet()
  },
  { deep: true },
)
</script>

<template>
  <div
    ref="scrollRef"
    class="mx-auto w-fit max-w-full overflow-x-auto rounded border border-(--p-content-border-color)"
  >
    <div class="relative min-w-max">
      <div ref="containerRef" class="relative z-10 py-0.5" />

      <!--
        Muted note-name label above each note on both staves, shown only when the
        toggle is on. The flat enharmonic (Db, Eb, …) stacks one compact row above
        the sharp label for accidental notes.
      -->
      <template
        v-for="(labels, staffIndex) in visibleToneLabelsByStaff"
        :key="staffIndex"
      >
        <span
          v-for="(label, index) in labels"
          :key="`${staffIndex}-${index}`"
          class="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded bg-(--p-content-background) px-0.5 text-xs leading-none font-semibold text-(--p-text-muted-color) tabular-nums"
          :style="toneLabelStyle(label)"
        >
          {{ label.text }}
        </span>
        <span
          v-for="(label, index) in labels"
          v-show="label.flatText"
          :key="`${staffIndex}-flat-${index}`"
          class="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded bg-(--p-content-background) px-0.5 text-[10px] leading-none font-semibold text-(--p-text-muted-color)/70 tabular-nums"
          :style="toneLabelStyle(label, FLAT_LABEL_STACK_LIFT)"
        >
          {{ label.flatText }}
        </span>
      </template>
    </div>
  </div>
</template>

<style scoped>
/* Reference/overview look: show only the filled notehead at its pitch position —
 * hide stems so the staff reads as clean position dots, not rhythmic notation.
 * Quarter notes carry no beams, so there's nothing else to suppress. */
:deep(.abcjs-stem) {
  display: none;
}

/* Dim the staff title to match the muted aesthetic; SVG text color is `fill`. */
:deep(.abcjs-title) {
  fill: var(--p-text-muted-color);
}
</style>
