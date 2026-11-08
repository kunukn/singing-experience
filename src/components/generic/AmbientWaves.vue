<script setup lang="ts">
import type { ProgramIconHue } from '@/components/icons/program/programIconHue'
import {
  WAVE_VIEWBOX_HEIGHT,
  WAVE_VIEWBOX_WIDTH,
  wavePath,
} from './ambientWave'

/* Faint drifting sound waves behind the landing and catalogue pages — a calm,
 * pitch-trace-like backdrop. Pure SVG + CSS keyframes on `transform` only, so the
 * compositor runs it without a JS loop; browsers throttle it in hidden tabs. */

interface Wave {
  hue: ProgramIconHue
  periods: number
  amplitude: number
  top: string
  driftSeconds: number
  breathSeconds: number
  reverse?: boolean
}

const waves: Wave[] = [
  {
    hue: 'green',
    periods: 2,
    amplitude: 30,
    top: '22%',
    driftSeconds: 70,
    breathSeconds: 14,
  },
  {
    hue: 'blue',
    periods: 3,
    amplitude: 22,
    top: '52%',
    driftSeconds: 90,
    breathSeconds: 18,
    reverse: true,
  },
  {
    hue: 'orange',
    periods: 5,
    amplitude: 16,
    top: '82%',
    driftSeconds: 60,
    breathSeconds: 11,
  },
]

const viewBox = `0 0 ${WAVE_VIEWBOX_WIDTH} ${WAVE_VIEWBOX_HEIGHT}`

function waveStyle(wave: Wave) {
  return {
    top: wave.top,
    '--wave-light': `var(--p-${wave.hue}-500)`,
    '--wave-dark': `var(--p-${wave.hue}-400)`,
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
      :key="wave.hue"
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
  --wave-color: var(--wave-light);
  --wave-opacity: 0.12;

  position: absolute;
  left: 0;
  width: 100%;
  height: 7.5rem;
  translate: 0 -50%;
  animation: ambient-wave-breath var(--wave-breath) ease-in-out infinite
    alternate;
}

.p-dark .ambient-wave {
  --wave-color: var(--wave-dark);
  --wave-opacity: 0.14;
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
