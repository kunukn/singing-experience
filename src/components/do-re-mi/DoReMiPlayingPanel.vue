<script setup lang="ts">
type Props = {
  elapsedSeconds: string
}

defineProps<Props>()

const emit = defineEmits<{
  stop: []
}>()

const { t } = useI18n()
</script>

<template>
  <div class="flex flex-col items-center gap-2 sm:mb-4">
    <PrimeButton
      class="min-w-24"
      severity="danger"
      size="small"
      rounded
      @click="emit('stop')"
    >
      {{ t('generic.stop') }}
    </PrimeButton>
    <p
      class="min-w-20 text-end font-mono text-lg text-(--p-text-muted-color) tabular-nums"
    >
      ⏱ {{ elapsedSeconds }}s
    </p>
  </div>
</template>
