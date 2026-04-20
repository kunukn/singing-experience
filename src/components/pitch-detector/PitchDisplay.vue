<script setup lang="ts">
import { useDoReMiPlaySequence } from '@/components/do-re-mi/useDoReMiPlaySequence'
import type { NoteInfo } from '@/utils/noteUtils'
import { midiRangeToScaleNotes, NOTE_NAMES } from '@/utils/noteUtils'
import { cleanTextColor } from '@/utils/pitchColors'
import PitchHistoryChart from './PitchHistoryChart.vue'

type Props = {
  noteInfo: NoteInfo | null
  frequency: number | null
  clarity: number
  isClean: boolean
  isListening: boolean
  midiMin?: number
  midiMax?: number
}

const props = withDefaults(defineProps<Props>(), {
  midiMin: 36,
  midiMax: 96,
})

const { t } = useI18n()

const { isPlayingSequence, currentPlayingIndex, playSequence, stopSequence } =
  useDoReMiPlaySequence()

const rangeNotes = computed(() =>
  midiRangeToScaleNotes(props.midiMin, props.midiMax),
)

const highlightedMidi = computed(() => {
  const idx = currentPlayingIndex.value
  if (idx < 0 || idx >= rangeNotes.value.length) return null

  const n = rangeNotes.value[idx]
  const noteIndex = NOTE_NAMES.indexOf(n.note)

  return (n.octave + 1) * 12 + noteIndex
})

function toggleSequence() {
  if (isPlayingSequence.value) {
    stopSequence()
  } else {
    playSequence(rangeNotes.value)
  }
}

const noteColor = computed(() =>
  props.noteInfo && props.isClean ? cleanTextColor(props.noteInfo.cents) : null,
)

const centsColor = computed(() =>
  props.noteInfo && props.isClean ? cleanTextColor(props.noteInfo.cents) : null,
)

defineExpose({ stopSequence })
</script>

<template>
  <div class="flex w-full flex-1 flex-col gap-4">
    <div class="grid w-full items-center justify-center">
      <div
        class="flex w-full items-center justify-around gap-4 [grid-area:1/1]"
        :class="
          isListening || (noteInfo && isClean)
            ? 'visible'
            : 'pointer-events-none invisible'
        "
      >
        <CentsDeviationBar
          :cents="noteInfo && isClean ? noteInfo.cents : null"
          :threshold="10"
          :maxRange="50"
          :isVisible="isListening"
          :highLabel="t('pitchDetector.sharp')"
          :lowLabel="t('pitchDetector.flat')"
        />

        <div class="flex min-w-40 flex-col items-start justify-center">
          <div
            v-if="noteInfo && isClean"
            class="transition-colors duration-150"
            :style="{ color: noteColor ?? undefined }"
          >
            <span class="text-7xl font-bold tracking-tight md:text-8xl">
              {{ noteInfo.note }}
            </span>
            <span class="mt-2 inline-block align-top text-4xl font-light">
              {{ noteInfo.octave }}
            </span>
          </div>
          <div v-else class="text-gray-500">
            <p class="text-sm">
              {{ t('pitchDetector.listening') }}
            </p>
          </div>

          <div
            v-if="noteInfo && isClean"
            class="mt-1 flex items-center gap-1 text-xs tabular-nums"
            :style="{ color: centsColor ?? undefined }"
          >
            <span>{{ t('pitchDetector.cents') }}</span>
            <span class="min-w-6 text-end tabular-nums">
              {{ noteInfo.cents > 0 ? '+' : '' }}{{ noteInfo.cents }}
            </span>
          </div>
        </div>

        <div
          v-show="isListening"
          class="grid grid-cols-[auto_auto] items-center gap-x-1 text-gray-400 tabular-nums"
        >
          <span class="min-w-12 text-end tabular-nums">{{
            frequency != null ? Math.round(frequency) : '-'
          }}</span>
          <span class="text-gray-600">{{ t('pitchDetector.hz') }}</span>

          <span class="text-end tabular-nums"
            >{{ Math.round(clarity * 100) }}%</span
          >
          <span class="text-gray-600">{{ t('pitchDetector.clarity') }}</span>
        </div>
      </div>

      <div
        :class="[
          !isListening && !(noteInfo && isClean)
            ? 'visible'
            : 'pointer-events-none invisible',
        ]"
        class="grid place-items-center [grid-area:1/1]"
      >
        <button
          data-testid="btn-play-sequence"
          class="rounded-xl border border-gray-600 px-4 py-2 text-8xl font-bold tracking-tight text-gray-600 transition-transform [grid-area:1/1] hover:scale-110 active:scale-95"
          :class="[isPlayingSequence ? 'text-yellow-400' : '']"
          @click="toggleSequence"
        >
          ♪
        </button>
      </div>
    </div>

    <!-- Pitch history chart -->
    <PitchHistoryChart
      :noteInfo="noteInfo"
      :isListening="isListening"
      :isClean="isClean"
      :midiMin="props.midiMin"
      :midiMax="props.midiMax"
      :highlightedMidi="highlightedMidi"
    />
  </div>
</template>

<style scoped></style>
