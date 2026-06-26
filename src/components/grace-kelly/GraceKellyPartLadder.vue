<script setup lang="ts">
import { VOZ_LABEL_KEYS } from './graceKellyConstants'

type Props = {
  /* True while a sequence plays or is paused — the toggles lock so the running
   * timeline can't change underneath it. */
  isRunning: boolean
}

const props = defineProps<Props>()

/* Voices to play and show, by VOZ_MELODIES index, kept sorted ascending. */
const selectedVozIndices = defineModel<number[]>('selectedVozIndices', {
  required: true,
})

const { t } = useI18n()

/* One row per voice in natural (ascending) VOZ_MELODIES index order — Melody (0)
 * at the top down to Low (5) — so the ladder reads top→bottom in the same order
 * as the stacked sheets below (GraceKellyAllSheets renders ascending vozIndex). */
const partRows = computed(() =>
  VOZ_LABEL_KEYS.map((key, index) => ({
    index,
    label: t(`graceKelly.vozLabels.${key}`),
  })),
)

function isSelected(index: number) {
  return selectedVozIndices.value.includes(index)
}

function toggle(index: number, enabled: boolean) {
  const next = enabled
    ? [...selectedVozIndices.value, index]
    : selectedVozIndices.value.filter((value) => value !== index)

  selectedVozIndices.value = [...new Set(next)].sort((a, b) => a - b)
}
</script>

<template>
  <div class="mx-auto flex w-full max-w-72 flex-col">
    <label
      v-for="part in partRows"
      :key="part.index"
      class="ladder-row"
      :class="{ selected: isSelected(part.index), disabled: props.isRunning }"
    >
      <PrimeToggleSwitch
        :modelValue="isSelected(part.index)"
        :disabled="props.isRunning"
        @update:modelValue="(value: boolean) => toggle(part.index, value)"
      />
      <span class="flex-1 text-start">{{ part.label }}</span>
    </label>
  </div>
</template>

<style scoped>
@reference '@/style.css';

.ladder-row {
  @apply flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm;
  @apply text-(--p-text-muted-color) transition-colors;
}

/* Selected rows light up: a faint primary tint and full-strength text so the
 * chosen voices stand out from the dimmed, unselected ones. */
.ladder-row.selected {
  @apply bg-(--p-primary-color)/10 text-(--p-text-color);
}

.ladder-row.disabled {
  @apply cursor-not-allowed opacity-60;
}
</style>
