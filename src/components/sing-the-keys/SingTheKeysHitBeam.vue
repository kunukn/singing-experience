<script setup lang="ts">
/*
 * Light running up a collected block from the hit line, as if the contact
 * point were shining into it. It lives inside the block so the block's own
 * shape clips it, and is pushed back up by however far the block has fallen,
 * which keeps its foot on the hit line while the block moves through.
 *
 * White on the green block, so unlike a glow on the lane surface it reads in
 * the light theme too.
 */
type Props = {
  /* px from the block's top edge down to the hit line: what is left of the
   * note above the line. Changes every frame. */
  hitLineOffsetPx: number
  /* The singer is within scoring tolerance of the note. */
  isHeld: boolean
}

defineProps<Props>()

/* px — how far up the block the light reaches before it has faded out. */
const BEAM_HEIGHT_PX = 120

/* px and ms — the bright bands that travel up the beam: one band per period,
 * and one period travelled per cycle, so the loop has no seam. */
const BAND_PERIOD_PX = 36
const BAND_RISE_MS = 620

/* ms — the same fast-in, slow-out pair as the flare on the hit line, so the
 * two breathe together through a vibrato dip. */
const BEAM_FADE_IN_MS = 90
const BEAM_FADE_OUT_MS = 280

const beamHeight = `${BEAM_HEIGHT_PX}px`
const bandPeriod = `${BAND_PERIOD_PX}px`
const bandRise = `${BAND_RISE_MS}ms`
const beamFadeIn = `${BEAM_FADE_IN_MS}ms`
const beamFadeOut = `${BEAM_FADE_OUT_MS}ms`
</script>

<template>
  <div
    class="hit-beam-clip pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
    aria-hidden="true"
    data-testid="sing-the-keys-hit-beam"
    :data-held="isHeld"
  >
    <div
      class="hit-beam"
      :style="{
        transform: `translateY(${hitLineOffsetPx - BEAM_HEIGHT_PX}px)`,
      }"
    >
      <div class="hit-beam-bands" />
    </div>
  </div>
</template>

<style scoped>
/* Brightest at its foot on the hit line, gone by the top. The mask is here
 * rather than on the moving bands, so the fade stays put while they climb. */
.hit-beam {
  position: absolute;
  inset-block-start: 0;
  inset-inline: 0;
  height: v-bind(beamHeight);
  overflow: hidden;
  -webkit-mask-image: linear-gradient(to top, #000 0%, transparent 100%);
  mask-image: linear-gradient(to top, #000 0%, transparent 100%);
  background: linear-gradient(
    to top,
    color-mix(in srgb, var(--p-surface-0) 75%, transparent) 0%,
    color-mix(in srgb, var(--p-surface-0) 30%, transparent) 35%,
    transparent 100%
  );
  opacity: 0;
  transition: opacity v-bind(beamFadeOut) cubic-bezier(0.4, 0, 1, 1);
}

.hit-beam-clip[data-held='true'] .hit-beam {
  opacity: 1;
  transition: opacity v-bind(beamFadeIn) ease-out;
}

/* Soft bands climbing the beam. One period taller than the beam and started
 * one period down, so the climb can loop without a band popping in. */
.hit-beam-bands {
  position: absolute;
  inset-block-start: 0;
  inset-inline: 0;
  height: calc(100% + v-bind(bandPeriod));
  background: repeating-linear-gradient(
    to top,
    transparent 0,
    color-mix(in srgb, var(--p-surface-0) 45%, transparent)
      calc(v-bind(bandPeriod) * 0.5),
    transparent v-bind(bandPeriod)
  );
  animation: hit-beam-rise v-bind(bandRise) linear infinite;
}

@keyframes hit-beam-rise {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(calc(v-bind(bandPeriod) * -1));
  }
}

/* No movement: the beam stays, the bands stop, and it switches on and off
 * without a fade. */
@media (prefers-reduced-motion: reduce) {
  .hit-beam-bands {
    animation: none;
  }

  .hit-beam,
  .hit-beam-clip[data-held='true'] .hit-beam {
    transition: none;
  }
}
</style>
