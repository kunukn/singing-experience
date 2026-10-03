<script setup lang="ts">
import {
  pianoNoteBlockSpan,
  type PianoLayout,
} from '@/components/piano/pianoLayout'
import {
  BURST_LIFETIME_MS,
  buildSparks,
  buildStreamSparks,
  FLARE_SCALE_PER_TIER,
  FLASH_DURATION_MS,
  FLASH_PEAK_OPACITY_PER_TIER,
  newlyCollectedIndices,
  streakEndingAt,
  streakTier,
  tierValue,
  type Spark,
} from './singTheKeysHitEffects'
import type { TimelineNote } from './singTheKeysTimeline'

/*
 * Light where a collected note meets the keys, the way a piano tutorial lights
 * the hit line. Two layers over the lane, both anchored on the line at the
 * note's key:
 *
 * - a burst, once, the moment a note is collected: the flare pops, a ring
 *   widens off the line and sparks fly, bigger the longer the run of hits;
 * - for the rest of that note, a flare that keeps flickering and a lighter
 *   stream of sparks, lit only while the singer stays on pitch.
 *
 * The flare is small and hot rather than a soft glow: on the light lane
 * surface a wide halo reads as a stain, and white light only shows over the
 * block, the hit line and the keys. Its layers move on unrelated periods so it
 * never settles into a loop the eye can pick out.
 *
 * Everything animates transform and opacity only, so it runs on the compositor
 * while pitch detection has the main thread. The lane re-renders every frame;
 * none of these props change per frame, so this component does not.
 */
type Props = {
  notes: TimelineNote[]
  layout: PianoLayout
  laneHeight: number
  activeNoteIndex: number | null
  correctNoteIndices: number[]
  /* Notes are only collected during a run. The lane's collected set also
   * empties when idle and stays filled on the result screen, and neither of
   * those may fire a burst. */
  isPlaying: boolean
  /* The singer is within scoring tolerance of the due note. */
  isOnPitch: boolean
}

const props = defineProps<Props>()

type Burst = {
  id: number
  noteIndex: number
  midi: number
  tier: number
  sparks: Spark[]
}

/* px — the hit line is 2px tall with its top at laneHeight − 2, so its centre
 * is 1px above the lane's bottom. */
const HIT_LINE_CENTER_OFFSET_PX = 1

/* px — the flare's diameter: about one key. Fixed rather than tied to the
 * block width, because the half below the hit line has to fade out inside the
 * 28px label band whatever the keyboard's zoom. */
const FLARE_SIZE_PX = 56

/* px — the white-hot core, a flat ellipse lying on the hit line. */
const CORE_WIDTH_PX = 34
const CORE_HEIGHT_PX = 18

/* The streak along the hit line, in note blocks: it reaches a little past the
 * block on both sides. */
const STREAK_WIDTH_BLOCKS = 1.6
const STREAK_HEIGHT_PX = 3

const SPARK_SIZE_PX = 5

/* px — the ring sent out at collection: it starts the size of the flare and a
 * line this thick, the thinnest that still reads on the light lane surface. */
const RING_SIZE_PX = FLARE_SIZE_PX
const RING_WIDTH_PX = 3

/* ms — the two ray layers turn against each other at unrelated speeds, so the
 * spikes cross and shimmer instead of spinning like a wheel. The core and
 * streak flicker faster, on periods that share no common beat with each other
 * or the rays. */
const RAYS_TURN_MS = 7000
const RAYS_COUNTER_TURN_MS = 4300
const CORE_PULSE_MS = 190
const STREAK_FLICKER_MS = 270

/* ms — the held flare comes up fast when the singer finds the pitch again and
 * lets go slowly: with the ease-in curve below, a vibrato dip of a few frames
 * barely moves it, so the light breathes instead of strobing. */
const SUSTAIN_FADE_IN_MS = 90
const SUSTAIN_FADE_OUT_MS = 280

const flareSize = `${FLARE_SIZE_PX}px`
const coreWidth = `${CORE_WIDTH_PX}px`
const coreHeight = `${CORE_HEIGHT_PX}px`
const streakHeight = `${STREAK_HEIGHT_PX}px`
const sparkSize = `${SPARK_SIZE_PX}px`
const ringSize = `${RING_SIZE_PX}px`
const ringWidth = `${RING_WIDTH_PX}px`
const raysTurn = `${RAYS_TURN_MS}ms`
const raysCounterTurn = `${RAYS_COUNTER_TURN_MS}ms`
const corePulse = `${CORE_PULSE_MS}ms`
const streakFlicker = `${STREAK_FLICKER_MS}ms`
const flashDuration = `${FLASH_DURATION_MS}ms`
const sustainFadeIn = `${SUSTAIN_FADE_IN_MS}ms`
const sustainFadeOut = `${SUSTAIN_FADE_OUT_MS}ms`

const correctSet = computed(() => new Set(props.correctNoteIndices))

function tierAt(correct: ReadonlySet<number>, noteIndex: number) {
  return streakTier(streakEndingAt(correct, noteIndex))
}

function anchorStyle(midi: number, tier: number) {
  const span = pianoNoteBlockSpan(props.layout, midi)

  return {
    insetInlineStart: `${span.leftPx + span.widthPx / 2}px`,
    top: `${props.laneHeight - HIT_LINE_CENTER_OFFSET_PX}px`,
    '--hit-streak-width': `${span.widthPx * STREAK_WIDTH_BLOCKS}px`,
    '--hit-scale': tierValue(FLARE_SCALE_PER_TIER, tier),
    '--hit-peak': tierValue(FLASH_PEAK_OPACITY_PER_TIER, tier),
  }
}

function sparkStyle(spark: Spark) {
  return {
    '--spark-from-x': `${spark.fromXPx}px`,
    '--spark-to-x': `${spark.toXPx}px`,
    '--spark-to-y': `${spark.toYPx}px`,
    '--spark-delay': `${spark.delayMs}ms`,
    '--spark-duration': `${spark.durationMs}ms`,
  }
}

/* The light of the note being sung, once it is collected. Keyed by note, so
 * when the next note comes due this one fades out where it is rather than
 * jumping to the new key. */
const sustain = computed(() => {
  const noteIndex = props.activeNoteIndex
  if (!props.isPlaying || noteIndex === null) return null

  if (!correctSet.value.has(noteIndex)) return null

  const note = props.notes.find((candidate) => candidate.index === noteIndex)
  if (!note) return null

  const tier = tierAt(correctSet.value, noteIndex)

  return {
    noteIndex,
    midi: note.midi,
    tier,
    sparks: buildStreamSparks(
      noteIndex,
      tier,
      pianoNoteBlockSpan(props.layout, note.midi).widthPx,
    ),
  }
})

const bursts = ref<Burst[]>([])
const removalTimers = new Set<ReturnType<typeof setTimeout>>()
let nextBurstId = 0

function spawnBurst(note: TimelineNote, tier: number) {
  const id = nextBurstId
  nextBurstId += 1
  const spreadPx = pianoNoteBlockSpan(props.layout, note.midi).widthPx
  bursts.value.push({
    id,
    noteIndex: note.index,
    midi: note.midi,
    tier,
    sparks: buildSparks(note.index, tier, spreadPx),
  })

  /* A timer rather than animationend: with reduced motion nothing animates, so
   * that event would never come and the burst would never be removed. */
  const timer = setTimeout(() => {
    removalTimers.delete(timer)
    bursts.value = bursts.value.filter((burst) => burst.id !== id)
  }, BURST_LIFETIME_MS)
  removalTimers.add(timer)
}

/* A burst is placed from the collected note itself, never from the due note:
 * scoring and the game clock tick in separate frames, so by the time the new
 * index shows up here the due note may already be the next one. Bursts in
 * flight when a run stops are left to finish. */
watch(
  () => props.correctNoteIndices,
  (current, previous) => {
    if (!props.isPlaying) return

    const correct = new Set(current)
    for (const noteIndex of newlyCollectedIndices(previous, current)) {
      const note = props.notes.find(
        (candidate) => candidate.index === noteIndex,
      )
      if (note) spawnBurst(note, tierAt(correct, noteIndex))
    }
  },
)

onUnmounted(() => {
  for (const timer of removalTimers) clearTimeout(timer)
  removalTimers.clear()
})
</script>

<template>
  <!-- Above the blocks, sung line and hit line within the lane's own stacking
       context. The halo and sparks are a shade darker on the light lane
       surface than on the dark one, so they keep their contrast in both
       themes. -->
  <div
    class="pointer-events-none absolute inset-0 z-30 [--hit-halo:var(--p-green-500)] [--hit-spark:var(--p-green-600)] dark:[--hit-halo:var(--p-green-400)] dark:[--hit-spark:var(--p-green-300)]"
    aria-hidden="true"
    data-testid="sing-the-keys-hit-glow"
  >
    <Transition
      leaveActiveClass="transition-opacity duration-200 ease-out motion-reduce:transition-none"
      leaveToClass="opacity-0"
    >
      <div
        v-if="sustain"
        :key="sustain.noteIndex"
        class="hit-sustain absolute size-0"
        :style="anchorStyle(sustain.midi, sustain.tier)"
        data-testid="sing-the-keys-hit-sustain"
        :data-note-index="sustain.noteIndex"
        :data-tier="sustain.tier"
        :data-held="isOnPitch"
      >
        <div class="hit-flare">
          <div class="hit-halo" />
          <div class="hit-rays" />
          <div class="hit-rays hit-rays-counter" />
          <div class="hit-streak" />
          <div class="hit-core" />
        </div>
        <div class="hit-stream">
          <span
            v-for="(spark, sparkIndex) in sustain.sparks"
            :key="sparkIndex"
            class="hit-spark hit-spark-looping"
            :style="sparkStyle(spark)"
            data-testid="sing-the-keys-hit-stream-spark"
          />
        </div>
      </div>
    </Transition>

    <div
      v-for="burst in bursts"
      :key="burst.id"
      class="absolute size-0"
      :style="anchorStyle(burst.midi, burst.tier)"
      data-testid="sing-the-keys-hit-burst"
      :data-note-index="burst.noteIndex"
      :data-tier="burst.tier"
    >
      <div class="hit-ring" data-testid="sing-the-keys-hit-ring" />
      <div class="hit-flare hit-pop">
        <div class="hit-halo" />
        <div class="hit-rays" />
        <div class="hit-core" />
      </div>
      <span
        v-for="(spark, sparkIndex) in burst.sparks"
        :key="sparkIndex"
        class="hit-spark"
        :style="sparkStyle(spark)"
        data-testid="sing-the-keys-hit-spark"
      />
    </div>
  </div>
</template>

<style scoped>
/* A point on the hit line; every layer below centres itself on it. */
.hit-flare {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 0;
  width: 0;
  height: 0;
  transform: scale(var(--hit-scale));
}

.hit-halo,
.hit-rays,
.hit-streak,
.hit-core {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 0;
}

/* The only coloured layer: a tight green ground for the white light to sit
 * on, so the flare still has an edge where the surface under it is white. */
.hit-halo {
  width: v-bind(flareSize);
  height: v-bind(flareSize);
  margin-block-start: calc(v-bind(flareSize) / -2);
  margin-inline-start: calc(v-bind(flareSize) / -2);
  border-radius: 50%;
  background: radial-gradient(
    closest-side,
    color-mix(in srgb, var(--hit-halo) 75%, transparent) 0%,
    color-mix(in srgb, var(--hit-halo) 40%, transparent) 45%,
    transparent 85%
  );
}

/* Spikes of light: thin wedges at uneven angles and of uneven width, so they
 * look struck rather than drawn, masked to fade out before the edge. */
.hit-rays {
  width: v-bind(flareSize);
  height: v-bind(flareSize);
  margin-block-start: calc(v-bind(flareSize) / -2);
  margin-inline-start: calc(v-bind(flareSize) / -2);
  border-radius: 50%;
  background: conic-gradient(
    from 0deg,
    transparent 0deg,
    var(--p-surface-0) 5deg,
    transparent 12deg,
    transparent 44deg,
    var(--p-surface-0) 49deg,
    transparent 53deg,
    transparent 97deg,
    var(--p-surface-0) 105deg,
    transparent 115deg,
    transparent 161deg,
    var(--p-surface-0) 165deg,
    transparent 170deg,
    transparent 214deg,
    var(--p-surface-0) 221deg,
    transparent 229deg,
    transparent 278deg,
    var(--p-surface-0) 283deg,
    transparent 287deg,
    transparent 322deg,
    var(--p-surface-0) 329deg,
    transparent 337deg,
    transparent 360deg
  );
  -webkit-mask-image: radial-gradient(
    closest-side,
    #000 0%,
    #000 20%,
    transparent 85%
  );
  mask-image: radial-gradient(closest-side, #000 0%, #000 20%, transparent 85%);
  animation: hit-turn v-bind(raysTurn) linear infinite;
}

/* The same spikes again, started a third of a turn round, fainter and turning
 * the other way: where the two sets cross, the light flares. */
.hit-rays-counter {
  opacity: 0.6;
  animation: hit-turn-counter v-bind(raysCounterTurn) linear infinite;
}

@keyframes hit-turn {
  to {
    transform: rotate(360deg);
  }
}

@keyframes hit-turn-counter {
  from {
    transform: rotate(120deg);
  }
  to {
    transform: rotate(-240deg);
  }
}

/* A lens streak lying along the hit line, reaching past the block. */
.hit-streak {
  width: var(--hit-streak-width);
  height: v-bind(streakHeight);
  margin-block-start: calc(v-bind(streakHeight) / -2);
  margin-inline-start: calc(var(--hit-streak-width) / -2);
  border-radius: 50%;
  background: linear-gradient(
    to right,
    transparent,
    var(--p-surface-0) 50%,
    transparent
  );
  animation: hit-streak v-bind(streakFlicker) ease-in-out infinite alternate;
}

@keyframes hit-streak {
  from {
    transform: scaleX(0.7);
    opacity: 0.7;
  }
  to {
    transform: scaleX(1);
    opacity: 1;
  }
}

/* White hot in the middle, on top of everything else. */
.hit-core {
  width: v-bind(coreWidth);
  height: v-bind(coreHeight);
  margin-block-start: calc(v-bind(coreHeight) / -2);
  margin-inline-start: calc(v-bind(coreWidth) / -2);
  border-radius: 50%;
  background: radial-gradient(
    closest-side,
    var(--p-surface-0) 0%,
    var(--p-surface-0) 35%,
    color-mix(in srgb, var(--p-surface-0) 50%, transparent) 65%,
    transparent 100%
  );
  animation: hit-core v-bind(corePulse) ease-in-out infinite alternate;
}

@keyframes hit-core {
  from {
    transform: scale(0.9);
    opacity: 0.85;
  }
  to {
    transform: scale(1.1);
    opacity: 1;
  }
}

/* Letting go eases in (slow start), finding the pitch again eases out. */
.hit-sustain .hit-flare,
.hit-sustain .hit-stream {
  opacity: 0;
  transition: opacity v-bind(sustainFadeOut) cubic-bezier(0.4, 0, 1, 1);
}

.hit-sustain[data-held='true'] .hit-flare,
.hit-sustain[data-held='true'] .hit-stream {
  opacity: 1;
  transition: opacity v-bind(sustainFadeIn) ease-out;
}

/* The flare at the moment of collection: it swells from under half size to one
 * and a half while fading, peaking early (20%) and then letting go. */
@keyframes hit-pop {
  0% {
    transform: scale(calc(var(--hit-scale) * 0.4));
    opacity: 0;
  }
  20% {
    opacity: var(--hit-peak);
  }
  100% {
    transform: scale(calc(var(--hit-scale) * 1.5));
    opacity: 0;
  }
}

.hit-pop {
  animation: hit-pop v-bind(flashDuration) ease-out both;
}

/* A shockwave off the hit line at the moment of collection: a ring that widens
 * from a third of its size to nearly double while it fades. Only its upper
 * half is drawn, so it rises into the lane and nothing spreads down over the
 * keys. Green, not white: white light does not show on the light lane. */
.hit-ring {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 0;
  width: v-bind(ringSize);
  height: v-bind(ringSize);
  margin-block-start: calc(v-bind(ringSize) / -2);
  margin-inline-start: calc(v-bind(ringSize) / -2);
  border: v-bind(ringWidth) solid var(--hit-halo);
  border-radius: 50%;
  clip-path: inset(0 0 50% 0);
  animation: hit-ring v-bind(flashDuration) ease-out both;
}

@keyframes hit-ring {
  0% {
    transform: scale(calc(var(--hit-scale) * 0.3));
    opacity: var(--hit-peak);
  }
  100% {
    transform: scale(calc(var(--hit-scale) * 1.8));
    opacity: 0;
  }
}

/* One keyframe for every spark; each element's own custom properties say where
 * it starts, where it ends, how long it flies and how long it waits. */
@keyframes hit-spark {
  0% {
    transform: translate(var(--spark-from-x), 0) scale(1);
    opacity: 0;
  }
  15% {
    opacity: 1;
  }
  100% {
    transform: translate(var(--spark-to-x), var(--spark-to-y)) scale(0.3);
    opacity: 0;
  }
}

/* Fast off the line, then slowing as it rises, like something thrown. */
.hit-spark {
  position: absolute;
  inset-block-start: calc(v-bind(sparkSize) / -2);
  inset-inline-start: calc(v-bind(sparkSize) / -2);
  width: v-bind(sparkSize);
  height: v-bind(sparkSize);
  border-radius: 50%;
  background: var(--hit-spark);
  animation: hit-spark var(--spark-duration) cubic-bezier(0.15, 0.6, 0.3, 1)
    var(--spark-delay) both;
}

.hit-spark-looping {
  animation-iteration-count: infinite;
}

/* No movement: the burst and the stream are dropped, the flare holds still and
 * switches on and off without a fade. */
@media (prefers-reduced-motion: reduce) {
  .hit-pop,
  .hit-ring,
  .hit-spark {
    display: none;
  }

  .hit-rays,
  .hit-streak,
  .hit-core {
    animation: none;
  }

  /* Both states, so this outweighs the held rule's own transition. */
  .hit-sustain .hit-flare,
  .hit-sustain[data-held='true'] .hit-flare {
    transition: none;
  }
}
</style>
