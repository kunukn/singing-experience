<script setup lang="ts">
import type { ToneMode } from '@/composables/toneEngine'

type RangeOption = {
  label: string
  value: number
}

type Props = {
  rangeOptions: RangeOption[]
  rangeLabel: string
  micPermission: PermissionState | null
  error: string | null
  isPlayingSequence: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  start: []
  toggleSequence: []
}>()

const rangeIndex = defineModel<number>('rangeIndex', { required: true })
const toneMode = defineModel<ToneMode>('toneMode', { required: true })
const isPreviewEnabled = defineModel<boolean>('isPreviewEnabled', {
  required: true,
})
const holdDurationSec = defineModel<number>('holdDurationSec', {
  required: true,
})
const gameDurationSec = defineModel<number>('gameDurationSec', {
  required: true,
})

const { t } = useI18n()
</script>

<template>
  <div class="flex w-full flex-col items-center gap-4">
    <PitchGameSettingsRow
      v-model:holdDurationSec="holdDurationSec"
      v-model:gameDurationSec="gameDurationSec"
      v-model:rangeIndex="rangeIndex"
      v-model:toneMode="toneMode"
      :rangeOptions="rangeOptions"
      :rangeLabel="rangeLabel"
    />

    <div class="flex w-full flex-wrap items-center justify-center gap-2">
      <PrimeButton
        class="min-w-20"
        severity="success"
        size="small"
        rounded
        @click="emit('start')"
      >
        {{ t('generic.start') }}
      </PrimeButton>

      <PrimeButton
        class="min-w-20"
        :class="{ 'toggle-sequence-idle': !isPlayingSequence }"
        :severity="isPlayingSequence ? 'warn' : 'secondary'"
        size="small"
        rounded
        @click="emit('toggleSequence')"
      >
        {{ isPlayingSequence ? $t('generic.muteButton') : '♪' }}
      </PrimeButton>

      <PreviewToggle
        v-model="isPreviewEnabled"
        :disabled="micPermission === 'denied'"
      />
    </div>

    <p v-if="error" class="text-sm text-(--p-red-400)">{{ error }}</p>
  </div>
</template>

<style scoped lang="css">
.toggle-sequence-idle {
  padding-block: 0;
  font-size: 1.2rem;
}
</style>
