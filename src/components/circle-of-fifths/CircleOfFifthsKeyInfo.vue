<script setup lang="ts">
import { CIRCLE_KEYS } from './circleOfFifths'

/* Roman numerals of the I – IV – V – I cadence, in play order */
const CADENCE_NUMERALS = ['I', 'IV', 'V', 'I'] as const

const { keyIndex, chordIndex = -1 } = defineProps<{
  keyIndex: number | null
  chordIndex?: number
}>()

const { t } = useI18n()

const key = computed(() =>
  keyIndex === null ? null : (CIRCLE_KEYS[keyIndex] ?? null),
)
</script>

<template>
  <p v-if="!key" class="text-[3.6cqi] text-(--p-text-muted-color)">
    {{ t('circleOfFifths.tapAKey') }}
  </p>
  <div
    v-else
    class="flex flex-col items-center gap-[0.6cqi] leading-tight"
    data-testid="circle-key-info"
  >
    <span class="text-[7cqi] font-bold">
      {{ key.label }}
      <span
        v-if="chordIndex >= 0"
        class="text-[4cqi] text-(--p-primary-color)"
        >{{ CADENCE_NUMERALS[chordIndex] }}</span
      >
    </span>
    <span class="text-[3.2cqi] text-(--p-text-muted-color)">{{
      key.signatureNotes.length > 0
        ? key.signatureNotes.join(' ')
        : t('circleOfFifths.noAccidentals')
    }}</span>
    <span class="text-[3.2cqi] text-(--p-purple-500)">{{
      t('circleOfFifths.relativeMinor', { key: key.minorLabel })
    }}</span>
  </div>
</template>
