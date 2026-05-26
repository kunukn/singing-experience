<script setup lang="ts">
import type { ScaleMode } from '@/utils/noteUtils'

type Props = {
  isPlayingSequence: boolean
  micPermission: PermissionState | null
  error: string | null
}

defineProps<Props>()

const emit = defineEmits<{
  start: []
  toggleDoReMi: []
}>()

const startOffset = defineModel<number>('startOffset', { required: true })
const scaleMode = defineModel<ScaleMode>('scaleMode', { required: true })
const durationSec = defineModel<number>('durationSec', { required: true })
const isPreviewEnabled = defineModel<boolean>('isPreviewEnabled', {
  required: true,
})
const showDoReMiTarget = defineModel<boolean>('showDoReMiTarget', {
  required: true,
})

const { t } = useI18n()
</script>

<template>
  <div class="flex w-full flex-col items-center gap-4 sm:mb-4">
    <DoReMiSettingsRow
      v-model:startOffset="startOffset"
      v-model:scaleMode="scaleMode"
      v-model:durationSec="durationSec"
    />

    <div class="flex w-full flex-wrap items-center justify-center gap-2">
      <PrimeButton
        class="min-w-24"
        severity="success"
        size="small"
        rounded
        @click="emit('start')"
      >
        {{ t('generic.start') }}
      </PrimeButton>

      <PrimeButton
        class="min-w-24"
        :severity="isPlayingSequence ? 'warn' : 'secondary'"
        size="small"
        rounded
        @click="emit('toggleDoReMi')"
      >
        {{
          isPlayingSequence ? t('generic.muteButton') : t('doReMi.doReMiButton')
        }}
      </PrimeButton>

      <ToggleIconButton
        v-model="isPreviewEnabled"
        iconOn="pi pi-microphone"
        iconOff="pi pi-microphone"
        :label="t('generic.previewSoundLabel')"
        :disabled="micPermission === 'denied'"
      />

      <ToggleIconButton
        v-model="showDoReMiTarget"
        iconOn="pi pi-eye"
        iconOff="pi pi-eye-slash"
        :label="t('generic.showNoteTarget')"
      />
    </div>

    <p v-if="error" class="text-sm text-(--p-red-400)">{{ error }}</p>
  </div>
</template>
