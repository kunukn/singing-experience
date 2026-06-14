<script setup lang="ts">
import type { Difficulty } from './singFlyOptions'
import SingFlySettingsRow from './SingFlySettingsRow.vue'

type Props = {
  micPermission: PermissionState | null
  error: string | null
}

defineProps<Props>()

const emit = defineEmits<{
  start: []
}>()

const rangeIndex = defineModel<number>('rangeIndex', { required: true })
const isPreviewEnabled = defineModel<boolean>('isPreviewEnabled', {
  required: true,
})
const gameDurationSec = defineModel<number>('gameDurationSec', {
  required: true,
})
const difficulty = defineModel<Difficulty>('difficulty', { required: true })

const { t } = useI18n()
</script>

<template>
  <div class="flex w-full flex-col items-center gap-4">
    <SingFlySettingsRow
      v-model:gameDurationSec="gameDurationSec"
      v-model:difficulty="difficulty"
      v-model:rangeIndex="rangeIndex"
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

      <ToggleIconButton
        v-model="isPreviewEnabled"
        iconOn="pi pi-microphone"
        iconOff="pi pi-microphone"
        :label="t('generic.previewSoundLabel')"
        :disabled="micPermission === 'denied'"
      />
    </div>

    <p v-if="error" class="text-sm text-(--p-red-400)">{{ error }}</p>
  </div>
</template>
