<script setup lang="ts">
type Props = {
  showReadout: boolean
  isPlayingSequence: boolean
  hasSamples: boolean
  isReplaying: boolean
  replaySpeed: 1 | 2
}

const props = defineProps<Props>()

const emit = defineEmits<{
  playSequence: []
  toggleReplay: []
  clearRecording: []
  'update:replaySpeed': [speed: 1 | 2]
}>()

function toggleSpeed() {
  if (props.isReplaying) return

  emit('update:replaySpeed', props.replaySpeed === 1 ? 2 : 1)
}

const { t } = useI18n()
</script>

<template>
  <div
    :class="[showReadout ? 'pointer-events-none invisible' : 'visible']"
    class="grid place-items-center [grid-area:1/1]"
  >
    <div class="flex flex-wrap items-center justify-center gap-2 max-xs:w-full">
      <PrimeButton
        v-if="hasSamples"
        data-testid="btn-replay-sound"
        class="max-xs:w-full"
        :severity="isReplaying ? 'danger' : 'success'"
        size="small"
        rounded
        @click="emit('toggleReplay')"
      >
        <!-- The hidden label holds the button's width, so nothing moves under
             the pointer when it turns into Stop -->
        <span class="grid place-items-center">
          <span class="[grid-area:1/1]" :class="{ invisible: isReplaying }">
            {{ t('pitchDetector.replaySound') }}
          </span>
          <span v-if="isReplaying" class="[grid-area:1/1]">
            {{ t('generic.stop') }}
          </span>
        </span>
      </PrimeButton>

      <PrimeButton
        v-if="hasSamples"
        data-testid="btn-replay-speed"
        class="tabular-nums"
        severity="secondary"
        size="small"
        rounded
        :disabled="isReplaying"
        @click="toggleSpeed"
      >
        {{ replaySpeed }}×
      </PrimeButton>

      <PrimeButton
        v-if="hasSamples"
        data-testid="btn-clear-recording"
        severity="secondary"
        size="small"
        rounded
        icon="pi pi-trash"
        :label="t('generic.clear')"
        :disabled="isReplaying"
        @click="emit('clearRecording')"
      />

      <PrimeButton
        data-testid="btn-play-sequence"
        class="min-w-20"
        :severity="isPlayingSequence ? 'warn' : 'secondary'"
        size="small"
        rounded
        :disabled="isReplaying"
        :aria-label="isPlayingSequence ? undefined : t('generic.previewButton')"
        @click="emit('playSequence')"
      >
        <template v-if="isPlayingSequence">
          {{ t('generic.muteButton') }}
        </template>
        <NoteIcon v-else class="size-5" />
      </PrimeButton>
    </div>
  </div>
</template>

<style scoped lang="css"></style>
