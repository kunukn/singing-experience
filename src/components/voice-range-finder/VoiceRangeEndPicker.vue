<script setup lang="ts">
import { VOICE_RANGE_NOTE_OPTIONS } from './voiceRangeNotes'

type Props = {
  /* Which end of My range this row picks and sings */
  end: 'high' | 'low'
  /* A search is running: singing another end would start a second one */
  disabled?: boolean
}

const props = defineProps<Props>()
const midi = defineModel<number>({ required: true })

const emit = defineEmits<{
  sing: []
}>()

const { t } = useI18n()

/* Spelled out per end rather than built from `end`, so a search for a
 * translation key or a test id still finds it */
const label = computed(() =>
  props.end === 'high'
    ? t('voiceRangeFinder.highest')
    : t('voiceRangeFinder.lowest'),
)
const selectTestId = computed(() =>
  props.end === 'high' ? 'my-range-highest' : 'my-range-lowest',
)
const singTestId = computed(() =>
  props.end === 'high' ? 'my-range-sing-highest' : 'my-range-sing-lowest',
)
</script>

<template>
  <!--
    One row of the parent's label | select | Sing grid, sharing its columns
    through subgrid. Sing sits outside the label, so a tap isn't forwarded to
    the select. It says "Sing" rather than show a mic: the mic icon means "See
    my voice" everywhere else. A filled pill, as in Sing the Keys: text-only,
    it would read as a caption beside the bordered select. The label's me-2
    gives it a wider gap than the parent's gap-x-1, which keeps the pill tight
    to its select so the two read as one control.
  -->
  <div class="col-span-3 grid grid-cols-subgrid items-center">
    <label class="col-span-2 grid grid-cols-subgrid items-center">
      <span class="me-2 text-sm">{{ label }}</span>
      <PrimeSelect
        v-model="midi"
        :options="VOICE_RANGE_NOTE_OPTIONS"
        optionLabel="label"
        optionValue="value"
        size="small"
        scrollHeight="300px"
        class="min-w-24"
        :data-testid="selectTestId"
      />
    </label>
    <PrimeButton
      :label="t('generic.sing')"
      severity="secondary"
      size="small"
      rounded
      :disabled="disabled"
      :aria-label="`${t('generic.sing')}: ${label}`"
      :data-testid="singTestId"
      @click="emit('sing')"
    />
  </div>
</template>
