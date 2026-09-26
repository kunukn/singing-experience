<script setup lang="ts">
import type { AccidentalStyle } from '@/composables/accidentalStyle'
import { midiToNoteLabel, START_TONE_GROUPS } from '@/utils/noteUtils'
import {
  DEFAULT_RANGE_OFFSET,
  sungMidiRange,
  tonicMidiForRange,
  type Song,
} from './singTheKeysSongs'

/* Picks where the song sits in the voice. Each option reads as the song's
 * lowest–highest sung note, so the singer sees what they will have to reach;
 * the value is the range offset tonicMidiForRange turns into a tonic. Built on
 * the start-tone options, so the voice-tier groups and the high-to-low order
 * (by range midpoint) come with them. */
type Props = {
  song: Song
  accidentalStyle: AccidentalStyle
  disabled?: boolean
}

const props = defineProps<Props>()

const rangeOffset = defineModel<number>('rangeOffset', { required: true })

const { t } = useI18n()

const rangeGroups = computed(() => {
  const preferFlats = props.accidentalStyle === 'flat'
  const noteLabel = (midi: number) =>
    midiToNoteLabel(midi, { preferFlats }).label

  return START_TONE_GROUPS.map((group) => ({
    voiceTier: group.voiceTier,
    items: group.items.map(({ offset }) => {
      const { lowestMidi, highestMidi } = sungMidiRange(
        props.song,
        tonicMidiForRange(props.song, offset),
      )

      return {
        offset,
        label: `${noteLabel(lowestMidi)} – ${noteLabel(highestMidi)}`,
      }
    }),
  }))
})
</script>

<template>
  <PrimeSelect
    v-model="rangeOffset"
    :options="rangeGroups"
    optionLabel="label"
    optionValue="offset"
    optionGroupLabel="voiceTier"
    optionGroupChildren="items"
    size="small"
    scrollHeight="370px"
    :disabled="props.disabled"
    :ariaLabel="t('singTheKeys.songRange')"
  >
    <template #header>
      <div class="p-3 text-sm font-medium">
        {{ t('singTheKeys.pickRangeHeader') }}
      </div>
    </template>
    <template #optiongroup="{ index, option }">
      <div
        class="song-range-option-group flex items-center"
        :class="{ 'mt-4': index !== 0 }"
      >
        {{ t(`doReMi.voiceTier.${option.voiceTier}`) }}
      </div>
    </template>
    <template #option="{ option }">
      <div class="flex items-center font-medium">
        <span dir="ltr">{{ option.label }}</span>
        <span v-if="option.offset === DEFAULT_RANGE_OFFSET" class="ms-1"
          >⭐</span
        >
      </div>
    </template>
    <template #footer>
      <div class="p-3 text-xs text-(--p-text-muted-color)">
        {{ t('singTheKeys.pickRangeFooter') }}
      </div>
    </template>
  </PrimeSelect>
</template>

<style scoped>
.song-range-option-group {
  color: var(--p-primary-color);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
</style>
