<script setup lang="ts">
import { toAccidentalGlyph } from '@/utils/noteUtils'
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
    :class="{ 'text-(--p-text-muted-color) opacity-30': !props.isClean }"
  >
    <div v-if="props.isClean">
      <span class="text-5xl font-bold tracking-tight sm:text-7xl">
        {{ toAccidentalGlyph(props.note) }}
      </span>
      <span class="mt-1 inline-block align-top text-2xl font-light sm:text-4xl">
        {{ props.octave }}
      </span>
    </div>
    <span class="mt-1 text-xs text-(--p-text-muted-color) tabular-nums">
      {{ Math.round(props.frequency) }}
      {{ t('generic.hz') }}
    </span>
  </div>
</template>
