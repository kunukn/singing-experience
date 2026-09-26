<script setup lang="ts">
import type { AccidentalStyle } from '@/composables/accidentalStyle'
import {
  BLACK_KEY_WIDTH_RATIO,
  type PianoLayout,
} from '@/components/piano/pianoLayout'
import { pianoPitchXForMidi } from '@/components/piano/pianoLayout'
import { buildPianoPreviewLine } from '@/components/piano/pianoPreview'
import { midiToNoteLabel } from '@/utils/noteUtils'
import { isNaturalMidi } from '@/components/notes/notesScales'
import { LOOKAHEAD_MS, type TimelineNote } from './singTheKeysTimeline'

/*
 * The falling-note lane above the keyboard. Every block is laid out once, in
 * the coordinates of a strip that is LOOKAHEAD_MS tall per lane height, and
 * the whole strip translates down as time passes — one transform per frame,
 * no per-note re-render. A block's bottom edge crosses the hit line (the lane
 * bottom, the top of the keys) exactly when its note starts.
 */
type Props = {
  notes: TimelineNote[]
  layout: PianoLayout
  laneHeight: number
  /* Ms since the first note started; negative during the lead-in. */
  elapsedMs: number
  activeNoteIndex: number | null
  correctNoteIndices: number[]
  accidentalStyle: AccidentalStyle
  /* The singer's live pitch, drawn as a line up through the lane so they can
   * aim at the incoming block. Null while nothing clean is detected. */
  sungMidi: number | null
  sungFrequency: number | null
  /* False in practice mode (melody guide on): passed blocks go neutral rather
   * than red, since nothing was being judged. */
  isScored: boolean
}

const props = defineProps<Props>()

type NoteStatus = 'upcoming' | 'active' | 'correct' | 'missed' | 'passed'

const pxPerMs = computed(() => props.laneHeight / LOOKAHEAD_MS)

/* Fraction of a semitone unit a natural's block spans. Wider than the 1.24
 * black-key block so the two read as white vs black key, like the tutorial
 * videos this game borrows from. Naturals are asymmetric around pitchX on
 * C/E/F/B, so the block is centred on the pitch, not the key face. */
const NATURAL_BLOCK_UNITS = 1.4
const ACCIDENTAL_BLOCK_UNITS = 2 * BLACK_KEY_WIDTH_RATIO

/* px — gap between consecutive blocks of the same pitch so repeated notes read
 * as separate hits rather than one long bar. */
const BLOCK_GAP_PX = 2

const correctSet = computed(() => new Set(props.correctNoteIndices))

function statusOf(note: TimelineNote): NoteStatus {
  if (correctSet.value.has(note.index)) return 'correct'
  if (note.index === props.activeNoteIndex) return 'active'
  if (note.startMs + note.durationMs <= props.elapsedMs)
    return props.isScored ? 'missed' : 'passed'

  return 'upcoming'
}

/* Hues that stay apart whatever the theme's primary colour is (green in this
 * app, which made "upcoming" and "hit" look alike): blue until the note is
 * decided, then green (hit) or red (passed unsung). A due block keeps the blue
 * on purpose — a third colour there read as "wrong, then right" on every note,
 * when the singer has simply not locked on yet. The key wash and hit line show
 * what is due. Passed blocks in practice mode go neutral: nothing was judged. */
const STATUS_CLASS: Record<NoteStatus, string> = {
  upcoming: 'bg-(--p-blue-400) text-(--p-surface-0)',
  active: 'bg-(--p-blue-400) text-(--p-surface-0)',
  correct: 'bg-(--p-green-400) text-(--p-surface-900)',
  missed: 'bg-(--p-red-400) text-(--p-surface-0)',
  passed: 'bg-(--p-surface-400)/60 text-(--p-surface-0)',
}

/* px — how far a block keeps falling past the hit line before it is clipped,
 * over the key track's label band and the tops of the keys, like the tutorial
 * videos where the block runs on into the key. This is where a miss becomes
 * visible: a note can be hit right up to its end, so it only turns red once its
 * whole block is already below the line. At the lane's px/ms this is roughly
 * half a second to a second on screen. */
const HIT_LINE_TAIL_PX = 64

const blocks = computed(() =>
  props.notes.map((note) => {
    const isNatural = isNaturalMidi(note.midi)
    const width =
      props.layout.unit *
      (isNatural ? NATURAL_BLOCK_UNITS : ACCIDENTAL_BLOCK_UNITS)
    const height = Math.max(
      BLOCK_GAP_PX,
      note.durationMs * pxPerMs.value - BLOCK_GAP_PX,
    )

    return {
      note,
      label: midiToNoteLabel(note.midi, {
        showOctave: false,
        preferFlats: props.accidentalStyle === 'flat',
      }).label,
      isNatural,
      style: {
        insetInlineStart: `${pianoPitchXForMidi(props.layout, note.midi) - width / 2}px`,
        /* Strip coordinates: y = 0 is the hit line at elapsedMs 0, so a note
         * that starts later sits higher up (negative top), and the strip is
         * translated down by elapsedMs × pxPerMs. */
        top: `${props.laneHeight - (note.startMs + note.durationMs) * pxPerMs.value}px`,
        width: `${width}px`,
        height: `${height}px`,
      },
    }
  }),
)

const stripStyle = computed(() => ({
  transform: `translateY(${props.elapsedMs * pxPerMs.value}px)`,
}))

/* Reuses the keyboard's own line mapping so the lane's line and the key
 * track's line meet at the same x, edge pinning included. */
const sungLine = computed(() => {
  if (props.sungMidi === null) return null

  return buildPianoPreviewLine({
    previewMidi: Math.round(props.sungMidi),
    previewFrequency: props.sungFrequency,
    previewNoteLabel: '',
    layout: props.layout,
  })
})
</script>

<template>
  <!-- Clipping box, TAIL px taller than the lane and pulled over the key track
       by the same amount with a negative margin. overflow-hidden keeps the
       blocks parked above and below from adding scrollable overflow to the
       piano's scroll box (a clip-path would clip the paint but the scroll box
       would still grow a scrollbar as the strip travels). z-10 paints the tail
       over the keys, which come later in the DOM; pointer-events-none keeps
       the key tops under it clickable.
       LTR like the keyboard under it: pitch runs low→high left→right on a
       piano whatever the page direction. -->
  <div
    class="pointer-events-none relative z-10 mx-auto overflow-hidden"
    :style="{
      width: `${layout.totalWidth}px`,
      height: `${laneHeight + HIT_LINE_TAIL_PX}px`,
      marginBottom: `-${HIT_LINE_TAIL_PX}px`,
    }"
    dir="ltr"
    data-testid="sing-the-keys-lane"
  >
    <!-- The lane surface: only the part above the hit line is painted, so the
         tail stays see-through over the label band and keys. -->
    <div
      class="absolute inset-x-0 top-0 rounded-t-md bg-(--p-surface-100) dark:bg-(--p-surface-900)"
      :style="{ height: `${laneHeight}px` }"
      aria-hidden="true"
    />

    <div
      class="absolute inset-x-0 top-0 will-change-transform"
      :style="stripStyle"
    >
      <div
        v-for="block in blocks"
        :key="block.note.index"
        class="absolute flex items-end justify-center rounded-md pb-0.5 text-sm leading-none font-semibold select-none"
        :class="STATUS_CLASS[statusOf(block.note)]"
        :style="block.style"
        :data-testid="`lane-note-${block.note.index}`"
        :data-status="statusOf(block.note)"
        :data-midi="block.note.midi"
      >
        {{ block.label }}
      </div>
    </div>

    <!-- The singer's pitch, continued up from the key track's dashed line. -->
    <div
      v-if="sungLine"
      class="absolute top-0 z-10 w-0 -translate-x-[1.5px] border-l-3 border-dashed border-(--p-orange-400)/50"
      :style="{
        insetInlineStart: `${sungLine.x}px`,
        height: `${laneHeight}px`,
      }"
      data-testid="sing-the-keys-sung-line"
    />

    <!-- Hit line: the top of the keys. A block lands here when its note is due. -->
    <div
      class="absolute inset-x-0 z-20 h-0.5 bg-(--p-orange-400)"
      :style="{ top: `${laneHeight - 2}px` }"
      aria-hidden="true"
    />
  </div>
</template>
