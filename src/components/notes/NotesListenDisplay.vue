<script setup lang="ts">
import { frequencyToMidi, midiToNoteLabel } from '@/utils/noteUtils'
import BarHighlightToggle from '@/components/grace-kelly/BarHighlightToggle.vue'
import { useStableSungLabel } from '@/components/grace-kelly/useStableSungLabel'
import NotesSettingsRow from './NotesSettingsRow.vue'
import NotesSheet from './NotesSheet.vue'
import { NOTE_SCALES } from './notesScales'
import type { NotesPlaybackResult } from './useNotesPlayback'

type Props = {
  game: NotesPlaybackResult
  /* True only while the "Listen" tab is active. PrimeTabs keeps every panel
   * mounted, so the idle preview mic is gated on this to avoid competing with
   * the "Sing live" tab's mic on a hidden tab. */
  isActive: boolean
}

const props = defineProps<Props>()

const clefIndex = defineModel<number>('clefIndex', { required: true })
const bpm = defineModel<number>('bpm', { required: true })
const isBarHighlightEnabled = defineModel<boolean>('isBarHighlightEnabled', {
  required: true,
})
const areToneLabelsShown = defineModel<boolean>('areToneLabelsShown', {
  required: true,
})

const { t } = useI18n()

const scale = computed(() => NOTE_SCALES[clefIndex.value])

const {
  isPlaying,
  isPaused,
  isDone,
  activeNoteIndex,
  start,
  pause,
  resume,
  stop,
} = props.game

/* True while a sequence is playing or paused — the selects stay locked for both
 * so the running timeline can't be changed underneath it. */
const isRunning = computed(() => isPlaying.value || isPaused.value)

const { isPreviewEnabled } = useSettings()

/* "See your voice" idle preview — listens only while this tab is active AND the
 * timeline is idle, so it never competes with playback here or with the "Sing
 * live" tab's mic on the (still-mounted) hidden panel. */
const {
  previewMidi,
  rawFrequency: previewFrequency,
  micPermission,
} = useIdlePreview({
  isGameActive: computed(() => isRunning.value || !props.isActive),
  isEnabled: isPreviewEnabled,
})

/* Continuous MIDI of the previewed pitch (raw, not rounded), for the pitch line's
 * vertical position; null when no clean pitch is detected. */
const sungMidi = computed(() => {
  if (previewMidi.value === null || previewFrequency.value === null) return null

  return frequencyToMidi(previewFrequency.value)
})

const { stableSungLabel, stableSungCents } = useStableSungLabel({ sungMidi })

/* Sounding pitch of the note currently highlighted during playback. */
const currentToneLabel = computed(() => {
  if (activeNoteIndex.value === null) return null

  const midi = scale.value.midis[activeNoteIndex.value]
  if (midi === undefined) return null

  return midiToNoteLabel(midi).label
})
</script>

<template>
  <div
    class="flex flex-1 flex-col items-center gap-4 pb-4"
    data-testid="notes-listen-display"
  >
    <NotesSettingsRow
      v-model:clefIndex="clefIndex"
      v-model:bpm="bpm"
      v-model:areToneLabelsShown="areToneLabelsShown"
      :isRunning="isRunning"
    />

    <div class="flex min-w-50 items-baseline gap-2">
      <PrimeButton
        v-if="isRunning"
        severity="danger"
        size="small"
        rounded
        class="min-w-20"
        @click="stop"
      >
        {{ t('generic.stop') }}
      </PrimeButton>

      <PrimeButton
        v-if="isPlaying"
        class="min-w-20"
        severity="warn"
        size="small"
        rounded
        @click="pause"
      >
        {{ t('generic.pause') }}
      </PrimeButton>
      <PrimeButton
        v-if="isPaused"
        class="min-w-20"
        severity="success"
        size="small"
        rounded
        @click="resume"
      >
        {{ t('generic.resume') }}
      </PrimeButton>
      <PrimeButton
        v-if="!isRunning"
        class="min-w-20"
        severity="success"
        size="small"
        rounded
        @click="start(scale.midis, bpm)"
      >
        {{ t('generic.start') }}
      </PrimeButton>

      <PreviewToggle
        v-model="isPreviewEnabled"
        :disabled="micPermission === 'denied' || isRunning"
      />

      <BarHighlightToggle v-model="isBarHighlightEnabled" />
    </div>

    <div class="w-full max-w-full">
      <NotesSheet
        :midis="scale.midis"
        :clef="scale.clef"
        :bpm="bpm"
        :activeNoteIndex="activeNoteIndex"
        :isDone="isDone"
        :currentToneLabel="currentToneLabel"
        :sungMidi="sungMidi"
        :sungToneLabel="stableSungLabel"
        :sungToneCents="stableSungCents"
        :showToneLabels="areToneLabelsShown"
        :showBarHighlight="isBarHighlightEnabled"
      />
    </div>
  </div>
</template>
