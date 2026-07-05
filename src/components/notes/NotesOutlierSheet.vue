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
  /* When true, note-name labels include the octave digit ("C4" vs "C"). */
  showNoteNumbers?: boolean
  /* Shared floor (px) for the bordered card so sibling sheets align in width;
   * the card never shrinks below this even when its own music is narrower. */
  minCardWidth?: number
}

const props = defineProps<Props>()

/* Natural width (px) of the rendered abcjs SVG, so the parent can take the max
 * across sibling sheets and feed it back via `minCardWidth`. */
const emit = defineEmits<{ naturalWidth: [width: number] }>()

type ToneLabel = {
  left: number
  /* Notehead top edge (container coords) — anchor for above-placed labels. */
  top: number
  /* Notehead bottom edge (container coords) — anchor for below-placed labels. */
  bottom: number
  text: string
  flatText: string | null
  /* Low-cluster note (below the staff): label hangs BELOW the notehead instead of
   * above, so it clears the ledger lines the note sits on. */
  below: boolean
}

/* Space (px) reserved inside the SVG above the highest notehead (for high-cluster
 * above-labels) and below the lowest notehead (for low-cluster below-labels) so the
 * note-name chips aren't clipped by the scroll box (overflow-x:auto clips y too).
 * Each chip is a sharp label plus, when accidentals show, a flat-enharmonic row. */
const STAFF_PADDING_TOP = 44
const STAFF_PADDING_BOTTOM = 44

/* Gap between a tone label and the notehead it annotates, and the extra step that
 * stacks the flat enharmonic one compact row further from the note. Applied above or
 * below per label; the label is centered horizontally by `-translate-x-1/2`, so no
 * horizontal offset is needed. */
const TONE_LABEL_GAP = 6 // px — space between label and notehead
const FLAT_LABEL_STACK_STEP = 13 // px — one compact row between sharp and flat labels

/* Absolute-positioning style for a tone label. `stackLevel` 0 is the primary (sharp)
 * label, 1 the flat enharmonic; higher levels sit one row further from the notehead.
 * Below-cluster labels hang under the notehead's bottom edge (paired with dropping
 * the `-translate-y-full` class); above labels sit over its top edge. */
function toneLabelStyle(label: ToneLabel, stackLevel = 0) {
  const gap = TONE_LABEL_GAP + stackLevel * FLAT_LABEL_STACK_STEP

  return {
    left: `${label.left}px`,
    top: `${label.below ? label.bottom + gap : label.top - gap}px`,
  }
}

const { t } = useI18n()

const containerRef = ref<HTMLDivElement | null>(null)
const scrollRef = ref<HTMLDivElement | null>(null)

/* Muted note-name chips above every note, per staff (treble then bass). Built on
 * every render; the template gates display so toggling needs no re-render. */
const toneLabelsByStaff = ref<ToneLabel[][]>([[], []])

/* Clef-label positions, voice-indexed (0 = treble clef, 1 = bass clef); null
 * when that clef isn't in the rendered SVG. The label text is resolved in the
 * template so a locale switch updates it without re-measuring. */
const clefLabels = ref<({ left: number; top: number } | null)[]>([null, null])

/* Small extra lift so the label clears the top of the clef glyph it sits above
 * (acts like a 4px gap below the text). */
const CLEF_LABEL_LIFT = -8 // px

const SANS_FONTS = { composerfont: STAFF_LABEL_FONT } as const

const RENDER_OPTIONS = {
  add_classes: true,
  paddingtop: STAFF_PADDING_TOP,
  paddingbottom: STAFF_PADDING_BOTTOM,
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
  /* Low-cluster note count per voice; `.abcjs-note` order is [...low, ...high], so
   * indices below this belong to the below-the-staff cluster and hang their labels
   * beneath the notehead. */
  const lowLengths = [props.trebleLowMidis.length, props.bassLowMidis.length]
  toneLabelsByStaff.value = staffMidis.value.map((midis, voiceIndex) => {
    const lowLen = lowLengths[voiceIndex]
    const notes = [
      ...(containerRef.value?.querySelectorAll(
        `.abcjs-note.abcjs-v${voiceIndex}`,
      ) ?? []),
    ]
    return notes.flatMap((element, index) => {
      const midi = midis[index]
      if (midi === undefined) return []

      /* Anchor on the notehead glyph, not the `.abcjs-note` group — the group
       * bbox includes accidental glyphs left of the head, which would pull the
       * centered label off to one side. */
      const head = element.querySelector('.abcjs-notehead') ?? element
      const noteRect = head.getBoundingClientRect()
      return [
        {
          left: noteRect.left - containerRect.left + noteRect.width / 2,
          top: noteRect.top - containerRect.top,
          bottom: noteRect.bottom - containerRect.top,
          text: midiToNoteLabel(midi, {
            showOctave: props.showNoteNumbers ?? false,
          }).label,
          flatText: midiToFlatLabel(midi),
          below: index < lowLen,
        },
      ]
    })
  })
}

/* Locate each voice's clef group (abcjs tags it `abcjs-clef abcjs-v{voice}`) and
 * record its center-x / top in container coords so a label can be overlaid above
 * it, mirroring the tone-label measurement. */
function updateClefLabels() {
  if (!containerRef.value) {
    clefLabels.value = [null, null]

    return
  }

  const containerRect = containerRef.value.getBoundingClientRect()
  clefLabels.value = [0, 1].map((voiceIndex) => {
    const clef = containerRef.value?.querySelector(
      `.abcjs-clef.abcjs-v${voiceIndex}`,
    )
    if (!clef) return null

    const rect = clef.getBoundingClientRect()
    /* Left edge (not center) — the treble clef sits near the staff start, so a
     * centered label would overflow and clip at the scroll box's left edge. */
    return {
      left: rect.left - containerRect.left,
      top: rect.top - containerRect.top,
    }
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
  updateClefLabels()

  /* Report the card's natural border-box width: the SVG's baked intrinsic width
   * plus the wrapper's horizontal borders (border-box `min-width` includes the
   * border). Both inputs are independent of any applied `minCardWidth`, so there's
   * no feedback loop and the card can shrink back when content narrows. */
  const svg = containerRef.value.querySelector('svg')
  if (svg && scrollRef.value) {
    const styles = getComputedStyle(scrollRef.value)
    const borderX =
      parseFloat(styles.borderInlineStartWidth) +
      parseFloat(styles.borderInlineEndWidth)
    emit('naturalWidth', Math.ceil(svg.getBoundingClientRect().width + borderX))
  }
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

/* Octave toggle only changes label text, not note geometry — refresh the chips
 * in place instead of re-rendering the SVG. */
watch(() => props.showNoteNumbers, updateToneLabels)
</script>

<template>
  <!--
    `min(…px, 100%)` clamps the shared width floor to the container: on wide
    viewports it equals the sibling-matched width so the cards align; on viewports
    narrower than that it collapses to 100%, so the card stays within the viewport
    and scrolls internally (overflow-x-auto) instead of overflowing the page.
  -->
  <div
    ref="scrollRef"
    class="mx-auto w-fit max-w-full overflow-x-auto rounded border border-(--p-content-border-color)"
    :style="
      minCardWidth ? { minWidth: `min(${minCardWidth}px, 100%)` } : undefined
    "
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
          class="pointer-events-none absolute z-20 -translate-x-1/2 rounded bg-(--p-content-background) px-0.5 text-xs leading-none font-semibold text-(--p-text-muted-color) tabular-nums"
          :class="label.below ? '' : '-translate-y-full'"
          :style="toneLabelStyle(label)"
        >
          {{ label.text }}
        </span>
        <span
          v-for="(label, index) in labels"
          v-show="label.flatText"
          :key="`${staffIndex}-flat-${index}`"
          class="pointer-events-none absolute z-20 -translate-x-1/2 rounded bg-(--p-content-background) px-0.5 text-[12px] leading-none font-semibold text-(--p-text-muted-color)/70 tabular-nums"
          :class="label.below ? '' : '-translate-y-full'"
          :style="toneLabelStyle(label, 1)"
        >
          {{ label.flatText }}
        </span>
      </template>

      <!--
        Clef name above each clef glyph (treble on top staff, bass below),
        replacing the standalone labels that used to sit above the whole sheet.
      -->
      <span
        v-for="(position, voiceIndex) in clefLabels"
        v-show="position"
        :key="`clef-${voiceIndex}`"
        class="pointer-events-none absolute z-20 -translate-y-full rounded bg-(--p-content-background) px-0.5 text-xs leading-none font-normal text-(--p-text-muted-color)"
        :style="{
          left: `${position?.left ?? 0}px`,
          top: `${(position?.top ?? 0) + CLEF_LABEL_LIFT}px`,
        }"
      >
        {{
          t(
            voiceIndex === 0
              ? 'notes.clefLabels.treble'
              : 'notes.clefLabels.bass',
          )
        }}
      </span>
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
