<script setup lang="ts">
import { directionalTextColor } from '@/utils/pitchColors'
import {
  WAVE_VIEWBOX_HEIGHT,
  WAVE_VIEWBOX_WIDTH,
  wavePath,
} from './ambientWave'

/* Faint drifting sound waves behind the landing and catalogue pages — a calm,
 * pitch-trace-like backdrop. Pure SVG + CSS keyframes on `transform` only, so the
 * compositor runs it without a JS loop; browsers throttle it in hidden tabs. */

interface Wave {
  /* Pitch offset the wave stands for; its colour comes from the app's pitch
   * palette (design-rules.md "Pitch Colours"), never a hardcoded hue. */
  cents: number
  periods: number
  amplitude: number
  top: string
  driftSeconds: number
  breathSeconds: number
  reverse?: boolean
}

/* Stacked like the app's pitch colours: sharp on top, clean in the middle,
 * flat at the bottom. ±35¢ sits halfway along each off-pitch ramp, so sharp
 * reads orange (between yellow and red) and flat a mid-deep blue. Higher
 * waves are also busier — more periods — the way a higher pitch is a faster
 * wave. The middle wave drifts the other way so neighbours never move in
 * lockstep. */
const waves: Wave[] = [
  {
    cents: 35,
    periods: 5,
    amplitude: 16,
    top: '22%',
    driftSeconds: 60,
    breathSeconds: 11,
  },
  {
    cents: 0,
    periods: 3,
    amplitude: 22,
    top: '52%',
    driftSeconds: 90,
    breathSeconds: 18,
    reverse: true,
  },
  {
    cents: -35,
    periods: 2,
    amplitude: 30,
    top: '82%',
    driftSeconds: 70,
    breathSeconds: 14,
  },
]

const viewBox = `0 0 ${WAVE_VIEWBOX_WIDTH} ${WAVE_VIEWBOX_HEIGHT}`

const { isDark } = useDarkMode()

function waveStyle(wave: Wave) {
  return {
    top: wave.top,
    '--wave-color': directionalTextColor(wave.cents, isDark.value),
    '--wave-drift': `${wave.driftSeconds}s`,
    '--wave-breath': `${wave.breathSeconds}s`,
    '--wave-direction': wave.reverse ? 'reverse' : 'normal',
  }
}
</script>

<template>
  <div
    aria-hidden="true"
    data-testid="ambient-waves"
    class="ambient-waves pointer-events-none fixed inset-0 -z-10 overflow-hidden"
  >
    <div
      v-for="wave in waves"
      :key="wave.cents"
      class="ambient-wave"
      :style="waveStyle(wave)"
    >
      <svg
        class="ambient-wave-svg"
        :viewBox
        preserveAspectRatio="none"
        fill="none"
      >
        <path :d="wavePath(wave.periods, wave.amplitude)" />
      </svg>
    </div>
  </div>
</template>

<style lang="css">
.ambient-wave {
  --wave-opacity: 0.16;

  position: absolute;
  left: 0;
  width: 100%;
  height: 7.5rem;
  translate: 0 -50%;
  animation: ambient-wave-breath var(--wave-breath) ease-in-out infinite
    alternate;
}

.p-dark .ambient-wave {
  --wave-opacity: 0.24;
}

.ambient-wave-svg {
  display: block;
  width: 200%;
  height: 100%;
  animation: ambient-wave-drift var(--wave-drift) linear infinite;
  animation-direction: var(--wave-direction);
}

.ambient-wave-svg path {
  stroke: var(--wave-color);
  stroke-opacity: var(--wave-opacity);
  stroke-width: 2px;
  /* The SVG is stretched by preserveAspectRatio="none"; keep the line 2px anyway */
  vector-effect: non-scaling-stroke;
}

@keyframes ambient-wave-drift {
  to {
    transform: translateX(-50%);
  }
}

@keyframes ambient-wave-breath {
  from {
    scale: 1 0.6;
  }
  to {
    scale: 1 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ambient-wave,
  .ambient-wave-svg {
    animation: none;
  }
}
</style>
