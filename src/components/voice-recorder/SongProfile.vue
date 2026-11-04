<script setup lang="ts">
import { VOICE_RANGES } from '@/constants/voiceRanges'
import { midiToNoteLabel } from '@/utils/noteUtils'

import type { ProfileAxisKey, TakeProfile } from './takeProfile'

type Props = {
  profile: TakeProfile
}

const props = defineProps<Props>()

const { t, locale } = useI18n()

/* An octave: a singer can reach any one note from several voice types. */
const VOICE_TYPE_MIN_SPAN_SEMITONES = 12

/* Left- and right-hand words for each slider. */
const AXIS_LABELS: Record<ProfileAxisKey, [string, string]> = {
  tempo: ['slow', 'fast'],
  leaping: ['steady', 'leaping'],
  choppy: ['smooth', 'choppy'],
  rhythmic: ['free', 'rhythmic'],
  spoken: ['sung', 'spoken'],
  dramatic: ['even', 'dramatic'],
  colourful: ['familiar', 'colourful'],
}

const percentFormat = computed(
  () => new Intl.NumberFormat(locale.value, { style: 'percent' }),
)
const secondsFormat = computed(
  () =>
    new Intl.NumberFormat(locale.value, {
      style: 'unit',
      unit: 'second',
      unitDisplay: 'narrow',
      maximumFractionDigits: 1,
    }),
)

const axes = computed(() =>
  props.profile.axes.map((axis) => {
    const [low, high] = AXIS_LABELS[axis.key]

    return {
      key: axis.key,
      low: t(`voiceRecorder.profile.labels.${low}`),
      high: t(`voiceRecorder.profile.labels.${high}`),
      percent: axis.value * 100,
    }
  }),
)

const hasPitch = computed(() => props.profile.rangeHighMidi > 0)
const rangeLabel = computed(() => {
  const low = midiToNoteLabel(Math.round(props.profile.rangeLowMidi)).label
  const high = midiToNoteLabel(Math.round(props.profile.rangeHighMidi)).label

  return low === high ? low : `${low}–${high}`
})

/* The named voice whose range holds most of what was sung. A hint from one
 * recording, so ties go to the first listed rather than to any judgement, and a
 * few notes say nothing about a voice. */
const closestVoiceKey = computed(() => {
  const { rangeLowMidi, rangeHighMidi } = props.profile
  if (rangeHighMidi - rangeLowMidi < VOICE_TYPE_MIN_SPAN_SEMITONES) return null

  let bestKey: string | null = null
  let bestOverlap = 0

  for (const range of VOICE_RANGES) {
    if (range.group !== 'voiceTypes') continue

    const overlap =
      Math.min(rangeHighMidi, range.midiMax) -
      Math.max(rangeLowMidi, range.midiMin)
    if (overlap > bestOverlap) {
      bestOverlap = overlap
      bestKey = range.labelKey
    }
  }

  return bestKey
})
</script>

<template>
  <section class="flex flex-col gap-3" data-testid="song-profile">
    <h2 class="text-sm font-semibold">
      {{ t('voiceRecorder.profile.title') }}
    </h2>

    <p
      v-if="profile.words.length > 0"
      class="flex flex-wrap items-center gap-2"
      data-testid="song-profile-words"
    >
      <span class="text-sm text-(--p-text-muted-color)">
        {{ t('voiceRecorder.profile.sounds') }}
      </span>
      <PrimeTag
        v-for="word in profile.words"
        :key="word"
        :value="t(`voiceRecorder.profile.labels.${word}`)"
        severity="secondary"
      />
    </p>

    <ul class="flex flex-col gap-2">
      <li
        v-for="axis in axes"
        :key="axis.key"
        class="grid grid-cols-[5.5rem_1fr_5.5rem] items-center gap-2 text-xs max-xs:grid-cols-[4.5rem_1fr_4.5rem]"
        data-testid="song-profile-axis"
        :data-axis="axis.key"
        :data-value="Math.round(axis.percent)"
      >
        <span class="text-(--p-text-muted-color)">{{ axis.low }}</span>
        <span
          class="relative block h-1 rounded bg-(--p-content-border-color)"
          aria-hidden="true"
        >
          <span
            class="absolute top-1/2 size-3 -translate-y-1/2 rounded-full border-2 border-(--p-content-background) bg-(--p-primary-color) ltr:-translate-x-1/2 rtl:translate-x-1/2"
            :style="{ insetInlineStart: `${axis.percent}%` }"
          />
        </span>
        <span class="text-end text-(--p-text-muted-color)">{{
          axis.high
        }}</span>
      </li>
    </ul>

    <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
      <template v-if="hasPitch">
        <dt class="text-(--p-text-muted-color)">
          {{ t('voiceRecorder.profile.range') }}
        </dt>
        <dd data-testid="song-profile-range">
          <span dir="ltr">{{ rangeLabel }}</span>
          <template v-if="closestVoiceKey">
            ({{ t(closestVoiceKey) }})
          </template>
        </dd>
      </template>
      <template v-if="profile.medianPhraseMs > 0">
        <dt class="text-(--p-text-muted-color)">
          {{ t('voiceRecorder.profile.phrase') }}
        </dt>
        <dd>{{ secondsFormat.format(profile.medianPhraseMs / 1000) }}</dd>
      </template>
      <dt class="text-(--p-text-muted-color)">
        {{ t('voiceRecorder.profile.vibrato') }}
      </dt>
      <dd>{{ percentFormat.format(profile.vibratoShare) }}</dd>
    </dl>

    <p class="text-xs text-(--p-text-muted-color)">
      {{ t('voiceRecorder.profile.guess') }}
    </p>
  </section>
</template>
