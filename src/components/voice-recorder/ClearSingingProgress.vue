<script setup lang="ts">
type Props = {
  /* Clear singing heard so far, in whole seconds towards the target. */
  seconds: number
  targetSeconds: number
}

const props = defineProps<Props>()

const { t } = useI18n()

const isReady = computed(() => props.seconds >= props.targetSeconds)
const progressPercent = computed(
  () => Math.min(1, props.seconds / props.targetSeconds) * 100,
)
</script>

<template>
  <span
    class="flex items-center gap-2 text-sm text-(--p-text-muted-color) tabular-nums"
    data-testid="recorder-clear-singing"
    :data-ready="isReady"
  >
    <i
      v-if="isReady"
      class="pi pi-check text-(--p-green-500)"
      aria-hidden="true"
    />
    <span
      v-else
      class="size-3.5 rounded-full"
      :style="{
        background: `conic-gradient(var(--p-primary-color) ${progressPercent}%, var(--p-content-border-color) 0)`,
      }"
      aria-hidden="true"
    />
    <span data-testid="recorder-clear-singing-text">
      {{
        isReady
          ? t('voiceRecorder.clearSinging.ready')
          : t('voiceRecorder.clearSinging.progress', {
              heard: seconds,
              seconds: targetSeconds,
            })
      }}
    </span>
    <!-- Announced once, on reaching the target: a per-second count would talk over the singing. -->
    <span role="status" class="sr-only">
      {{ isReady ? t('voiceRecorder.clearSinging.ready') : '' }}
    </span>
  </span>
</template>
