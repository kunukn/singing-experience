<script setup lang="ts">
import {
  buildPitchToY,
  type PitchSample,
} from '@/components/grace-kelly/graceKellySingPitch'
import {
  measureMusicWidth,
  STAFF_LABEL_FONT,
} from '@/components/grace-kelly/graceKellyStaffRender'
import {
  formatNoteLabelWithCents,
  midiToFlatLabel,
  midiToNoteLabel,
} from '@/utils/noteUtils'
import { useDebounceFn, useResizeObserver } from '@vueuse/core'
import { renderAbc } from 'abcjs'
import {
  estimateNotesStaffWidth,
  noteScalesToTwoVoiceAbcString,
} from './notesAbc'

type Props = {
  /* Absolute MIDI notes for the treble (V:1) staff, left to right. */
  trebleMidis: number[]
  /* Absolute MIDI notes for the bass (V:2) staff, left to right. */
  bassMidis: number[]
  bpm: number
  /* When true, draws a muted note-name label above every note on both staves. */
  showToneLabels?: boolean
  /* When true, note-name labels include the octave digit ("C4" vs "C"). */
  showNoteNumbers?: boolean
  /* Singer's de-flickered live note label, drawn as a chip riding the pitch
   * line. */
  sungToneLabel?: string | null
  /* Signed cents between the live pitch and sungToneLabel's semitone; appended
   * to the chip (e.g. "C3 -35¢") once audibly off. */
  sungToneCents?: number | null
  /* Continuous MIDI of the singer's live pitch (raw, not rounded); null when
   * silent. Drives the vertical position of the pitch line. */
  sungMidi?: number | null
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
  top: number
  text: string
  flatText: string | null
}

/* Top space (px) reserved inside the SVG above the highest notehead so the
 * note-name chips (sharp label ~28px up, plus the flat-enharmonic row another
 * ~13px above) aren't clipped by the scroll box (overflow-x:auto clips y too). */
const STAFF_PADDING_TOP = 44

/* Vertical nudge lifting every floating tone label just above the note it
 * annotates; the flat enharmonic stacks one compact row higher. The label is
 * centered horizontally on the notehead by `-translate-x-1/2`, so no horizontal
 * offset is needed. */
const TONE_LABEL_OFFSET_Y = -6 // px — lift above the note
const FLAT_LABEL_STACK_LIFT = -13 // px — one compact row above the sharp label

/* Absolute-positioning style for a tone label, with an optional extra vertical
 * lift to stack the flat enharmonic above the sharp label. */
function toneLabelStyle(label: ToneLabel, stackLift = 0) {
  return {
    left: `${label.left}px`,
    top: `${label.top + TONE_LABEL_OFFSET_Y + stackLift}px`,
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
  format: SANS_FONTS,
} as const

/* Tone-name chips to render: all when the toggle is on, none when it's off. */
const visibleToneLabelsByStaff = computed(() =>
  props.showToneLabels ? toneLabelsByStaff.value : [[], []],
)

const rootRef = ref<HTMLDivElement | null>(null)

/* Linear MIDI→Y mapping calibrated from the rendered noteheads of BOTH staves,
 * so the preview pitch line tracks correctly whether the singer is in treble or
 * bass range. Rebuilt on every render. Y is measured in rootRef coordinates so
 * the pitch line stays correct regardless of horizontal scroll. */
const pitchToY = shallowRef<(midi: number) => number>(() => 0)
const staffHeight = ref(0)

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

/* Vertical position of the live pitch line in rootRef coords, clamped to the
 * staff; null hides the line (no clean pitch detected). */
const pitchLineTop = computed(() => {
  if (props.sungMidi === null || props.sungMidi === undefined) return null

  const raw = pitchToY.value(props.sungMidi)
  const EDGE_MARGIN = 2 // px — keep the 2px line fully visible at the edges
  return Math.max(EDGE_MARGIN, Math.min(staffHeight.value - EDGE_MARGIN, raw))
})

/* Measure each note's position per staff. Voice 0 (treble) and voice 1 (bass)
 * notes carry abcjs's `abcjs-v0`/`abcjs-v1` classes, so a single combined SVG
 * splits cleanly into the two staves; index i maps to that staff's midis[i]. */
function updateToneLabels() {
  if (!containerRef.value) {
    toneLabelsByStaff.value = [[], []]

    return
  }

  const containerRect = containerRef.value.getBoundingClientRect()
  const staffMidis = [props.trebleMidis, props.bassMidis]
  toneLabelsByStaff.value = staffMidis.map((midis, voiceIndex) => {
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
          text: midiToNoteLabel(midi, {
            showOctave: props.showNoteNumbers ?? false,
          }).label,
          flatText: midiToFlatLabel(midi),
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

/* Collect notehead positions from both voices and build a single MIDI→Y mapping
 * spanning both staves. The two-voice abcjs system tags notes `abcjs-v0` (treble)
 * and `abcjs-v1` (bass); both staves' noteheads are sampled so the regression
 * covers the full pitch range. */
function calibratePitchToY() {
  if (!rootRef.value || !containerRef.value) return

  const rootRect = rootRef.value.getBoundingClientRect()
  staffHeight.value = rootRef.value.clientHeight

  const staffMidis = [props.trebleMidis, props.bassMidis]
  const samples: PitchSample[] = []

  staffMidis.forEach((midis, voiceIndex) => {
    const notes = [
      ...(containerRef.value?.querySelectorAll(
        `.abcjs-note.abcjs-v${voiceIndex}`,
      ) ?? []),
    ]
    notes.forEach((element, index) => {
      const midi = midis[index]
      if (midi === undefined) return

      const head = element.querySelector('.abcjs-notehead') ?? element
      const rect = head.getBoundingClientRect()
      samples.push({
        midi,
        y: rect.top - rootRect.top + rect.height / 2,
      })
    })
  })

  pitchToY.value = buildPitchToY(samples)
}

async function renderSheet() {
  if (!containerRef.value) return

  /* Skip while hidden (display:none → offsetParent null); abcjs would render at
   * the probe width and, with every rect width 0, skip the shrink pass below. The
   * resize observer re-renders on reveal once a real width is measurable. */
  if (containerRef.value.offsetParent === null) return

  const abcString = noteScalesToTwoVoiceAbcString(
    props.trebleMidis,
    props.bassMidis,
    props.bpm,
    false,
  )

  /* Pass 1 — oversized width so abcjs keeps the system on one line. Probe against
   * the wider staff so neither voice wraps. */
  const probeWidth = estimateNotesStaffWidth(
    Math.max(props.trebleMidis.length, props.bassMidis.length),
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
  calibratePitchToY()

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
  () => [props.trebleMidis, props.bassMidis, props.bpm],
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
  <div ref="rootRef" class="relative mx-auto w-fit max-w-full">
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
            class="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded bg-(--p-content-background) px-0.5 text-xs leading-none font-semibold text-(--p-text-muted-color) tabular-nums"
            :style="toneLabelStyle(label)"
          >
            {{ label.text }}
          </span>
          <span
            v-for="(label, index) in labels"
            v-show="label.flatText"
            :key="`${staffIndex}-flat-${index}`"
            class="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded bg-(--p-content-background) px-0.5 text-[12px] leading-none font-semibold text-(--p-text-muted-color)/70 tabular-nums"
            :style="toneLabelStyle(label, FLAT_LABEL_STACK_LIFT)"
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

    <!--
    Live preview pitch line — pinned to the root (not the scroll box) so
    horizontal auto-scroll of the staff never shifts it sideways; only its
    vertical position tracks the singer's pitch. Orange dashed, matching the
    NotesSheet preview line.
    -->
    <div
      v-if="pitchLineTop !== null"
      class="pointer-events-none absolute inset-x-2 h-0 border-t-3 border-dashed border-(--p-orange-400)/50"
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
        class="rounded bg-(--p-content-background) px-0.5 text-xs leading-none font-semibold text-(--p-orange-400) tabular-nums"
      >
        {{ sungToneText }}
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
