<script setup lang="ts">
import type { AccidentalStyle } from '@/composables/accidentalStyle'
import {
  PIANO_LABEL_BAND_HEIGHT,
  pianoNoteBlockSpan,
  type PianoLayout,
} from '@/components/piano/pianoLayout'
import { buildPianoPreviewLine } from '@/components/piano/pianoPreview'
import { midiToNoteLabel } from '@/utils/noteUtils'
import {
  LOOKAHEAD_MS,
  type BeatFlash,
  type BeatLine,
  type TimelineNote,
} from './singTheKeysTimeline'
import SingTheKeysHitBeam from './SingTheKeysHitBeam.vue'
import SingTheKeysHitGlow from './SingTheKeysHitGlow.vue'
import { useLaneScroll } from './useLaneScroll'

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
  /* Cents-colour the sung line, matching the key track's line below it —
   * idle with Snap off. During a run green must keep meaning "hit". */
  shouldColorByCents?: boolean
  /* False in practice mode (melody guide on): passed blocks go neutral rather
   * than red, since nothing was being judged. */
  isScored: boolean
  /* The lane is parked on the song's ending after a natural finish: every note
   * has been sung, so an unhit one is missed even though it still sits above
   * the hit line. */
  isShowingEnding: boolean
  /* The ending glide has landed and the lane is at rest. */
  isEndingSettled: boolean
  /* Blocks sound their note when pressed. Off during a run: a moving block is
   * hard to hit, and its tone would reach the mic mid-song. */
  areBlocksPressable: boolean
  /* Pulse lines falling with the blocks; empty when beat lines are off. */
  beatLines: BeatLine[]
  /* Glow on the hit line as a beat line crosses it; null between beats and
   * while idle. */
  beatFlash: BeatFlash | null
  /* A run is under way: a block the lane has moved past was due and is judged.
   * Outside a run the lane is only being browsed, so nothing is. */
  isPlaying: boolean
  /* The singer is within scoring tolerance of the due note. Keeps the light of
   * a collected note on for as long as they hold it. */
  isOnPitch: boolean
  /* Light and sparks where a collected note meets the keys. Off, the lane
   * renders none of it: a hit only turns its block green. */
  isHitEffectsEnabled: boolean
  /* The singer can scroll through the song natively (touch, wheel, keys, plus
   * mouse drag) — while not playing, once any ending glide has landed. */
  isScrollable: boolean
  /* The furthest the lane scrolls: the view with the song's last note ending
   * at the lane's top. 0 when the whole song already fits. */
  scrollMaxMs: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  /* A block was tapped: sound its note as if its key had been. */
  blockPress: [midi: number]
  /* Scroll the lane to this ms position, already clamped to the song. */
  scrollTo: [ms: number]
}>()

const { t } = useI18n()

type NoteStatus = 'upcoming' | 'active' | 'correct' | 'missed' | 'passed'

const pxPerMs = computed(() => props.laneHeight / LOOKAHEAD_MS)

/* px — gap between consecutive blocks of the same pitch so repeated notes read
 * as separate hits rather than one long bar. */
const BLOCK_GAP_PX = 2

const correctSet = computed(() => new Set(props.correctNoteIndices))

function statusOf(note: TimelineNote): NoteStatus {
  if (correctSet.value.has(note.index)) return 'correct'
  if (note.index === props.activeNoteIndex) return 'active'
  if (
    props.isShowingEnding ||
    (props.isPlaying && note.startMs + note.durationMs <= props.elapsedMs)
  )
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

/* px — how far a block keeps falling past the hit line before it is clipped:
 * through the key track's label band, stopping where the keys begin so no
 * block ever covers a key. This is where a miss becomes visible: a note can be
 * hit right up to its end, so it only turns red once its whole block is
 * already below the line. */
const HIT_LINE_TAIL_PX = PIANO_LABEL_BAND_HEIGHT

/* Once the lane comes to rest on the ending, a block caught mid-tail would sit
 * in the label band for good; clip at the hit line instead. Not before: while
 * the lane still falls and glides back, the tail stays so no block is cut off
 * mid-move. */
const tailPx = computed(() => (props.isEndingSettled ? 0 : HIT_LINE_TAIL_PX))

const blocks = computed(() =>
  props.notes.map((note) => {
    /* Shared with the keyboard's target wash so block and key match. */
    const span = pianoNoteBlockSpan(props.layout, note.midi)
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
      style: {
        insetInlineStart: `${span.leftPx}px`,
        /* Strip coordinates: y = 0 is the hit line at elapsedMs 0, so a note
         * that starts later sits higher up (negative top), and the strip is
         * translated down by elapsedMs × pxPerMs. */
        top: `${props.laneHeight - (note.startMs + note.durationMs) * pxPerMs.value}px`,
        width: `${span.widthPx}px`,
        height: `${height}px`,
      },
    }
  }),
)

/* A pulse flashes softer than a bar start, so "1" still stands out. */
const PULSE_FLASH_OPACITY = 0.6

/* px — how far the beat glow rises above the hit line. */
const BEAT_FLASH_HEIGHT_PX = 12

const beatLineRows = computed(() =>
  props.beatLines.map((line) => ({
    line,
    top: `${props.laneHeight - line.ms * pxPerMs.value}px`,
  })),
)

const beatFlashOpacity = computed(() => {
  if (!props.beatFlash) return 0

  return props.beatFlash.isBarStart
    ? props.beatFlash.intensity
    : props.beatFlash.intensity * PULSE_FLASH_OPACITY
})

const stripStyle = computed(() => ({
  transform: `translateY(${props.elapsedMs * pxPerMs.value}px)`,
}))

/* The block that is lit from the hit line: the due note, once collected. Its
 * offset is what is left of the note above the line, since a block's top edge
 * reaches the hit line exactly when its note ends. */
const hitBeam = computed(() => {
  const noteIndex = props.activeNoteIndex
  if (!props.isHitEffectsEnabled || !props.isPlaying || noteIndex === null)
    return null

  if (!correctSet.value.has(noteIndex)) return null

  const note = props.notes.find((candidate) => candidate.index === noteIndex)
  if (!note) return null

  return {
    noteIndex,
    hitLineOffsetPx:
      (note.startMs + note.durationMs - props.elapsedMs) * pxPerMs.value,
  }
})

const laneRef = ref<HTMLElement | null>(null)
const scrollerRef = ref<HTMLElement | null>(null)

function clampScrollMs(ms: number) {
  return Math.min(props.scrollMaxMs, Math.max(0, ms))
}

/*
 * Native scrolling: while browsable, an invisible scroller covers the lane
 * and its scrollTop drives elapsedMs; the blocks still move by the strip
 * transform. The spacer puts the song's start at the bottom (scrollTop at its
 * max) and its end at the top, the way the song is laid out in the lane, so
 * scrolling up or dragging down moves ahead.
 */
const scrollSpacerHeightPx = computed(
  () => props.laneHeight + props.scrollMaxMs * pxPerMs.value,
)

function scrollTopFor(ms: number) {
  return (props.scrollMaxMs - ms) * pxPerMs.value
}

/* The position this lane last reported from its own scroll. An elapsedMs
 * matching it is our own echo and must not be written back: mid-fling that
 * write would land a frame late and stop the momentum. */
let lastScrolledMs: number | null = null

function handleScroll() {
  const element = scrollerRef.value
  if (!element) return

  /* Clamped: iOS's rubber band takes scrollTop past either end. */
  const ms = clampScrollMs(
    props.scrollMaxMs - element.scrollTop / pxPerMs.value,
  )
  lastScrolledMs = ms
  emit('scrollTo', ms)
}

/* Moves the scroller to match an elapsedMs set from outside — a settings
 * change, Stop, the ending settling — or a new song length or lane height,
 * and places it when it first appears. */
watch(
  [() => props.elapsedMs, () => props.scrollMaxMs, pxPerMs, scrollerRef],
  ([elapsedMs], [previousElapsedMs]) => {
    const element = scrollerRef.value
    if (!element) {
      lastScrolledMs = null

      return
    }

    const isOwnEcho =
      elapsedMs === lastScrolledMs && elapsedMs !== previousElapsedMs
    if (isOwnEcho) return

    element.scrollTop = scrollTopFor(elapsedMs)
  },
  { flush: 'post' },
)

/* A tap (no drag) on a block sounds it. On release rather than press, so a
 * drag that happens to start on a block scrolls without playing a note. While
 * browsable the scroller sits over the blocks, so the block is found under the
 * tap point rather than from the event target. */
function pressTappedBlock(event: PointerEvent) {
  if (!props.areBlocksPressable) return

  const block =
    (event.target as Element | null)?.closest('[data-midi]') ??
    document
      .elementsFromPoint(event.clientX, event.clientY)
      .find(
        (element) =>
          element.matches('[data-midi]') && laneRef.value?.contains(element),
      )
  if (!block) return

  emit('blockPress', Number(block.getAttribute('data-midi')))
}

useLaneScroll({
  target: laneRef,
  scroller: scrollerRef,
  onTap: pressTappedBlock,
})

/* Position bar on the lane's end edge. The song runs bottom to top in the
 * lane (later notes higher up), so the thumb starts at the bottom and climbs
 * to the top at the song's end. Its height is the share of the song on
 * screen. */
const scrollThumb = computed(() => {
  if (!props.isScrollable || props.scrollMaxMs <= 0) return null

  const heightPx =
    (props.laneHeight * LOOKAHEAD_MS) / (props.scrollMaxMs + LOOKAHEAD_MS)
  const progress = clampScrollMs(props.elapsedMs) / props.scrollMaxMs
  const topPx = (props.laneHeight - heightPx) * (1 - progress)

  return { heightPx, topPx, progress }
})

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

const { colorForCents } = usePitchPreviewColor()

/* Same rule as PianoDisplay's line: an edge-pinned line stays orange. Alpha
 * matches the /50 class it overrides. */
const sungLineColorStyle = computed(() => {
  const line = sungLine.value
  if (!props.shouldColorByCents || !line) return null
  if (line.isOutOfRange || line.cents === null) return null

  return { borderColor: colorForCents(line.cents, 0.5) }
})
</script>

<template>
  <!-- Clipping box, TAIL px taller than the lane and pulled over the key track
       by the same amount with a negative margin. overflow-hidden keeps the
       blocks parked above and below from adding scrollable overflow to the
       piano's scroll box (a clip-path would clip the paint but the scroll box
       would still grow a scrollbar as the strip travels). The key track
       makes no stacking context, so its layers compete with this box
       directly: z-[11] sits above the keys (black keys are z-10) and below
       the pitch ticks (z-15), live-pitch line (z-20) and chip (z-30).
       pointer-events-none keeps anything under it clickable; the blocks and
       the scroller opt back in, and their events bubble here for
       useLaneScroll.
       LTR like the keyboard under it: pitch runs low→high left→right on a
       piano whatever the page direction. -->
  <div
    ref="laneRef"
    class="pointer-events-none relative z-[11] mx-auto overflow-hidden select-none"
    :style="{
      width: `${layout.totalWidth}px`,
      height: `${laneHeight + tailPx}px`,
      marginBottom: `-${tailPx}px`,
    }"
    dir="ltr"
    data-testid="sing-the-keys-lane"
    :data-scrollable="isScrollable"
  >
    <!-- The lane surface: only the part above the hit line is painted, so the
         tail stays see-through over the label band and keys. -->
    <div
      class="absolute inset-x-0 top-0 rounded-t-md bg-(--p-surface-100) dark:bg-(--p-surface-900)"
      :style="{ height: `${laneHeight}px` }"
      aria-hidden="true"
    />

    <!-- Beat flash, rising off the hit line behind the blocks so the label of
         the note being sung stays readable, as each beat line crosses. -->
    <div
      class="absolute inset-x-0 bg-linear-to-t from-(--p-orange-400) to-transparent"
      :style="{
        top: `${laneHeight - BEAT_FLASH_HEIGHT_PX}px`,
        height: `${BEAT_FLASH_HEIGHT_PX}px`,
        opacity: beatFlashOpacity,
      }"
      data-testid="sing-the-keys-beat-flash"
      aria-hidden="true"
    />

    <!-- Beat lines, behind the blocks and clipped at the hit line: unlike the
         blocks they stop there rather than running on over the keys. -->
    <div
      v-if="beatLineRows.length > 0"
      class="absolute inset-x-0 top-0 overflow-hidden"
      :style="{ height: `${laneHeight}px` }"
      aria-hidden="true"
    >
      <div
        class="absolute inset-x-0 top-0 will-change-transform"
        :style="stripStyle"
      >
        <div
          v-for="row in beatLineRows"
          :key="row.line.ms"
          class="absolute inset-x-0"
          :class="
            row.line.isBarStart
              ? 'h-0.5 bg-(--p-surface-400) dark:bg-(--p-surface-600)'
              : 'h-px bg-(--p-surface-300) dark:bg-(--p-surface-700)'
          "
          :style="{ top: row.top }"
          data-testid="sing-the-keys-beat-line"
          :data-bar="row.line.isBarStart"
        />
      </div>
    </div>

    <div
      class="absolute inset-x-0 top-0 will-change-transform"
      :style="stripStyle"
    >
      <div
        v-for="block in blocks"
        :key="block.note.index"
        class="absolute flex items-end justify-center rounded-md pb-0.5 text-sm leading-none font-semibold select-none"
        :class="[
          STATUS_CLASS[statusOf(block.note)],
          areBlocksPressable &&
            'pointer-events-auto cursor-pointer touch-manipulation hover:brightness-110',
        ]"
        :style="block.style"
        :data-testid="`lane-note-${block.note.index}`"
        :data-status="statusOf(block.note)"
        :data-midi="block.note.midi"
      >
        {{ block.label }}
        <SingTheKeysHitBeam
          v-if="hitBeam?.noteIndex === block.note.index"
          :hitLineOffsetPx="hitBeam.hitLineOffsetPx"
          :isHeld="isOnPitch"
        />
      </div>
    </div>

    <!-- Native scroller while browsing (see scrollSpacerHeightPx): invisible,
         over the blocks so it takes the touches, under the position bar, sung
         line and hit line. overscroll-contain keeps a fling that hits either
         end of the song from carrying on into the page. The scrollbar is
         hidden: a classic one would narrow the lane off its keys, and the
         position bar stands in for it. -->
    <div
      v-if="isScrollable"
      ref="scrollerRef"
      class="pointer-events-auto absolute inset-x-0 top-0 cursor-grab touch-manipulation [scrollbar-width:none] overflow-y-auto overscroll-y-contain focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--p-primary-color) active:cursor-grabbing [&::-webkit-scrollbar]:hidden"
      :style="{ height: `${laneHeight}px` }"
      role="region"
      tabindex="0"
      :aria-label="t('singTheKeys.scrollSong')"
      data-testid="sing-the-keys-scroller"
      @scroll="handleScroll"
    >
      <div :style="{ height: `${scrollSpacerHeightPx}px` }" />
    </div>

    <!-- Song position while browsing (see scrollThumb). Above the blocks so an
         edge key's block can't hide it. -->
    <div
      v-if="scrollThumb"
      class="absolute end-1 z-10 w-1 rounded-full bg-(--p-surface-400)/70 dark:bg-(--p-surface-500)/70"
      :style="{
        top: `${scrollThumb.topPx}px`,
        height: `${scrollThumb.heightPx}px`,
      }"
      aria-hidden="true"
      data-testid="sing-the-keys-scroll-thumb"
      :data-progress="scrollThumb.progress.toFixed(2)"
    />

    <!-- The singer's pitch, continued up from the key track's dashed line. -->
    <div
      v-if="sungLine"
      class="absolute top-0 z-10 w-0 -translate-x-[1.5px] border-l-3 border-dashed border-(--p-orange-400)/50"
      :style="{
        insetInlineStart: `${sungLine.x}px`,
        height: `${laneHeight}px`,
        ...sungLineColorStyle,
      }"
      data-testid="sing-the-keys-sung-line"
    />

    <!-- Hit line: the top of the keys. A block lands here when its note is due. -->
    <div
      class="absolute inset-x-0 z-20 h-0.5 bg-(--p-orange-400)"
      :style="{ top: `${laneHeight - 2}px` }"
      aria-hidden="true"
    />

    <SingTheKeysHitGlow
      v-if="isHitEffectsEnabled"
      :notes="notes"
      :layout="layout"
      :laneHeight="laneHeight"
      :activeNoteIndex="activeNoteIndex"
      :correctNoteIndices="correctNoteIndices"
      :isPlaying="isPlaying"
      :isOnPitch="isOnPitch"
    />
  </div>
</template>
