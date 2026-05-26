<script setup lang="ts">
type Props = {
  score: number
  totalTargets: number
  elapsedSeconds: string
}

defineProps<Props>()

const emit = defineEmits<{
  stop: []
}>()

const { t } = useI18n()
</script>

<template>
  <div class="flex flex-col items-center gap-2">
    <PrimeButton
      class="min-w-24"
      severity="danger"
      size="small"
      rounded
      @click="emit('stop')"
    >
      {{ t('generic.stop') }}
    </PrimeButton>
    <p class="text-lg font-medium text-(--p-text-color)">
      {{ t('generic.score') }}
      <span class="font-mono tabular-nums"
        >{{ score }} / {{ totalTargets }}</span
      >
    </p>
    <p
      class="min-w-20 text-end font-mono text-lg text-(--p-text-muted-color) tabular-nums"
    >
      ⏱ {{ elapsedSeconds }}s
    </p>
  </div>
</template>
