<script setup lang="ts">
import { useFullscreen } from '@vueuse/core'

const { t } = useI18n()
const { isSupported, isFullscreen, toggle } = useFullscreen()
const isInstalledPwa = useIsInstalledPwa()
const { state: microphonePermissionState } = useMicrophonePermission()
</script>

<template>
  <PrimeButton
    v-if="
      isSupported && !isInstalledPwa && microphonePermissionState === 'granted'
    "
    :aria-label="t('generic.toggleFullscreen')"
    :title="t('generic.toggleFullscreen')"
    :aria-pressed="isFullscreen"
    outlined
    size="small"
    severity="secondary"
    @click="toggle"
  >
    <span class="inline-flex items-center gap-2">
      <i
        :class="
          isFullscreen ? 'pi pi-window-minimize' : 'pi pi-window-maximize'
        "
      />
      <span class="hidden text-sm md:inline">{{
        t('generic.fullscreen')
      }}</span>
    </span>
  </PrimeButton>
</template>
