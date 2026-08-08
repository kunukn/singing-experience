<script setup lang="ts">
import type { AccidentalStyle } from '@/composables/accidentalStyle'
import type { ToneLabelMode } from '@/composables/toneLabelMode'
import { midiToNoteLabel } from '@/utils/noteUtils'
import {
  DEFAULT_SCALE_HIGHLIGHT_MODE,
  buildScalePitchClasses,
  scaleRoleForMidi,
  type ScaleHighlightMode,
  type ScaleRole,
} from '@/utils/scaleHighlight'
import { useMediaQuery, useResizeObserver } from '@vueuse/core'
import PianoOctaveShift from './PianoOctaveShift.vue'
import { pianoKeyAltLabel, pianoKeyLabel } from './pianoLabels'
import {
  BLACK_KEY_HEIGHT_RATIO,
  MAX_SEMITONE_UNIT,
  MIN_SEMITONE_UNIT_POINTER,
  MIN_SEMITONE_UNIT_TOUCH,
  PIANO_DRAG_GUTTER_HEIGHT,
  PIANO_LABEL_BAND_HEIGHT,
  WHITE_KEY_HEIGHT,
  buildPianoLayout,
  pianoSpanUnits,
  type PianoKey,
} from './pianoLayout'
import { buildPianoPreviewLines, type PianoPreviewLaneId } from './pianoPreview'
import type { DuetLane } from '@/composables/useDuetPitchDetection'
import { usePianoKeyPlayback } from './usePianoKeyPlayback'
import { usePianoKeyboardInput } from './usePianoKeyboardInput'

type Props = {
  midiMin: number
  midiMax: number
  /* Live mic preview lanes (from PianoPage). One entry in single-voice mode,
   * two in duet mode. A lane with a null previewMidi draws nothing, so the
   * array length is stable while a singer is silent. */
  previewLanes?: Array<DuetLane & { laneId: PianoPreviewLaneId }>
  /* When true, draws the grey dead-center hint line on every key. */
  isPreviewEnabled?: boolean
  /* Note-name labels on the key face: 'off' (C-key octave markers only), 'simple'
   * (bare names, e.g. C♯), or 'advanced' (names with octave, e.g. C♯2). */
  toneLabelMode?: ToneLabelMode
  /* Which of the two spellings leads on a black key. Both stay on the key —
   * unlike the guitar, where a fret row only has height for one — so this picks
   * which one goes on top and carries the octave digit. */
  accidentalStyle?: AccidentalStyle
  /* Root pitch class (0–11) of the scale to tint, or null for no highlighting. */
  scaleRoot?: number | null
  scaleMode?: ScaleHighlightMode
}
const props = defineProps<Props>()

const accidentalStyle = computed<AccidentalStyle>(
  () => props.accidentalStyle ?? 'sharp',
)

function keyLabel(key: PianoKey): string | null {
  return pianoKeyLabel(
    key,
    props.toneLabelMode ?? 'off',
    { midiMin: props.midiMin, midiMax: props.midiMax },
    accidentalStyle.value,
  )
}

/* Null on every white key, so only the black keys get the second row. */
function keyAltLabel(key: PianoKey): string | null {
  return pianoKeyAltLabel(
    key,
    props.toneLabelMode ?? 'off',
    accidentalStyle.value,
  )
}

/* The screen-reader name has to match the label drawn on the key, or the two
 * disagree about what the note is called. White keys are naturals, so only the
 * black ones actually move. */
function keyAriaLabel(key: PianoKey): string {
  return midiToNoteLabel(key.midi, {
    showOctave: true,
    preferFlats: accidentalStyle.value === 'flat',
  }).label
}

/* Built once per scale change, not once per key — the keyboard can be 40+ keys. */
const scalePitchClasses = computed(() =>
  buildScalePitchClasses(
    props.scaleRoot ?? null,
    props.scaleMode ?? DEFAULT_SCALE_HIGHLIGHT_MODE,
  ),
)

function scaleRole(key: PianoKey): ScaleRole {
  return scaleRoleForMidi(
    key.midi,
    props.scaleRoot ?? null,
    scalePitchClasses.value,
  )
}

/*
 * Scale highlight, drawn as a coloured pill along the bottom of the key — the
 * felt strip on a real keyboard — rather than a wash over the whole key face.
 * A wash made runs of in-scale keys merge into one block: the key border is a
 * hairline in --p-content-border-color, which cannot survive between two flat
 * colour fields. The pill is inset from the key edges, so neighbouring pills
 * never touch and each one reads as belonging to its own key, and it leaves
 * the face free for the press glow.
 */
const SCALE_BAR_HEIGHT = 8 // px
const SCALE_BAR_INSET = 3 // px — gap to the key edges, keeping the pills apart
/* px — the strip is reserved on every key, highlighted or not, so the note
 * labels stay put when the scale selection changes. */
const KEY_LABEL_BOTTOM = SCALE_BAR_INSET * 2 + SCALE_BAR_HEIGHT
/* px — the computer-key chip sits one row above the note label. */
const KEY_CHAR_BOTTOM = KEY_LABEL_BOTTOM + 20

/* One blue family across white and black keys: the pill is opaque, so unlike
 * the old translucent wash it needs no separate hue to stay visible on the
 * near-black keys. The root takes the deeper shade so the scale's anchor reads
 * at a glance. Both shades are legible on --p-surface-0 and --p-surface-900,
 * and neither palette entry changes between light and dark mode. */
const SCALE_BAR_CLASS: Record<'root' | 'scale', string> = {
  root: 'bg-(--p-blue-500)',
  scale: 'bg-(--p-blue-300)',
}

function scaleBarClass(key: PianoKey): string | null {
  const role = scaleRole(key)
  if (!role) return null

  return SCALE_BAR_CLASS[role]
}

const scaleBarStyle = {
  insetInlineStart: `${SCALE_BAR_INSET}px`,
  insetInlineEnd: `${SCALE_BAR_INSET}px`,
  bottom: `${SCALE_BAR_INSET}px`,
  height: `${SCALE_BAR_HEIGHT}px`,
}

/*
 * Note names read as the key's own content once the user asks for them, so they
 * carry weight. Deliberately uniform across the keyboard: which keys belong to a
 * scale is the felt strip's job, and ranking the names by it as well left the
 * board looking like two different keyboards spliced together.
 *
 * Off mode is the exception — it leaves only the sparse C-octave markers, which
 * are orientation rather than content and stay as light as the rest of the board.
 */
const isToneLabelEnabled = computed(
  () => (props.toneLabelMode ?? 'off') !== 'off',
)

const whiteLabelClass = computed(() =>
  isToneLabelEnabled.value ? 'font-semibold text-(--p-text-color)' : null,
)

/* Colour is already at full contrast against the near-black key face in both
 * states, so only the weight moves here. */
const blackLabelClass = computed(() =>
  isToneLabelEnabled.value ? 'font-semibold' : null,
)

/* Emitted whenever a key plays, so the parent can arm the preview deaf period
 * (stops the piano's own tone registering as sung pitch). */
const emit = defineEmits<{ tonePlayed: [] }>()

const { pressCountFor, playKey, handleKeyDown } = usePianoKeyPlayback({
  onTonePlayed: () => emit('tonePlayed'),
})

/* A pressed key washes green, then fades back out. Slower than the flash used
 * elsewhere (TONE_CLICK_HIGHLIGHT_DURATION_MS) so the tail reads as a fade
 * rather than a flicker. */
const KEY_GLOW_DURATION_MS = 1200
const keyGlowDuration = `${KEY_GLOW_DURATION_MS}ms`

/* Fade curve, written out rather than as `ease-in` so it can be tweaked by
 * number: x1 is how long the green holds before opacity starts moving (0.42 =
 * plain ease-in, 0.7 holds most of the duration then drops hard), y1 pulls the
 * early fade down if 0 holds too flat. The end pair stays (1, 1) so the drop
 * runs out at full speed instead of easing to a stop. */
const keyGlowEasing = 'cubic-bezier(0.42, 0, 1, 1)'

/* Computer-keyboard playing: Z…M is the C3 octave, Q…U the C4 one, regardless
 * of the selected range (see pianoKeyboardMap). */
const {
  keyboardCharForMidi,
  octaveShiftOptions,
  stepOctaveShift,
  canShiftDown,
  canShiftUp,
  anchor,
} = usePianoKeyboardInput({
  midiMin: () => props.midiMin,
  midiMax: () => props.midiMax,
  onPlay: (midi) => void playKey(midi),
})

/*
 * Fit-to-container key sizing. The scroll box is w-full, so its width comes
 * from the parent and can't feed back from its own content — safe to observe
 * directly (unlike the w-fit abcjs sheets, which observe their parent).
 */
const scrollBox = useTemplateRef<HTMLElement>('scrollBox')
const containerWidth = ref(0)
useResizeObserver(scrollBox, ([entry]) => {
  containerWidth.value = entry.contentRect.width
})

const isCoarsePointer = useMediaQuery('(pointer: coarse)')

/* Grow the keys to fill the container, bounded by a tap-target floor (larger on
 * touch) and a life-size ceiling. Wide ranges hit the floor and scroll. */
const semitoneUnit = computed(() => {
  const minUnit = isCoarsePointer.value
    ? MIN_SEMITONE_UNIT_TOUCH
    : MIN_SEMITONE_UNIT_POINTER
  /* Before the first ResizeObserver callback there is nothing to fit to. */
  if (!containerWidth.value) return minUnit

  const fitted =
    containerWidth.value / pianoSpanUnits(props.midiMin, props.midiMax)

  /* Floor to whole px so a fractional remainder can't overflow by a hair and
   * trigger a scrollbar on a keyboard that was meant to fit. */
  return Math.floor(Math.min(Math.max(fitted, minUnit), MAX_SEMITONE_UNIT))
})

/* Printed only where a physical keyboard exists — on touch the chars are noise. */
function keyChar(key: PianoKey): string | null {
  if (isCoarsePointer.value) return null

  return keyboardCharForMidi(key.midi)
}

/* Only worth showing where shifting can reach notes the printed layout cannot,
 * and only where there is a keyboard to shift. */
const isOctaveShiftVisible = computed(
  () => !isCoarsePointer.value && octaveShiftOptions.value.length > 1,
)

const layout = computed(() =>
  buildPianoLayout(props.midiMin, props.midiMax, semitoneUnit.value),
)

const blackKeyHeight = WHITE_KEY_HEIGHT * BLACK_KEY_HEIGHT_RATIO
const trackHeight = WHITE_KEY_HEIGHT + PIANO_LABEL_BAND_HEIGHT

/* Pitch hint lines poke this far above the key tops into the label band, so
 * their top ends form one row — the equal semitone spacing reads at a glance. */
const PITCH_HINT_TICK_HEIGHT = 8 // px

/* The fitted unit is floored to whole px, so a keyboard that was meant to fit
 * never exceeds the container — a positive difference means it really scrolls. */
const isScrollable = computed(
  () =>
    containerWidth.value > 0 && layout.value.totalWidth > containerWidth.value,
)

/* Somewhere to start a pan that is not a key: @pointerdown sounds a note on the
 * first touch of a drag, so panning by the keys plays them by accident. Pointless
 * without a touch gesture (mouse users get the scrollbar) or where the whole
 * keyboard already fits. */
const isDragGutterVisible = computed(
  () => isCoarsePointer.value && isScrollable.value,
)

/* Vertical line + note/cents chip per lane, mapped from the live pitch. Lanes
 * with no clean pitch drop out, so this is empty while nobody is singing. */
const previewLines = computed(() =>
  buildPianoPreviewLines(
    (props.previewLanes ?? []).map((lane) => ({
      ...lane,
      layout: layout.value,
      accidentalStyle: accidentalStyle.value,
    })),
  ),
)

/* Two lines in the same colour are impossible to tell apart, so the high band
 * gets its own hue. Orange stays with the low/only lane, matching the
 * single-voice preview this grew out of. */
const LANE_COLOUR_CLASS: Record<
  PianoPreviewLaneId,
  { line: string; chip: string }
> = {
  low: { line: 'border-(--p-orange-400)/50', chip: 'text-(--p-orange-400)' },
  high: { line: 'border-(--p-blue-400)/50', chip: 'text-(--p-blue-400)' },
}

/* px — vertical step between the two chip rows. The label band is 28px and a
 * chip is ~12px tall, so row 1 sits just clear of the key tops. */
const PREVIEW_LABEL_ROW_HEIGHT = 12
</script>

<template>
  <div class="flex w-full flex-col gap-1">
    <!-- Outside the scroll box on purpose: inside it, the control would scroll
         away from the keys it moves on a wide range. -->
    <PianoOctaveShift
      v-if="isOctaveShiftVisible"
      :char="anchor.char"
      :noteLabel="anchor.noteLabel"
      :canShiftDown="canShiftDown"
      :canShiftUp="canShiftUp"
      @shift="stepOctaveShift"
    />

    <div class="relative w-full">
      <!-- A piano is a fixed physical instrument (low pitch always on the left), so
         force LTR even in RTL locales; inline-start then coincides with left.
         The gutter is padding on the scroll box rather than a strip inside it:
         padding belongs to the container, not the scrolled content, so it stays
         put however far the keys are scrolled. contentRect.width excludes it,
         so containerWidth (and with it the fitted key size) is unaffected. -->
      <div
        ref="scrollBox"
        class="w-full overflow-x-auto"
        :style="{
          paddingBlockEnd: isDragGutterVisible
            ? `${PIANO_DRAG_GUTTER_HEIGHT}px`
            : undefined,
        }"
        dir="ltr"
        data-testid="piano-display"
      >
        <div
          class="relative mx-auto"
          :style="{
            width: `${layout.totalWidth}px`,
            height: `${trackHeight}px`,
          }"
        >
          <button
            v-for="key in layout.whites"
            :key="key.midi"
            type="button"
            class="absolute bottom-0 touch-manipulation rounded-b-md border border-(--p-content-border-color) bg-(--p-surface-0) text-xs text-(--p-text-muted-color) transition-colors select-none hover:bg-(--p-surface-100)"
            :style="{
              insetInlineStart: `${key.leftPx}px`,
              width: `${key.widthPx}px`,
              height: `${WHITE_KEY_HEIGHT}px`,
            }"
            :data-testid="`piano-key-${key.midi}`"
            :data-scale-role="scaleRole(key) ?? undefined"
            :aria-label="keyAriaLabel(key)"
            :aria-keyshortcuts="keyboardCharForMidi(key.midi) ?? undefined"
            @pointerdown="playKey(key.midi)"
            @keydown="handleKeyDown($event, key.midi)"
          >
            <!-- Scale highlight. Decorative reinforcement of a filter the user
             set themselves, so it stays out of the key's aria-label — narrating
             it on all 40-odd keys would drown out the note names. Painted
             before the press glow so a press still washes over it. -->
            <span
              v-if="scaleBarClass(key)"
              class="pointer-events-none absolute rounded-full"
              :class="scaleBarClass(key)"
              :style="scaleBarStyle"
              aria-hidden="true"
            />

            <!-- Press highlight. Keyed on the press count so a fresh press
             remounts the element and replays the fade from full colour; an
             opacity transition would instead be a no-op while already lit. -->
            <span
              v-if="pressCountFor(key.midi)"
              :key="`glow-${pressCountFor(key.midi)}`"
              class="piano-key-glow pointer-events-none absolute inset-0 rounded-b-md bg-(--p-primary-color)"
              aria-hidden="true"
            />

            <!-- Sits on the key's pitch position, not its rectangle center, so the
             label lines up with the hint line (they differ on C/E/F/B). -->
            <span
              v-if="keyLabel(key)"
              class="absolute -translate-x-1/2"
              :class="whiteLabelClass"
              :style="{
                insetInlineStart: `${key.pitchX - key.leftPx}px`,
                bottom: `${KEY_LABEL_BOTTOM}px`,
              }"
            >
              {{ keyLabel(key) }}
            </span>

            <!-- The computer key that plays this note. Fixed height above the note
             label so the chars read as one row across the keyboard whether or
             not a given key carries a label. aria-keyshortcuts on the button
             already announces it, hence aria-hidden here. -->
            <span
              v-if="keyChar(key)"
              class="absolute -translate-x-1/2 rounded border border-(--p-content-border-color) px-1 text-[10px] leading-4 text-(--p-text-muted-color)"
              :style="{
                insetInlineStart: `${key.pitchX - key.leftPx}px`,
                bottom: `${KEY_CHAR_BOTTOM}px`,
              }"
              aria-hidden="true"
            >
              {{ keyChar(key) }}
            </span>
          </button>

          <button
            v-for="key in layout.blacks"
            :key="key.midi"
            type="button"
            class="absolute z-10 flex touch-manipulation flex-col items-center justify-end gap-1 rounded-b-md border border-(--p-surface-950) bg-(--p-surface-900) transition-colors select-none hover:bg-(--p-surface-700)"
            :style="{
              insetInlineStart: `${key.leftPx}px`,
              top: `${PIANO_LABEL_BAND_HEIGHT}px`,
              width: `${key.widthPx}px`,
              height: `${blackKeyHeight}px`,
              /* Clears the reserved scale strip, landing the black-key note
                 label on the same baseline as the white-key one. */
              paddingBlockEnd: `${KEY_LABEL_BOTTOM}px`,
            }"
            :data-testid="`piano-key-${key.midi}`"
            :data-scale-role="scaleRole(key) ?? undefined"
            :aria-label="keyAriaLabel(key)"
            :aria-keyshortcuts="keyboardCharForMidi(key.midi) ?? undefined"
            @pointerdown="playKey(key.midi)"
            @keydown="handleKeyDown($event, key.midi)"
          >
            <span
              v-if="scaleBarClass(key)"
              class="pointer-events-none absolute rounded-full"
              :class="scaleBarClass(key)"
              :style="scaleBarStyle"
              aria-hidden="true"
            />

            <span
              v-if="pressCountFor(key.midi)"
              :key="`glow-${pressCountFor(key.midi)}`"
              class="piano-key-glow pointer-events-none absolute inset-0 rounded-b-md bg-(--p-primary-color)"
              aria-hidden="true"
            />

            <!-- Stacked bottom-up: the computer key sits above the note label.
             relative keeps both labels painted above the glow overlay. -->
            <span
              v-if="keyChar(key)"
              class="relative rounded border border-(--p-surface-600) px-1 text-[10px] leading-4 text-(--p-surface-300)"
              aria-hidden="true"
            >
              {{ keyChar(key) }}
            </span>

            <!-- Both spellings of the note, the singer's own convention on top
             (F♯ over G♭, or G♭ over F♯ — see the accidentals toggle). Unlike
             the guitar, where a fret row only has height for one name, a key
             keeps both: the second row is what a singer reading the other
             convention looks for. Which one leads is decided in pianoLabels;
             the styling here belongs to the position, not to sharp or flat.
             (The note sheets stack the pair by a different rule: there the
             labels climb away from the notehead, so the sharp has to stay the
             one nearest the note. A key has no note to sit beside.)
             Wrapped so the parent's gap-1 falls between the computer-key chip
             and the pair rather than between the two spellings, which belong
             together as one label. The lower row is the secondary reading:
             smaller, and --p-surface-400 rather than the muted text colour,
             which is near-black in light mode and would vanish into the key
             face. -->
            <span
              v-if="keyLabel(key)"
              class="relative flex flex-col items-center leading-none"
            >
              <span
                class="text-[10px] text-(--p-surface-0)"
                :class="blackLabelClass"
              >
                {{ keyLabel(key) }}
              </span>

              <span
                v-if="keyAltLabel(key)"
                class="text-[10px] text-(--p-surface-300)"
              >
                {{ keyAltLabel(key) }}
              </span>
            </span>
          </button>

          <!-- Pitch hint lines: a thin green line down each key's pitch position,
           shown only while "See your voice" is on. Green is the app's on-pitch
           colour (NotesSheet, DoReMiScaleItem), so landing the orange live-pitch
           line on a green one reads as in-tune. The shade differs per key so the
           line stays legible on both backgrounds: 500 on the white keys, 400 on
           the dark black keys.
           Consecutive lines are exactly one semitone unit apart, so the
           live-pitch line travels at a constant px-per-cent. On C/E/F/B the line
           sits a quarter unit off the rectangle center — those keys are
           asymmetric around their pitch (see pianoLayout).
           Every line also gets a short solid tick above the keys: white and
           black key tops share one y, so the ticks land on a single row against
           the flat label band, where the even semitone spacing is obvious. -->
          <template v-if="isPreviewEnabled">
            <div
              v-for="key in layout.whites"
              :key="`hint-${key.midi}`"
              class="pointer-events-none absolute bottom-0 z-[5] w-0 -translate-x-[0.5px] border-l border-dotted border-(--p-green-500)"
              :style="{
                insetInlineStart: `${key.pitchX}px`,
                height: `${WHITE_KEY_HEIGHT}px`,
              }"
            />
            <div
              v-for="key in layout.blacks"
              :key="`hint-${key.midi}`"
              class="pointer-events-none absolute z-[15] w-0 -translate-x-[0.5px] border-l border-dotted border-(--p-green-400)"
              :style="{
                insetInlineStart: `${key.pitchX}px`,
                top: `${PIANO_LABEL_BAND_HEIGHT}px`,
                height: `${blackKeyHeight}px`,
              }"
            />
            <div
              v-for="key in [...layout.whites, ...layout.blacks]"
              :key="`tick-${key.midi}`"
              class="pointer-events-none absolute z-[15] w-0 -translate-x-[0.5px] border-l border-solid border-(--p-green-500)"
              :style="{
                insetInlineStart: `${key.pitchX}px`,
                top: `${PIANO_LABEL_BAND_HEIGHT - PITCH_HINT_TICK_HEIGHT}px`,
                height: `${PITCH_HINT_TICK_HEIGHT}px`,
              }"
            />
          </template>

          <!-- Live-pitch overlay: a vertical dashed line spanning the track per
           singing voice, with a note/cents chip in the top band. Orange is the
           low/only voice, blue the high one in duet mode. Chips that would
           collide stack onto a second row (see buildPianoPreviewLines).
           pointer-events-none keeps the keys underneath clickable. -->
          <template v-for="line in previewLines" :key="line.laneId">
            <div
              class="pointer-events-none absolute inset-y-0 z-20 w-0 -translate-x-[1.5px] border-l-3 border-dashed"
              :class="LANE_COLOUR_CLASS[line.laneId].line"
              :style="{ insetInlineStart: `${line.x}px` }"
              data-testid="piano-preview-line"
              :data-lane="line.laneId"
            />
            <span
              class="pointer-events-none absolute z-30 -translate-x-1/2 rounded bg-(--p-content-background) px-0.5 text-xs leading-none font-semibold tabular-nums"
              :class="LANE_COLOUR_CLASS[line.laneId].chip"
              :style="{
                insetInlineStart: `${line.x}px`,
                top: `${4 + line.labelRow * PREVIEW_LABEL_ROW_HEIGHT}px`,
              }"
              data-testid="piano-preview-label"
              :data-lane="line.laneId"
            >
              {{ line.text }}
            </span>
          </template>
        </div>
      </div>

      <!-- The gutter, painted so the safe area is visible: a grey strip with a
           drag handle. pointer-events-none so the touch lands on the scroll box
           underneath and the browser pans it natively. -->
      <div
        v-if="isDragGutterVisible"
        class="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center rounded-b-md bg-(--p-surface-100) dark:bg-(--p-surface-800)"
        :style="{ height: `${PIANO_DRAG_GUTTER_HEIGHT}px` }"
        aria-hidden="true"
        data-testid="piano-drag-gutter"
      >
        <span
          class="h-1.5 w-16 rounded-full bg-(--p-surface-400) dark:bg-(--p-surface-600)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Solid for the first beat (so the press reads as a hit), then out. */
@keyframes piano-key-glow {
  0%,
  15% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

.piano-key-glow {
  /* The curve is ease-in shaped: opacity barely moves early on, so the green
   * holds, then drops away quickly. See keyGlowEasing for the control points. */
  animation: piano-key-glow v-bind(keyGlowDuration) v-bind(keyGlowEasing)
    forwards;
}
</style>
