<script setup lang="ts">
import { NOTE_NAMES } from '@/utils/noteUtils'
import { useLocalStorage } from '@vueuse/core'
import {
  ALLOWED_BPMS,
  START_TONE_MIDI_MAX,
  START_TONE_MIDI_MIN,
} from './graceKellyConstants'
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

const { setToneMode, warmUp } = useTonePlayer()
const { toneMode: storedToneMode } = storeToRefs(useToneModeStore())
const toneMode = computed({
  get: () => storedToneMode.value,
  set: (mode) => {
    storedToneMode.value = mode
    setToneMode(mode)
    void warmUp().catch((error) =>
      debugLog('[GraceKelly] warmUp on tone-mode change failed', error),
    )
  },
})
setToneMode(storedToneMode.value)

const { isPlaying, isDone, activeNoteIndex, start, stop } = props.game

/* MIDI note → display label, e.g. 48 → "C3". */
function midiToToneLabel(midi: number): string {
  const noteIndex = ((midi % 12) + 12) % 12
  const octave = Math.floor(midi / 12) - 1

  return `${NOTE_NAMES[noteIndex]}${octave}`
}

/* Start-tone options, descending (high → low), built from the shared range.
 * Generated locally because the shared START_TONE_OPTIONS bottoms out at G2. */
const startToneOptions = Array.from(
  { length: START_TONE_MIDI_MAX - START_TONE_MIDI_MIN + 1 },
  (_, index) => {
    const midiNote = START_TONE_MIDI_MAX - index

    return { label: midiToToneLabel(midiNote), midiNote }
  },
)

/* Sounding pitch of the note currently highlighted during playback (the start
 * tone transposes the melody, so the played pitch is startTone + offset). */
const currentToneLabel = computed(() => {
  if (activeNoteIndex.value === null) return null

  const note = VOZ_MELODIES[vozIndex.value].notes[activeNoteIndex.value]
  if (!note) return null

  return midiToToneLabel(startToneMidi.value + note.midiOffset)
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

/* Descriptive part labels, ordered by VOZ_MELODIES index. "MIKA" is the artist
 * name (Grace Kelly is a MIKA song) and stays untranslated. */
const VOZ_LABEL_KEYS = [
  'lead',
  'reallyHigh',
  'high',
  'oneTone',
  'lessLow',
  'low',
] as const

const vozOptions = computed(() =>
  VOZ_LABEL_KEYS.map((key, index) => ({
    label: t(`graceKelly.vozLabels.${key}`),
    value: index,
  })),
)

const vozLabel = computed(() =>
  t(`graceKelly.vozLabels.${VOZ_LABEL_KEYS[vozIndex.value]}`),
)

/* All six part labels, ordered by VOZ_MELODIES index — titles for the overview. */
const allVozLabels = computed(() =>
  VOZ_LABEL_KEYS.map((key) => t(`graceKelly.vozLabels.${key}`)),
)

/* Toggles the all-parts overview below the lyrics; persists across reloads. */
const showAllParts = useLocalStorage('syng.graceKellyShowAllParts', false)

const bpmOptions = ALLOWED_BPMS.sort((a, b) => b - a).map((value) => ({
  label: `${value} BPM`,
  value,
}))

function handleToggle() {
  if (isPlaying.value) {
    stop()
  } else if (isDone.value) {
    start(startToneMidi.value, vozIndex.value, bpm.value)
  } else {
    start(startToneMidi.value, vozIndex.value, bpm.value)
  }
}
</script>

<template>
  <div
    class="flex flex-1 flex-col items-center gap-4"
    data-testid="grace-kelly-display"
  >
    <div
      class="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-2 sm:gap-4"
    >
      <PrimeSelect
        v-model="vozIndex"
        :options="vozOptions"
        optionLabel="label"
        optionValue="value"
        size="small"
        :disabled="isPlaying"
        class="flex-1"
        scrollHeight="370px"
      >
        <template #header>
          <div
            class="px-3 py-2 text-xs font-medium text-(--p-text-muted-color)"
          >
            {{ t('graceKelly.voz') }}
          </div>
        </template>
      </PrimeSelect>

      <PrimeSelect
        v-model="startToneMidi"
        :options="startToneOptions"
        optionLabel="label"
        optionValue="midiNote"
        size="small"
        :disabled="isPlaying"
        class="flex-1"
      >
        <template #header>
          <div
            class="px-3 py-2 text-xs font-medium text-(--p-text-muted-color)"
          >
            {{ t('graceKelly.startTone') }}
          </div>
        </template>
      </PrimeSelect>

      <PrimeSelect
        v-model="bpm"
        :options="bpmOptions"
        optionLabel="label"
        optionValue="value"
        size="small"
        :disabled="isPlaying"
        class="flex-1"
      >
        <template #header>
          <div
            class="px-3 py-2 text-xs font-medium text-(--p-text-muted-color)"
          >
            {{ t('graceKelly.tempo') }}
          </div>
        </template>
      </PrimeSelect>

      <ToneModeSelect v-model="toneMode" class="min-w-30 flex-1" />

      <label class="flex items-center gap-2 text-sm">
        <PrimeToggleSwitch v-model="showAllParts" />
        {{ t('graceKelly.showAllParts') }}
      </label>

      <PrimeButton
        class="ms-auto min-w-24"
        :severity="isPlaying ? 'danger' : 'success'"
        size="small"
        rounded
        @click="handleToggle"
      >
        {{ isPlaying ? t('generic.stop') : t('generic.start') }}
      </PrimeButton>
    </div>

    <p>Music by Mika</p>
    <div class="flex min-h-8 flex-wrap items-center gap-4">
      <div
        class="flex flex-col items-center gap-2 text-center text-(--p-text-muted-color)"
      >
        <p class="text-sm leading-none">
          {{ t('graceKelly.subtitle') }}
        </p>
      </div>
      <div class="min-w-11">
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
      :lyrics="GRACE_KELLY_LYRIC_ABC"
      :activeSyllableIndex="activeSyllableIndex"
    />

    <div>
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
      :activeSyllableIndex="activeSyllableIndex"
      :startToneMidi="startToneMidi"
      :vozLabels="allVozLabels"
    />
  </div>
</template>
