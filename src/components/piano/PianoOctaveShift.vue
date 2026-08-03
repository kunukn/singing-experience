<script setup lang="ts">
type Props = {
  /* The leftmost mapped computer key, in the user's own layout (e.g. "Z"). */
  char: string
  /* The note that key currently plays (e.g. "C3"). */
  noteLabel: string
  canShiftDown: boolean
  canShiftUp: boolean
}
defineProps<Props>()

const emit = defineEmits<{ shift: [direction: -1 | 1] }>()

const { t } = useI18n()
</script>

<template>
  <!-- Forced LTR to match the keyboard below: a piano's low pitch is always on
       the left, so "−" has to stay on that side even in RTL locales. -->
  <div
    class="flex items-center justify-end gap-1"
    dir="ltr"
    data-testid="piano-octave-shift"
  >
    <PrimeButton
      class="min-h-8.75 min-w-8.75"
      severity="secondary"
      rounded
      size="small"
      icon="pi pi-minus"
      :disabled="!canShiftDown"
      :aria-label="t('generic.octaveDown')"
      :title="t('generic.octaveDown')"
      aria-keyshortcuts="-"
      data-testid="piano-octave-down"
      @click="emit('shift', -1)"
    />

    <!-- States the whole convention in four characters: this key plays this
         note. aria-live so a shift is announced, not silently re-rendered. -->
    <span
      class="min-w-16 text-center text-sm text-(--p-text-muted-color) tabular-nums"
      aria-live="polite"
      data-testid="piano-octave-anchor"
    >
      {{ char }} = {{ noteLabel }}
    </span>

    <PrimeButton
      class="min-h-8.75 min-w-8.75"
      severity="secondary"
      rounded
      size="small"
      icon="pi pi-plus"
      :disabled="!canShiftUp"
      :aria-label="t('generic.octaveUp')"
      :title="t('generic.octaveUp')"
      aria-keyshortcuts="+"
      data-testid="piano-octave-up"
      @click="emit('shift', 1)"
    />
  </div>
</template>
