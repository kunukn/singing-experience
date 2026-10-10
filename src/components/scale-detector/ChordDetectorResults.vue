<script setup lang="ts">
import {
  chordAccidentalStyle,
  chordSymbol,
  MIN_CHORD_PITCH_CLASSES,
  type ChordCandidate,
  type ChordDetection,
} from '@/utils/chordDetection'
import { pitchClassLabel } from '@/utils/scaleDetection'
import type { ChordSelection } from './useScaleDetector'

type Props = {
  result: ChordDetection
  selected: ChordSelection | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  select: [candidate: ChordSelection]
}>()

const { t } = useI18n()

/* Same cap as the scale results: three families covers the realistic
 * answers; the rest are long shots that would bury them. */
const MAX_FAMILIES_SHOWN = 3

const families = computed(() =>
  props.result.families.slice(0, MAX_FAMILIES_SHOWN).map((family) => {
    const [home, ...twins] = family.candidates
    const style = chordAccidentalStyle(home.root, home.type)

    return {
      key: `${home.root}:${home.type}`,
      home,
      twins,
      missingLabels: family.missingPitchClasses
        .map((pitchClass) => pitchClassLabel(pitchClass, style))
        .join(' '),
    }
  }),
)

const symbolOf = (candidate: ChordCandidate) =>
  chordSymbol(candidate.root, candidate.type, props.result.bass)

function isSelected(candidate: ChordCandidate): boolean {
  return (
    props.selected?.root === candidate.root &&
    props.selected?.type === candidate.type
  )
}

const hasNotes = computed(() => props.result.sungPitchClasses.size > 0)
</script>

<template>
  <div class="flex w-full flex-col gap-3" data-testid="chord-detector-results">
    <p
      v-if="hasNotes && !result.hasEnoughNotes"
      class="text-center text-sm text-(--p-text-muted-color)"
      data-testid="chord-detector-keep-playing"
    >
      {{
        t('scaleDetector.chords.keepGoing', { count: MIN_CHORD_PITCH_CLASSES })
      }}
    </p>

    <p
      v-if="hasNotes && result.families.length === 0"
      class="text-center text-sm text-(--p-orange-400)"
      data-testid="chord-detector-no-match"
    >
      {{ t('scaleDetector.chords.noMatch') }}
    </p>

    <ol
      v-if="families.length > 0"
      class="flex w-full flex-col gap-3"
      :class="{ 'opacity-60': !result.hasEnoughNotes }"
    >
      <li
        v-for="family in families"
        :key="family.key"
        class="flex flex-col gap-2 rounded-lg border border-(--p-content-border-color) bg-(--p-content-background) p-3"
        data-testid="chord-detector-family"
      >
        <div class="flex flex-wrap items-center gap-2">
          <PrimeButton
            :label="symbolOf(family.home)"
            :severity="isSelected(family.home) ? undefined : 'secondary'"
            :outlined="!isSelected(family.home)"
            class="text-lg font-semibold"
            :data-selected="isSelected(family.home) || undefined"
            data-testid="chord-detector-home"
            @click="emit('select', family.home)"
          />
          <span class="text-sm text-(--p-text-muted-color)">
            {{ t(`scaleDetector.chords.quality.${family.home.type}`) }}
          </span>
        </div>

        <div
          v-if="family.twins.length > 0"
          class="flex flex-wrap items-center gap-1 text-sm"
        >
          <span class="text-(--p-text-muted-color)">
            {{ t('scaleDetector.sameNotes') }}
          </span>
          <PrimeButton
            v-for="twin in family.twins"
            :key="`${twin.root}:${twin.type}`"
            :label="symbolOf(twin)"
            size="small"
            :severity="isSelected(twin) ? undefined : 'secondary'"
            :text="!isSelected(twin)"
            :data-selected="isSelected(twin) || undefined"
            data-testid="chord-detector-twin"
            @click="emit('select', twin)"
          />
        </div>

        <p
          v-if="family.missingLabels"
          class="text-xs text-(--p-text-muted-color)"
          data-testid="chord-detector-missing"
        >
          {{ t('scaleDetector.notSungYet', { notes: family.missingLabels }) }}
        </p>
      </li>
    </ol>
  </div>
</template>
