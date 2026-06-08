<script setup lang="ts">
import { midiToNoteLabel } from '@/utils/noteUtils'
import { useLocalStorage } from '@vueuse/core'
import GraceKellySettingsRow from './GraceKellySettingsRow.vue'
import { VOZ_LABEL_KEYS } from './graceKellyConstants'
import {
  GRACE_KELLY_LYRIC_ABC,
  GRACE_KELLY_LYRIC_LINES,
  GRACE_KELLY_SYLLABLES,
} from './graceKellyLyrics'
import { VOZ_MELODIES } from './graceKellyMelodies'
import type { GraceKellyResult } from './useGraceKelly'

type Props = {
  game: GraceKellyResult
}

const props = defineProps<Props>()

const vozIndex = defineModel<number>('vozIndex', { required: true })
const startToneMidi = defineModel<number>('startToneMidi', { required: true })
const bpm = defineModel<number>('bpm', { required: true })

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

/* Lyric lines with each syllable tagged with its flat reading-order index, so
 * the template can match against activeSyllableIndex without a running counter. */
const lyricLines = computed(() => {
  let flatIndex = 0

  return GRACE_KELLY_LYRIC_LINES.map((line) =>
    line.map((word) =>
      word.map((syllable) => ({ ...syllable, flatIndex: flatIndex++ })),
    ),
  )
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
      :isRunning="isRunning"
    />

    <label class="flex items-center gap-2 text-sm">
      <PrimeToggleSwitch v-model="showAllParts" />
      {{ t('graceKelly.showAllParts') }}
    </label>

    <div class="flex min-w-50 items-baseline gap-2">
      <PrimeButton
        v-if="isRunning"
        severity="danger"
        size="small"
        rounded
        class="min-w-24"
        @click="stop"
      >
        {{ t('generic.stop') }}
      </PrimeButton>

      <PrimeButton
        v-if="isPlaying"
        class="min-w-24"
        severity="warn"
        size="small"
        rounded
        @click="pause"
      >
        {{ t('generic.pause') }}
      </PrimeButton>
      <PrimeButton
        v-if="isPaused"
        class="min-w-24"
        severity="success"
        size="small"
        rounded
        @click="resume"
      >
        {{ t('generic.resume') }}
      </PrimeButton>
      <PrimeButton
        v-if="!isRunning"
        class="min-w-24"
        severity="success"
        size="small"
        rounded
        @click="start(startToneMidi, vozIndex, bpm)"
      >
        {{ t('generic.start') }}
      </PrimeButton>
    </div>

    <div class="flex min-h-8 flex-wrap items-center gap-2 md:gap-4">
      <div
        class="flex flex-col items-center gap-2 text-center text-(--p-text-muted-color)"
      >
        <p class="text-sm leading-none">
          {{ t('graceKelly.subtitle') }}
        </p>
      </div>
      <div class="min-w-12">
        <p
          v-if="currentToneLabel"
          class="text-2xl font-semibold text-(--p-primary-color) tabular-nums"
          data-testid="grace-kelly-current-tone"
        >
          {{ currentToneLabel }}
        </p>
      </div>
    </div>

    <GraceKellySheet
      :melody="VOZ_MELODIES[vozIndex]"
      :vozLabel="vozLabel"
      :startToneMidi="startToneMidi"
      :bpm="bpm"
      :activeNoteIndex="activeNoteIndex"
      :isDone="isDone"
      :lyrics="GRACE_KELLY_LYRIC_ABC"
      :activeSyllableIndex="activeSyllableIndex"
    />

    <div class="my-4">
      <p v-for="(line, lineIndex) in lyricLines" :key="lineIndex">
        <template v-for="(word, wordIndex) in line" :key="wordIndex">
          {{ wordIndex > 0 ? ' ' : '' }}
          <span
            v-for="syllable in word"
            :key="syllable.flatIndex"
            :class="{
              'text-(--p-green-600) dark:text-(--p-green-400)':
                syllable.flatIndex === activeSyllableIndex,
            }"
            >{{ syllable.text }}</span
          >
        </template>
      </p>
    </div>

    <GraceKellyAllSheets
      v-if="showAllParts"
      :activeNoteIndex="activeNoteIndex"
      :isDone="isDone"
      :activeSyllableIndex="activeSyllableIndex"
      :startToneMidi="startToneMidi"
      :vozLabels="allVozLabels"
    />
  </div>
</template>
