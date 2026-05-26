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
    <div class="flex items-stretch gap-4">
      <button
        data-testid="btn-play-sequence"
        class="grid place-items-center rounded-xl border border-(--p-content-border-color) px-6 py-2 font-bold tracking-tight transition-transform hover:scale-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
        :disabled="isReplaying"
        @click="emit('playSequence')"
      >
        <span
          aria-hidden="true"
          class="invisible text-8xl leading-none [grid-area:1/1]"
          >♪</span
        >
        <span
          class="[grid-area:1/1]"
          :class="
            isPlayingSequence
              ? 'text-base text-(--p-orange-400)'
              : 'text-8xl leading-none text-(--p-surface-500)'
          "
        >
          {{ isPlayingSequence ? t('generic.muteButton') : '♪' }}
        </span>
      </button>

      <button
        v-if="hasSamples"
        data-testid="btn-replay-sound"
        class="flex flex-col items-center justify-center rounded-xl border border-(--p-content-border-color) px-4 py-2 text-sm font-medium text-(--p-text-muted-color) transition-transform hover:scale-105 hover:text-(--p-text-color) active:scale-95"
        :class="[
          isReplaying
            ? 'border-(--p-button-success-background) text-(--p-button-success-background)'
            : '',
        ]"
        @click="emit('toggleReplay')"
      >
        <span class="mt-1 block text-xs whitespace-pre-line">{{
          t('pitchDetector.replaySound')
        }}</span>
      </button>

      <button
        v-if="hasSamples"
        data-testid="btn-replay-speed"
        class="flex min-w-[4rem] flex-col items-center justify-center rounded-xl border border-(--p-content-border-color) px-3 py-2 text-sm font-medium text-(--p-text-muted-color) transition-transform hover:scale-105 hover:text-(--p-text-color) active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 disabled:hover:text-(--p-text-muted-color)"
        type="button"
        :disabled="isReplaying"
        @click="toggleSpeed"
      >
        <span class="block text-xs font-semibold tabular-nums">
          {{ replaySpeed }}×
        </span>
      </button>

      <button
        v-if="hasSamples"
        data-testid="btn-clear-recording"
        class="flex min-w-[4rem] flex-col items-center justify-center rounded-xl border border-(--p-content-border-color) px-3 py-2 text-sm font-medium text-(--p-text-muted-color) transition-transform hover:scale-105 hover:text-(--p-text-color) active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 disabled:hover:text-(--p-text-muted-color)"
        type="button"
        :disabled="isReplaying"
        @click="emit('clearRecording')"
      >
        <span class="block text-xs whitespace-pre-line">
          {{ t('generic.clear') }}
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped lang="css"></style>
