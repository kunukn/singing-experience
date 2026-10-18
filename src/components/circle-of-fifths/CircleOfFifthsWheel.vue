<script setup lang="ts">
import type { CircleView } from './circleOfFifths'
import {
  accidentalCountLabel,
  CIRCLE_KEYS,
  keyAngle,
  polarPoint,
  wedgePath,
} from './circleOfFifths'

/* target: the key whose DO is being sung — the one to look at. home: the key
 * the walk is leaving, whose chord just played. */
type KeyStatus = 'target' | 'home' | 'selected' | 'done' | 'idle'

const {
  view,
  litKeyIndices = [],
  exploredKeyIndices = [],
  exploredMinorKeyIndices = [],
  currentKeyIndex = null,
  nextKeyIndex = null,
  selectedKeyIndex = null,
  holdProgress = 0,
  isInteractive = false,
  isPathClosed = false,
  heardKeyIndex = null,
  targetNoteKeyIndex = null,
  isHeardCorrect = false,
  outlineRing = 'major',
  isBeckoning = false,
} = defineProps<{
  view: CircleView
  litKeyIndices?: readonly number[]
  exploredKeyIndices?: readonly number[]
  exploredMinorKeyIndices?: readonly number[]
  currentKeyIndex?: number | null
  nextKeyIndex?: number | null
  selectedKeyIndex?: number | null
  holdProgress?: number
  isInteractive?: boolean
  isPathClosed?: boolean
  /* Key whose DO the live mic preview hears, outlined on the wheel */
  heardKeyIndex?: number | null
  /* Key whose wedge holds the note to sing, outlined dashed — the slot the
   * heard outline should land in */
  targetNoteKeyIndex?: number | null
  /* The singer is on the target note, octave included */
  isHeardCorrect?: boolean
  /* Which ring both outlines sit on — minor while finding LA, so the slot is
   * the relative minor (Em under G) and the singer's outline can land in it */
  outlineRing?: 'major' | 'minor'
  /* Nothing tapped yet — sweep a tint round the major ring to show the wedges
   * are buttons */
  isBeckoning?: boolean
}>()

const emit = defineEmits<{
  select: [keyIndex: number]
}>()

const { t } = useI18n()

/* Radii in viewBox units (the wheel is 200 units across, centre at 0,0) */
const MAJOR_OUTER = 98
const MAJOR_INNER = 64
const MINOR_INNER = 40
const CENTER_RADIUS = MINOR_INNER
const HOLD_RING_RADIUS = 37
const MAJOR_LABEL_RADIUS = 81
const MINOR_LABEL_RADIUS = 52
/* Just inside the major ring, where the minor ring sits in the fifths view */
const STAR_RADIUS = 62
/* 200 viewBox units span 100cqi, so one unit is half a container-inline unit */
const CQI_PER_UNIT = 0.5
/* Delay between neighbouring wedges in the beckon sweep — 12 wedges make a
 * ~0.8s lap, quick enough to read as one motion round the wheel */
const BECKON_STEP_MS = 70
/* Degrees between neighbouring keys on either view */
const KEY_STEP_DEG = 30

const majorWedge = wedgePath(MAJOR_INNER, MAJOR_OUTER)
const minorWedge = wedgePath(MINOR_INNER, MAJOR_INNER)
const outlineWedge = computed(() =>
  outlineRing === 'minor' ? minorWedge : majorWedge,
)

const MAJOR_FILL: Record<KeyStatus, string> = {
  /* Tailwind's pulse keyframes at twice the default speed — at 2s the fade
   * was too slow to notice */
  target:
    'animate-[pulse_1s_cubic-bezier(0.4,0,0.6,1)_infinite] motion-reduce:animate-none fill-(--p-yellow-300) dark:fill-(--p-yellow-600)',
  home: 'fill-(--p-yellow-100) dark:fill-(--p-yellow-900)',
  selected: 'fill-(--p-blue-300) dark:fill-(--p-blue-700)',
  done: 'fill-(--p-green-300) dark:fill-(--p-green-700)',
  idle: 'fill-(--p-surface-100) dark:fill-(--p-surface-800)',
}

const isChromatic = computed(() => view === 'chromatic')

/* While a hop is pending the sung note lights the next key; on the walk's
 * first note and in Explore patterns it's the current key itself */
const targetKeyIndex = computed(() => nextKeyIndex ?? currentKeyIndex)
const homeKeyIndex = computed(() =>
  nextKeyIndex === null ? null : currentKeyIndex,
)

function statusOf(index: number): KeyStatus {
  if (index === targetKeyIndex.value) return 'target'
  if (index === homeKeyIndex.value) return 'home'
  if (index === selectedKeyIndex) return 'selected'
  if (litKeyIndices.includes(index) || exploredKeyIndices.includes(index))
    return 'done'

  return 'idle'
}

function minorFill(index: number) {
  if (exploredMinorKeyIndices.includes(index))
    return 'fill-(--p-purple-300) dark:fill-(--p-purple-700)'
  if (index === selectedKeyIndex)
    return 'fill-(--p-blue-100) dark:fill-(--p-blue-900)'

  return 'fill-(--p-surface-200) dark:fill-(--p-surface-700)'
}

const keys = computed(() =>
  CIRCLE_KEYS.map((key) => ({
    ...key,
    angle: keyAngle(key.index, view),
    status: statusOf(key.index),
    countLabel: accidentalCountLabel(key),
    isExplored: exploredKeyIndices.includes(key.index),
    isMinorExplored: exploredMinorKeyIndices.includes(key.index),
    isHeard: key.index === heardKeyIndex,
  })),
)

/* The walk drawn on the chromatic circle: stepping 7 half steps at a time
 * traces a 12-pointed star. Only drawn in that view — on the fifths circle the
 * lit wedges already show the path. */
const starPoints = computed(() => {
  const path = isPathClosed ? [...litKeyIndices, 0] : litKeyIndices

  return path
    .map((index) => {
      const { x, y } = polarPoint(keyAngle(index, 'chromatic'), STAR_RADIUS)
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
})

/* Moves an item out from the centre along its angle, then un-rotates it so the
 * text stays upright. The same function list in every state lets a plain CSS
 * transition swing it along the arc when the view changes. */
function placeAt(angle: number, radius: number) {
  return {
    transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(${-radius * CQI_PER_UNIT}cqi) rotate(${-angle}deg)`,
  }
}

function keyAriaLabel(label: string) {
  return t('circleOfFifths.keyMajor', { key: label })
}
</script>

<template>
  <!-- A clock face, not text: sharps run clockwise in every language, so the
    wheel never mirrors in RTL. -->
  <div
    dir="ltr"
    class="circle-wheel relative aspect-square w-full max-w-md select-none"
    :data-view="view"
    data-testid="circle-of-fifths-wheel"
  >
    <svg
      viewBox="-100 -100 200 200"
      class="absolute inset-0 size-full"
      aria-hidden="true"
    >
      <g v-for="key in keys" :key="key.index">
        <path
          :d="majorWedge"
          class="wedge stroke-(--p-content-background)"
          :class="MAJOR_FILL[key.status]"
          :style="{ transform: `rotate(${key.angle}deg)` }"
        />
        <path
          :d="minorWedge"
          class="wedge stroke-(--p-content-background)"
          :class="[minorFill(key.index), isChromatic ? 'opacity-0' : '']"
          :style="{ transform: `rotate(${key.angle}deg)` }"
        />
      </g>

      <!-- An overlay rather than animating each wedge's fill: keyframes can't
        return to a class-driven fill mid-cycle. Delays follow the angle, so
        the sweep runs clockwise from the top in both views. -->
      <g v-if="isBeckoning" data-testid="circle-beckon">
        <path
          v-for="key in keys"
          :key="`beckon-${key.index}`"
          :d="majorWedge"
          class="wedge beckon fill-(--p-primary-color)"
          :style="{
            transform: `rotate(${key.angle}deg)`,
            animationDelay: `${(key.angle / KEY_STEP_DEG) * BECKON_STEP_MS}ms`,
          }"
        />
      </g>

      <path
        v-if="targetNoteKeyIndex !== null"
        :d="outlineWedge"
        class="wedge target-outline fill-none stroke-(--p-blue-500)"
        :style="{
          transform: `rotate(${keyAngle(targetNoteKeyIndex, view)}deg)`,
        }"
        data-testid="circle-target-outline"
        :data-angle="keyAngle(targetNoteKeyIndex, view)"
        :data-ring="outlineRing"
      />

      <path
        v-if="heardKeyIndex !== null"
        :d="outlineWedge"
        class="wedge heard-outline fill-none"
        :class="
          isHeardCorrect ? 'stroke-(--p-green-500)' : 'stroke-(--p-blue-500)'
        "
        :style="{ transform: `rotate(${keyAngle(heardKeyIndex, view)}deg)` }"
        data-testid="circle-heard-outline"
        :data-angle="keyAngle(heardKeyIndex, view)"
        :data-correct="isHeardCorrect"
        :data-ring="outlineRing"
      />

      <polyline
        v-if="litKeyIndices.length > 1"
        :points="starPoints"
        class="star fill-none stroke-(--p-green-500)"
        :class="isChromatic ? 'is-visible' : ''"
        :data-visible="isChromatic"
        data-testid="circle-star"
      />

      <circle
        :r="CENTER_RADIUS"
        class="fill-(--p-content-background) stroke-(--p-content-border-color)"
      />
      <!-- Only while holding: an empty ring's round linecap still draws a dot -->
      <circle
        v-if="holdProgress > 0"
        :r="HOLD_RING_RADIUS"
        data-testid="circle-hold-ring"
        pathLength="1"
        class="hold-ring fill-none stroke-(--p-green-400)"
        :stroke-dasharray="1"
        :stroke-dashoffset="1 - holdProgress"
      />
    </svg>

    <div
      v-for="key in keys"
      :key="key.index"
      class="absolute start-1/2 top-1/2 transition-transform duration-700 ease-in-out motion-reduce:transition-none"
      :style="placeAt(key.angle, MAJOR_LABEL_RADIUS)"
      :data-testid="`circle-key-${key.index}`"
      :data-status="key.status"
      :data-angle="key.angle"
      :data-explored="key.isExplored"
      :data-heard="key.isHeard"
    >
      <PrimeButton
        v-if="isInteractive"
        text
        rounded
        class="key-chip"
        :aria-label="keyAriaLabel(key.label)"
        :aria-pressed="key.index === selectedKeyIndex"
        @click="emit('select', key.index)"
      >
        <span class="key-chip-content">
          <span
            class="key-name"
            :class="{ 'is-compact': key.alternateLabel }"
            >{{
              key.alternateLabel
                ? `${key.label}/${key.alternateLabel}`
                : key.label
            }}</span
          >
          <span class="key-count">{{ key.countLabel || '&nbsp;' }}</span>
        </span>
      </PrimeButton>
      <span v-else class="key-chip-content">
        <span class="key-name" :class="{ 'is-compact': key.alternateLabel }">{{
          key.alternateLabel ? `${key.label}/${key.alternateLabel}` : key.label
        }}</span>
        <span class="key-count">{{ key.countLabel || '&nbsp;' }}</span>
      </span>
    </div>

    <div
      v-for="key in keys"
      :key="`minor-${key.index}`"
      class="minor-label absolute start-1/2 top-1/2 transition-[transform,opacity] duration-700 ease-in-out motion-reduce:transition-none"
      :class="isChromatic ? 'opacity-0' : ''"
      :style="placeAt(key.angle, MINOR_LABEL_RADIUS)"
      :data-testid="`circle-minor-${key.index}`"
      :data-explored="key.isMinorExplored"
      aria-hidden="true"
    >
      {{ key.minorLabel }}
    </div>

    <div
      class="absolute start-1/2 top-1/2 flex size-[36cqi] -translate-1/2 items-center justify-center text-center"
    >
      <slot />
    </div>
  </div>
</template>

<style scoped>
.circle-wheel {
  container-type: inline-size;
}

/* transform-box/origin pin the rotation to the wheel centre (0,0 in the
 * viewBox) rather than each wedge's own bounding box */
.wedge {
  stroke-width: 1.5;
  transform-box: view-box;
  transform-origin: 0 0;
  transition:
    transform 700ms ease-in-out,
    opacity 700ms ease-in-out,
    fill 300ms ease;
}

/* Fades in once the keys have swung into their chromatic places */
.star {
  stroke-width: 1.5;
  stroke-linejoin: round;
  opacity: 0;
  transition: opacity 300ms ease;
}

.star.is-visible {
  opacity: 0.9;
  transition-delay: 700ms;
}

.wedge.heard-outline {
  stroke-width: 3.5;
  stroke-linejoin: round;
  /* Jumps straight to the heard key — a rotation from F (330°) to C (0°)
   * would sweep the long way round the whole wheel */
  transition: none;
}

.wedge.target-outline {
  stroke-width: 2;
  /* viewBox units. Same blue as the heard outline so the two read as a pair —
   * the dashes say "land here", the solid line says "you are here" */
  stroke-dasharray: 4 3;
  stroke-linejoin: round;
  /* Jumps like the heard outline, for the same long-sweep reason */
  transition: none;
}

/* Each wedge glows briefly (peak at 6%, gone by 14% of the cycle), then the
 * wheel rests for the remaining ~4s before the next lap */
.wedge.beckon {
  opacity: 0;
  stroke: none;
  pointer-events: none;
  animation: wedge-beckon 5s ease-in-out infinite;
}

@keyframes wedge-beckon {
  0%,
  14%,
  100% {
    opacity: 0;
  }
  6% {
    opacity: 0.3;
  }
}

.hold-ring {
  stroke-width: 3;
  stroke-linecap: round;
  transform: rotate(-90deg);
  transform-box: view-box;
  transform-origin: 0 0;
  transition: stroke-dashoffset 80ms linear;
}

.key-chip {
  padding: 0;
  min-height: 0;
  width: 15cqi;
  height: 13cqi;
  /* One step from the wedge underneath instead of PrimeVue's green-tinted text
   * hover. Tinting with the text colour darkens in light mode and lightens in
   * dark mode, and works on any wedge colour (idle, selected, explored) */
  --p-button-text-primary-hover-background: color-mix(
    in srgb,
    var(--p-text-color) 7%,
    transparent
  );
  --p-button-text-primary-active-background: color-mix(
    in srgb,
    var(--p-text-color) 12%,
    transparent
  );
}

.key-chip-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1.1;
  color: var(--p-text-color);
}

.key-name {
  font-size: 5cqi;
  font-weight: 700;
}

.key-name.is-compact {
  font-size: 3.4cqi;
}

.key-count {
  font-size: 3cqi;
  color: var(--p-text-muted-color);
}

.minor-label {
  font-size: 3.6cqi;
  color: var(--p-text-muted-color);
}

@media (prefers-reduced-motion: reduce) {
  .wedge,
  .star,
  .star.is-visible {
    transition: none;
  }

  .wedge.beckon {
    animation: none;
  }
}
</style>
