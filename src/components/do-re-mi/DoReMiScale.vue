<script setup lang="ts">
import { OUT_OF_RANGE_OVERFLOW_PX } from '@/constants/chartStyles'
import { TONE_CLICK_HIGHLIGHT_DURATION_MS } from '@/constants/toneConstants'
import type { ScaleMode } from '@/utils/noteUtils'
import {
  buildChromaticDisplayScale,
  NOTE_NAMES,
  noteToFrequency,
  SCALE_MODE_SEMITONES,
} from '@/utils/noteUtils'
import DoReMiNoteTarget from './DoReMiNoteTarget.vue'
import DoReMiScaleItem from './DoReMiScaleItem.vue'
import type { ScaleStep } from './useDoReMiGame'

type Props = {
  scaleSteps: ScaleStep[]
  currentStepIndex: number
  holdProgress: number
  isComplete: boolean
  isStarted: boolean
  isPlayingSequence?: boolean
  currentPlayingIndex?: number
  previewMidi?: number | null
  previewFrequency?: number | null
  previewNoteLabel?: string | null
  onTonePlayed?: () => void
  scaleMode?: ScaleMode
  /* Note-target overlay props (only used while game is active) */
  showDoReMiTarget?: boolean
  targetStep?: ScaleStep | null
  targetFrequency?: number
  currentFrequency?: number | null
  centsFromTarget?: number | null
  isSingingCorrectNote?: boolean
  tooLowMs?: number
  tooHighMs?: number
}

const props = withDefaults(defineProps<Props>(), {
  isPlayingSequence: false,
  currentPlayingIndex: -1,
  previewMidi: null,
  previewFrequency: null,
  previewNoteLabel: null,
  onTonePlayed: undefined,
  scaleMode: 'ionian',
  showDoReMiTarget: false,
  targetStep: null,
  targetFrequency: 0,
  currentFrequency: null,
  centsFromTarget: null,
  isSingingCorrectNote: false,
  tooLowMs: 0,
  tooHighMs: 0,
})

/* Flip the overlay below the active row once the singer reaches SOL.
 * Keeps the target inside the scale viewport while staying close to the
 * active row. */
const OVERLAY_FLIP_SCALE_INDEX = 5
/* Anchor the overlay this many chromatic rows away from the active row.
 * Supports halves (e.g. 1.5, 2.5) — the position is linearly interpolated
 * between the two bracketing rows. Smaller = tighter against active step. */
const OVERLAY_GAP_ROWS = 1.5

const { t } = useI18n()
const { playTone } = useTonePlayer()

type ChromaticDisplayItem = {
  note: string
  octave: number
  solfege: string
  /** Index into scaleSteps (null if excluded) */
  scaleIndex: number | null
  excluded: boolean
}

/**
 * Build the full chromatic display list (13 items), mapping each to its
 * corresponding scaleStep index when the note is part of the active scale.
 */
const chromaticItems = computed<ChromaticDisplayItem[]>(() => {
  const steps = props.scaleSteps
  if (steps.length === 0) return []

  /* Derive root MIDI from first scale step */
  const rootNote = steps[0].note
  const rootOctave = steps[0].octave
  const rootMidi = (rootOctave + 1) * 12 + NOTE_NAMES.indexOf(rootNote)

  const chromatic = buildChromaticDisplayScale(rootMidi)
  const semitones = SCALE_MODE_SEMITONES[props.scaleMode]

  /* Map semitone offsets to their scaleSteps index */
  const semitoneToStepIndex = new Map<number, number>()
  semitones.forEach((s, i) => semitoneToStepIndex.set(s, i))

  return chromatic.map((cn) => {
    const stepIndex = semitoneToStepIndex.get(cn.semitone) ?? null
    const isIncluded = stepIndex !== null

    return {
      note: cn.note,
      octave: cn.octave,
      solfege: isIncluded ? steps[stepIndex].solfege : '',
      scaleIndex: stepIndex,
      excluded: !isIncluded,
    }
  })
})

const reversedChromaticItems = computed(() =>
  chromaticItems.value
    .map((item, i) => ({ item, chromaticIndex: i }))
    .toReversed(),
)

const clickedIndex = ref<number | null>(null)
const stepElements = ref<HTMLElement[]>([])
const newlyActiveChromaticIndex = ref<number | null>(null)
let clickedTimer: ReturnType<typeof setTimeout> | null = null
let newlyActiveTimer: ReturnType<typeof setTimeout> | null = null

/* Duration must match the longest CSS animation in DoReMiScaleItem (ignite-row = 450ms) */
const NEWLY_ACTIVE_DURATION_MS = 450

function handleItemClick(chromaticIndex: number, item: ChromaticDisplayItem) {
  playTone(noteToFrequency(item.note as ScaleStep['note'], item.octave))
  props.onTonePlayed?.()

  if (clickedTimer) clearTimeout(clickedTimer)

  clickedIndex.value = chromaticIndex
  clickedTimer = setTimeout(() => {
    clickedIndex.value = null
    clickedTimer = null
  }, TONE_CLICK_HIGHLIGHT_DURATION_MS)
}

/*
 * Compute which chromatic item the preview indicator belongs to and where
 * inside that box to position it.
 *
 * When a raw frequency (Hz) is available, positioning is continuous:
 * the indicator slides smoothly within the box based on pitch deviation.
 * Perfect pitch → 50% (center), sharp → toward 0% (top), flat → toward 100% (bottom).
 */
function getRootMidi(): number | null {
  const steps = props.scaleSteps
  if (steps.length === 0) return null

  return (steps[0].octave + 1) * 12 + NOTE_NAMES.indexOf(steps[0].note)
}

/**
 * Compute continuous offset% within a chromatic box from the raw frequency.
 * Returns 0–100 where 50 = perfect pitch for that MIDI note.
 */
function frequencyToOffsetPercent(hz: number, targetMidi: number): number {
  // 12 semitones/octave × log₂(hz / A4) + 69 (A4's MIDI number)
  const rawMidi = 12 * Math.log2(hz / 440) + 69
  const delta = rawMidi - targetMidi

  // delta −0.5 → 100%, 0 → 50%, +0.5 → 0%
  const percent = 50 - delta * 100

  return Math.max(0, Math.min(100, percent))
}

/* Preview indicator positioned inside a specific item.
 * Out-of-range pitches clamp to edge items with outOfRange flag (label suppressed). */
const previewIndicator = computed<{
  chromaticIndex: number
  offsetPercent: number | string
  outOfRange: boolean
} | null>(() => {
  if (props.previewMidi === null) return null

  const items = chromaticItems.value
  if (items.length < 2) return null

  const rootMidi = getRootMidi()
  if (rootMidi === null) return null

  const midi = props.previewMidi
  const hz = props.previewFrequency

  /* Below range → clamp 4px past the bottom edge of root item */
  if (midi < rootMidi) {
    return {
      chromaticIndex: 0,
      offsetPercent: `calc(100% + ${OUT_OF_RANGE_OVERFLOW_PX}px)`,
      outOfRange: true,
    }
  }

  /* Above range → clamp 4px past the top edge of highest item */
  if (midi > rootMidi + 12) {
    return {
      chromaticIndex: items.length - 1,
      offsetPercent: `-${OUT_OF_RANGE_OVERFLOW_PX}px`,
      outOfRange: true,
    }
  }

  const chromaticOffset = midi - rootMidi

  /* Continuous positioning when frequency is available */
  if (hz !== null && hz !== undefined && hz > 0) {
    return {
      chromaticIndex: chromaticOffset,
      offsetPercent: frequencyToOffsetPercent(hz, midi),
      outOfRange: false,
    }
  }

  /* Fallback: center of the matching box when no frequency */
  return {
    chromaticIndex: chromaticOffset,
    offsetPercent: 50,
    outOfRange: false,
  }
})

/* Overlay positioning depends on DOM layout (offsetTop/offsetHeight), which
 * Vue's reactivity cannot track directly. Bump this tick whenever layout may
 * have changed so the computed style re-evaluates. */
const overlayLayoutTick = ref(0)
const bumpOverlayLayout = () => overlayLayoutTick.value++

/* Overlay element height — measured via ResizeObserver so the "above active"
 * mode can compute the overlay's top edge as (anchorBottom - overlayHeight).
 * Using a single transform on the wrapper means CSS transitions glide smoothly
 * across the LA flip without switching anchor properties. */
const overlayElement = ref<HTMLElement | null>(null)
const overlayHeight = ref(0)
let overlayResizeObserver: ResizeObserver | null = null

/* Suppress the slide-in on first paint — the overlay should land in place
 * when the game starts, not animate from translateY(0). */
const hasInitialPositioned = ref(false)

type OverlayStyle = { transform: string }
const overlayStyle = computed<OverlayStyle | null>(() => {
  /* Re-read on layout changes */
  void overlayLayoutTick.value

  if (!props.showDoReMiTarget) return null
  if (!props.isStarted || props.isComplete) return null

  const items = chromaticItems.value
  if (items.length === 0) return null

  const activeChromaticIdx = items.findIndex(
    (item) => item.scaleIndex === props.currentStepIndex,
  )
  if (activeChromaticIdx === -1) return null

  const els = stepElements.value

  /* Linearly interpolate between the two integer rows that bracket the
   * (possibly fractional) gap so OVERLAY_GAP_ROWS can be e.g. 1.5. */
  const gapFloor = Math.floor(OVERLAY_GAP_ROWS)
  const gapCeil = Math.ceil(OVERLAY_GAP_ROWS)
  const gapFrac = OVERLAY_GAP_ROWS - gapFloor

  let topPx: number

  if (props.currentStepIndex < OVERLAY_FLIP_SCALE_INDEX) {
    /* Visually above active row. The chromatic array is rendered top-to-bottom
     * in reverse, so a higher source index renders physically higher. */
    const rowNear = els[activeChromaticIdx + gapFloor]
    const rowFar = els[activeChromaticIdx + gapCeil]
    if (!rowNear || !rowFar) return null

    const nearBottom = rowNear.offsetTop + rowNear.offsetHeight
    const farBottom = rowFar.offsetTop + rowFar.offsetHeight
    const anchorBottom = nearBottom + gapFrac * (farBottom - nearBottom)

    topPx = anchorBottom - overlayHeight.value
  } else {
    /* Visually below active row */
    const rowNear = els[activeChromaticIdx - gapFloor]
    const rowFar = els[activeChromaticIdx - gapCeil]
    if (!rowNear || !rowFar) return null

    topPx = rowNear.offsetTop + gapFrac * (rowFar.offsetTop - rowNear.offsetTop)
  }

  return { transform: `translateY(${topPx}px)` }
})

watch(overlayElement, (el, _prev, onCleanup) => {
  if (!el) return

  overlayResizeObserver = new ResizeObserver((entries) => {
    const entry = entries[0]
    if (!entry) return

    overlayHeight.value = entry.contentRect.height
    bumpOverlayLayout()
  })
  overlayResizeObserver.observe(el)

  /* Initial measurement, then arm the transition one frame later so the
   * very first positioning lands without a slide. */
  overlayHeight.value = el.offsetHeight
  bumpOverlayLayout()
  requestAnimationFrame(() => {
    hasInitialPositioned.value = true
  })

  onCleanup(() => {
    overlayResizeObserver?.disconnect()
    overlayResizeObserver = null
    hasInitialPositioned.value = false
  })
})

function onWindowResize() {
  bumpOverlayLayout()
}

onMounted(() => {
  window.addEventListener('resize', onWindowResize)
  nextTick(bumpOverlayLayout)
})

onUnmounted(() => {
  if (clickedTimer) clearTimeout(clickedTimer)
  if (newlyActiveTimer) clearTimeout(newlyActiveTimer)
  window.removeEventListener('resize', onWindowResize)
})

watch(
  () => props.currentStepIndex,
  (index) => {
    /* Find the chromatic index for this scale step to scroll to */
    const chromaticIdx = chromaticItems.value.findIndex(
      (item) => item.scaleIndex === index,
    )
    if (chromaticIdx === -1) return

    /* Briefly flag the new current step so it plays its entrance animations */
    if (newlyActiveTimer) clearTimeout(newlyActiveTimer)
    newlyActiveChromaticIndex.value = chromaticIdx
    newlyActiveTimer = setTimeout(() => {
      newlyActiveChromaticIndex.value = null
      newlyActiveTimer = null
    }, NEWLY_ACTIVE_DURATION_MS)

    nextTick(() => {
      stepElements.value[chromaticIdx]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
      bumpOverlayLayout()
    })
  },
)

watch(
  () => props.showDoReMiTarget,
  () => {
    nextTick(bumpOverlayLayout)
  },
)

watch(
  () => props.isStarted,
  (started) => {
    if (!started) return

    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
    }, 0)
  },
)

watch(
  () => props.isPlayingSequence,
  (playing) => {
    if (!playing) return

    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
    }, 0)
  },
)

function stepStatus(
  scaleIndex: number | null,
  currentStepIndex: number,
): 'completed' | 'current' | 'upcoming' {
  if (scaleIndex === null) return 'upcoming'
  if (scaleIndex < currentStepIndex) return 'completed'
  if (scaleIndex === currentStepIndex) return 'current'

  return 'upcoming'
}

function isItemHighlighted(chromaticIndex: number): boolean {
  const item = chromaticItems.value[chromaticIndex]
  if (item.excluded) return clickedIndex.value === chromaticIndex

  return (
    (props.isPlayingSequence &&
      props.currentPlayingIndex === item.scaleIndex) ||
    clickedIndex.value === chromaticIndex
  )
}
</script>

<template>
  <div class="do-re-mi-scale relative flex w-full max-w-150 flex-col py-0.5">
    <DoReMiScaleItem
      v-for="{ item, chromaticIndex } in reversedChromaticItems"
      :ref="
        (el) => {
          if (el)
            stepElements[chromaticIndex] = (
              el as InstanceType<typeof DoReMiScaleItem>
            ).$el
        }
      "
      :key="chromaticIndex"
      :data-testid="
        item.excluded
          ? 'scale-step-excluded-' + chromaticIndex
          : 'scale-step-' + item.scaleIndex
      "
      :step="{
        solfege: item.solfege,
        note: item.note as ScaleStep['note'],
        octave: item.octave,
      }"
      :status="stepStatus(item.scaleIndex, currentStepIndex)"
      :isComplete="isComplete"
      :isStarted="isStarted"
      :isHighlighted="isItemHighlighted(chromaticIndex)"
      :isNewlyActive="newlyActiveChromaticIndex === chromaticIndex"
      :holdProgress="holdProgress"
      :excluded="item.excluded"
      :buttonTitle="
        item.excluded
          ? `${item.note}${item.octave}`
          : t('doReMi.playSolfege', { solfege: item.solfege })
      "
      :previewOffsetPercent="
        previewIndicator?.chromaticIndex === chromaticIndex
          ? previewIndicator.offsetPercent
          : null
      "
      :previewNoteLabel="
        previewIndicator?.chromaticIndex === chromaticIndex
          ? previewNoteLabel
          : null
      "
      :previewIsOutOfRange="
        previewIndicator?.chromaticIndex === chromaticIndex
          ? previewIndicator.outOfRange
          : false
      "
      @click="handleItemClick(chromaticIndex, item)"
    />

    <div
      v-if="overlayStyle && targetStep"
      ref="overlayElement"
      class="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-end will-change-transform sm:pe-11"
      :class="
        hasInitialPositioned
          ? 'transition-transform duration-200 ease-out motion-reduce:transition-none'
          : ''
      "
      :style="overlayStyle"
    >
      <div
        class="rounded-lg border border-(--p-content-border-color)/60 bg-(--p-content-background)/20 px-3 py-2 shadow-sm backdrop-blur-sm"
      >
        <DoReMiNoteTarget
          :targetStep="targetStep"
          :targetFrequency="targetFrequency"
          :currentFrequency="currentFrequency"
          :centsFromTarget="centsFromTarget"
          :isSingingCorrectNote="isSingingCorrectNote"
          :tooLowMs="tooLowMs"
          :tooHighMs="tooHighMs"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="css"></style>
