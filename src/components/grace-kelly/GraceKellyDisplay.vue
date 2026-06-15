<script setup lang="ts">
import { frequencyToMidi, midiToNoteLabel } from '@/utils/noteUtils'
import { useLocalStorage } from '@vueuse/core'
import BarHighlightToggle from './BarHighlightToggle.vue'
import GraceKellySettingsRow from './GraceKellySettingsRow.vue'
import { VOZ_LABEL_KEYS } from './graceKellyConstants'
import {
  GRACE_KELLY_LYRIC_ABC,
  GRACE_KELLY_SYLLABLES,
} from './graceKellyLyrics'
import { VOZ_MELODIES } from './graceKellyMelodies'
import type { GraceKellyResult } from './useGraceKelly'
import { useStableSungLabel } from './useStableSungLabel'

type Props = {
  game: GraceKellyResult
  /* True only while the "Sing along" tab is active. PrimeTabs keeps every panel
   * mounted (not lazy), so the idle preview mic is gated on this to avoid
   * competing with the "Sing live" tab's mic on a hidden tab. */
  isActive: boolean
}

const props = defineProps<Props>()

const vozIndex = defineModel<number>('vozIndex', { required: true })
const startToneMidi = defineModel<number>('startToneMidi', { required: true })
const bpm = defineModel<number>('bpm', { required: true })
const isBarHighlightEnabled = defineModel<boolean>('isBarHighlightEnabled', {
  required: true,
})
const areToneLabelsShown = defineModel<boolean>('areToneLabelsShown', {
  required: true,
})

const { t } = useI18n()

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

/* True while a sequence is playing or paused — the part/tone/tempo selects stay
 * locked for both so the running timeline can't be changed underneath it. */
const isRunning = computed(() => isPlaying.value || isPaused.value)

const { isPreviewEnabled } = useSettings()

/* "See your voice" idle preview — listens only while this tab is active AND the
 * timeline is idle, so it never competes with playback here or with the "Sing
 * live" tab's mic on the (still-mounted) hidden panel. Toggling on requests mic
 * permission; if denied, useIdlePreview flips isPreviewEnabled back off and
 * micPermission disables the toggle. */
const {
  previewMidi,
  rawFrequency: previewFrequency,
  micPermission,
} = useIdlePreview({
  isGameActive: computed(() => isRunning.value || !props.isActive),
  isEnabled: isPreviewEnabled,
})

/* Continuous MIDI of the previewed pitch (raw, not rounded), for the pitch
 * line's vertical position; null when no clean pitch is detected. */
const sungMidi = computed(() => {
  if (previewMidi.value === null || previewFrequency.value === null) return null

  return frequencyToMidi(previewFrequency.value)
})

/* De-flickered note label riding the orange preview line; held 50ms before
 * showing to avoid strobe. */
const { stableSungLabel, stableSungCents } = useStableSungLabel({ sungMidi })

const sheetRef = ref<{
  scrollToSyllable: (index: number) => void
} | null>(null)

/* Lyric syllables are tappable only when idle or done — during playback the sheet
 * auto-scrolls to the active note, so a tap would fight it. */
function scrollSheetToSyllable(flatIndex: number) {
  sheetRef.value?.scrollToSyllable(flatIndex)
}

/* Sounding pitch of the note currently highlighted during playback (the start
 * tone transposes the melody, so the played pitch is startTone + offset). */
const currentToneLabel = computed(() => {
  if (activeNoteIndex.value === null) return null

  const note = VOZ_MELODIES[vozIndex.value].notes[activeNoteIndex.value]
  if (!note) return null

  return midiToNoteLabel(startToneMidi.value + note.midiOffset).label
})

/* Flat reading-order index of the syllable currently being sung — the last
 * syllable whose starting tone has been reached. Held/tied tones keep the
 * previous syllable lit (the final "like" sustains over tones 32–33). -1 when
 * idle, so all syllables render in the default color. */
const activeSyllableIndex = computed(() => {
  if (activeNoteIndex.value === null) return -1

  let active = -1
  for (let index = 0; index < GRACE_KELLY_SYLLABLES.length; index++) {
    if (GRACE_KELLY_SYLLABLES[index].noteIndex <= activeNoteIndex.value) {
      active = index
    } else {
      break
    }
  }

  return active
})

const vozLabel = computed(() =>
  t(`graceKelly.vozLabels.${VOZ_LABEL_KEYS[vozIndex.value]}`),
)

/* All six part labels, ordered by VOZ_MELODIES index — titles for the overview. */
const allVozLabels = computed(() =>
  VOZ_LABEL_KEYS.map((key) => t(`graceKelly.vozLabels.${key}`)),
)

/* Toggles the all-parts overview below the lyrics; persists across reloads. */
const showAllParts = useLocalStorage('syng.graceKellyShowAllParts', false)
</script>

<template>
  <div
    class="flex flex-1 flex-col items-center gap-4 pb-4"
    data-testid="grace-kelly-display"
  >
    <GraceKellySettingsRow
      v-model:vozIndex="vozIndex"
      v-model:startToneMidi="startToneMidi"
      v-model:bpm="bpm"
      v-model:areToneLabelsShown="areToneLabelsShown"
      :isRunning="isRunning"
      :showToneLabelToggle="true"
    />

    <label class="flex items-center gap-2 text-sm sm:mb-4">
      <PrimeToggleSwitch v-model="showAllParts" />
      {{ t('graceKelly.showAllParts') }}
    </label>

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
        @click="start(startToneMidi, vozIndex, bpm)"
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
      <div class="mb-1 flex items-center justify-center gap-2">
        <p>{{ t('graceKelly.subtitle') }}:</p>
        <h2 class="text-lg font-semibold text-(--p-text-color)">
          {{ vozLabel }}
        </h2>
      </div>

      <GraceKellySingSheet
        ref="sheetRef"
        :melody="VOZ_MELODIES[vozIndex]"
        :vozLabel="vozLabel"
        :startToneMidi="startToneMidi"
        :bpm="bpm"
        :activeNoteIndex="activeNoteIndex"
        :isDone="isDone"
        :lyrics="GRACE_KELLY_LYRIC_ABC"
        :activeSyllableIndex="activeSyllableIndex"
        :currentToneLabel="currentToneLabel"
        :sungMidi="sungMidi"
        :sungToneLabel="stableSungLabel"
        :sungToneCents="stableSungCents"
        :showToneLabels="areToneLabelsShown"
        :showBarHighlight="isBarHighlightEnabled"
      />
    </div>

    <GraceKellyLyrics
      :activeSyllableIndex="activeSyllableIndex"
      :isInteractive="!isRunning"
      @syllableClick="scrollSheetToSyllable"
    />

    <GraceKellyAllSheets
      v-if="showAllParts"
      :activeNoteIndex="activeNoteIndex"
      :isDone="isDone"
      :activeSyllableIndex="activeSyllableIndex"
      :startToneMidi="startToneMidi"
      :vozLabels="allVozLabels"
      :showToneLabels="areToneLabelsShown"
    />
  </div>
</template>
