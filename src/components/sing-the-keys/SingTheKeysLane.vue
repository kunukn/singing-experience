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
}

const props = defineProps<Props>()

type NoteStatus = 'upcoming' | 'active' | 'correct' | 'missed'

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
  if (note.startMs + note.durationMs <= props.elapsedMs) return 'missed'

  return 'upcoming'
}

const STATUS_CLASS: Record<NoteStatus, string> = {
  upcoming: 'bg-(--p-primary-color)/70 text-(--p-primary-contrast-color)',
  active: 'bg-(--p-primary-color) text-(--p-primary-contrast-color)',
  correct: 'bg-(--p-green-400) text-(--p-surface-900)',
  missed: 'bg-(--p-surface-400)/60 text-(--p-surface-900)',
}

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
  <!-- LTR like the keyboard under it: pitch runs low→high left→right on a
       piano whatever the page direction. -->
  <div
    class="relative mx-auto overflow-hidden rounded-t-md bg-(--p-surface-100) dark:bg-(--p-surface-900)"
    :style="{ width: `${layout.totalWidth}px`, height: `${laneHeight}px` }"
    dir="ltr"
    data-testid="sing-the-keys-lane"
  >
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
      class="pointer-events-none absolute inset-y-0 z-10 w-0 -translate-x-[1.5px] border-l-3 border-dashed border-(--p-orange-400)/50"
      :style="{ insetInlineStart: `${sungLine.x}px` }"
      data-testid="sing-the-keys-sung-line"
    />

    <!-- Hit line: the top of the keys. A block lands here when its note is due. -->
    <div
      class="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-0.5 bg-(--p-orange-400)"
      aria-hidden="true"
    />
  </div>
</template>
