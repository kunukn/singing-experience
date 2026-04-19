<script setup lang="ts">
import { textColorAtMidi } from '@/utils/pitchColors'

type Props = {
  note: string
  octave: number
  midiNote: number
  frequency: number
  isClean: boolean
}

const props = defineProps<Props>()

const { t } = useI18n()
</script>

<template>
  <div
    class="flex flex-col items-center transition-colors duration-150"
    :style="{
      color: props.isClean ? textColorAtMidi(props.midiNote) : undefined,
    }"
    :class="{ 'text-gray-500 opacity-30': !props.isClean }"
  >
    <div v-if="props.isClean">
      <span class="text-5xl font-bold tracking-tight sm:text-7xl">
        {{ props.note }}
      </span>
      <span class="mt-1 inline-block align-top text-2xl font-light sm:text-4xl">
        {{ props.octave }}
      </span>
    </div>
    <span class="mt-1 text-xs text-gray-400 tabular-nums">
      {{ Math.round(props.frequency) }}
      {{ t('toneDetector.hz') }}
    </span>
  </div>
</template>
